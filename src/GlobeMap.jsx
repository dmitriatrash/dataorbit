import { useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import maplibregl from 'maplibre-gl'
import { HEATMAP_COLOR_EXPR, HEATMAP_WEIGHT_EXPR } from './heatmapColors'
import { BASEMAPS, boundaryOutlineColor, naStateLineColor } from './basemaps'
import {
  NA_ADMIN1_SOURCE_ID,
  NA_STATE_LAYER_ID,
  NATURAL_EARTH_ADMIN1_GEOJSON,
  NA_ADMIN1_FILTER,
} from './naStateBoundaries'

const SOURCE_ID = 'nc-data'
const LAYER_ID  = 'nc-heatmap'
const BASEMAP_SOURCE_ID = 'basemap'

const EMPTY_FC = { type:'FeatureCollection', features:[] }

/** Matches initial map camera; used by reset control. */
export const DEFAULT_MAP_VIEW = {
  center: [-95, 52],
  zoom: 2.6,
  bearing: 0,
  pitch: 0,
}

export default function GlobeMap({
  geojson,
  radius,
  intensity,
  opacity,
  boundaryOpacity,
  basemap = 'dark',
  viewMode = 'globe',
  showNaStateBorders = false,
  resetSignal = 0,
}) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const loadedRef    = useRef(false)
  const paintRef = useRef({ radius, intensity, opacity, boundaryOpacity, basemap })
  const viewRef = useRef({ basemap, viewMode })
  useLayoutEffect(() => {
    paintRef.current = { radius, intensity, opacity, boundaryOpacity, basemap }
    viewRef.current = { basemap, viewMode }
  }, [radius, intensity, opacity, boundaryOpacity, basemap, viewMode])

  const applyHeatAndBoundary = useCallback((map) => {
    const p = paintRef.current
    const op = p.boundaryOpacity / 100
    const outline = boundaryOutlineColor(p.basemap, op)
    map.setPaintProperty(LAYER_ID, 'heatmap-radius',    p.radius)
    map.setPaintProperty(LAYER_ID, 'heatmap-intensity', p.intensity)
    map.setPaintProperty(LAYER_ID, 'heatmap-opacity',   p.opacity / 100)
    map.setPaintProperty('country-border', 'fill-outline-color', outline)
  }, [])

  const applyBasemap = useCallback((map, basemapId) => {
    const cfg = BASEMAPS[basemapId]
    const src = map.getSource(BASEMAP_SOURCE_ID)
    if (src && typeof src.setTiles === 'function') {
      src.setTiles(cfg.tiles)
    }
    if (map.getLayer('bg')) {
      map.setPaintProperty('bg', 'background-color', cfg.background)
    }
  }, [])

  const applyProjection = useCallback((map, mode) => {
    const globe = mode === 'globe'
    map.setProjection(globe ? { type: 'globe' } : { type: 'mercator' })
    if (!globe) {
      map.easeTo({ pitch: 0, duration: 500, essential: true })
    }
  }, [])

  // ── Init map once (first-render basemap / viewMode only for style snapshot) ─
  useEffect(() => {
    if (mapRef.current) return

    const initialBasemap = viewRef.current.basemap
    const initialViewMode = viewRef.current.viewMode
    const initial = BASEMAPS[initialBasemap] ?? BASEMAPS.dark

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          [BASEMAP_SOURCE_ID]: {
            type: 'raster',
            tiles: initial.tiles,
            tileSize: 256,
            attribution: initial.attribution,
          },
          admin: {
            type: 'vector',
            url: 'https://demotiles.maplibre.org/tiles/tiles.json',
          },
          [SOURCE_ID]: {
            type: 'geojson',
            data: EMPTY_FC,
          },
          [NA_ADMIN1_SOURCE_ID]: {
            type: 'geojson',
            data: NATURAL_EARTH_ADMIN1_GEOJSON,
          },
        },
        layers: [
          { id:'bg', type:'background', paint:{ 'background-color': initial.background } },
          { id:'base', type:'raster', source: BASEMAP_SOURCE_ID, paint:{ 'raster-opacity':1 } },

          {
            id: LAYER_ID,
            type: 'heatmap',
            source: SOURCE_ID,
            maxzoom: 12,
            paint: {
              'heatmap-weight':     HEATMAP_WEIGHT_EXPR,
              'heatmap-intensity':  intensity,
              'heatmap-radius':     radius,
              'heatmap-opacity':    opacity / 100,
              'heatmap-color':      HEATMAP_COLOR_EXPR,
            },
          },

          {
            id: 'country-border',
            type: 'fill',
            source: 'admin',
            'source-layer': 'countries',
            paint: {
              'fill-color': 'rgba(0,0,0,0)',
              'fill-outline-color': boundaryOutlineColor(initialBasemap, boundaryOpacity / 100),
              'fill-antialias': true,
            },
          },

          {
            id: NA_STATE_LAYER_ID,
            type: 'line',
            source: NA_ADMIN1_SOURCE_ID,
            filter: NA_ADMIN1_FILTER,
            layout: {
              visibility: showNaStateBorders ? 'visible' : 'none',
            },
            paint: {
              'line-color': naStateLineColor(initialBasemap),
              'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 4, 0.85, 8, 1.5],
              'line-opacity': 0.92,
              'line-dasharray': [1.2, 0.8],
            },
          },
        ],
      },
      center: DEFAULT_MAP_VIEW.center,
      zoom: DEFAULT_MAP_VIEW.zoom,
      projection: initialViewMode === 'globe' ? 'globe' : 'mercator',
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch:true }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact:true }),       'bottom-right')

    map.on('load', () => {
      loadedRef.current = true
      applyBasemap(map, viewRef.current.basemap)
      applyProjection(map, viewRef.current.viewMode)
      applyHeatAndBoundary(map)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; loadedRef.current = false }
    // Single map instance; heatmap defaults are refreshed by applyHeatAndBoundary effect.
  }, [applyHeatAndBoundary, applyBasemap, applyProjection]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update GeoJSON data when it changes ────────────────────────────────────
  const updateData = useCallback(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const src = map.getSource(SOURCE_ID)
    if (src) src.setData(geojson || EMPTY_FC)
  }, [geojson])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (loadedRef.current) {
      updateData()
    } else {
      map.once('load', updateData)
    }
  }, [updateData])

  // ── Basemap tiles + background ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    applyBasemap(map, basemap)
  }, [basemap, applyBasemap])

  // ── 2D / 3D projection ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    applyProjection(map, viewMode)
  }, [viewMode, applyProjection])

  // ── Heatmap + boundary paint ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    applyHeatAndBoundary(map)
  }, [radius, intensity, opacity, boundaryOpacity, basemap, applyHeatAndBoundary])

  // ── N. America state/province lines (all basemaps, opt-in) ─────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current || !map.getLayer(NA_STATE_LAYER_ID)) return
    map.setLayoutProperty(NA_STATE_LAYER_ID, 'visibility', showNaStateBorders ? 'visible' : 'none')
    map.setPaintProperty(NA_STATE_LAYER_ID, 'line-color', naStateLineColor(basemap))
  }, [basemap, showNaStateBorders])

  // ── Reset camera to default (triggered from UI) ───────────────────────────
  useEffect(() => {
    if (resetSignal === 0) return
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const m = mapRef.current
      if (!m || !loadedRef.current) return
      m.easeTo({
        ...DEFAULT_MAP_VIEW,
        duration: 750,
        essential: true,
      })
    }
    if (loadedRef.current) apply()
    else map.once('load', apply)
  }, [resetSignal])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ width:'100%', height:'100%' }}
    />
  )
}
