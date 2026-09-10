/** Raster XYZ basemaps; vector country borders stay on top as a separate layer. */

export const BASEMAP_IDS = /** @type {const} */ (['dark', 'satellite', 'topo'])

/** @typedef {'dark' | 'satellite' | 'topo'} BasemapId */

/** @type {Record<BasemapId, { label: string; tiles: string[]; background: string; attribution: string }>} */
export const BASEMAPS = {
  dark: {
    label: 'Dark',
    background: '#232227',
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    ],
  },
  satellite: {
    label: 'Satellite',
    background: '#0c1220',
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
  },
  topo: {
    label: 'Topographic',
    background: '#e8dfd0',
    attribution: '© OpenStreetMap contributors · © OpenTopoMap',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
  },
}

/** Light basemaps need a darker outline for country borders. */
export function boundaryOutlineColor(basemap, opacity01) {
  if (basemap === 'topo') return `rgba(30,41,59,${opacity01})`
  return `rgba(255,255,255,${opacity01})`
}

/** NA admin-1 state/province lines: contrast on dark imagery vs light topo. */
export function naStateLineColor(basemap) {
  if (basemap === 'topo') return 'rgba(30, 41, 59, 0.88)'
  return 'rgba(255, 240, 200, 0.92)'
}
