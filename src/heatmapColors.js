/** Matches `DEFAULT_CONTROLS.radius` in App — scales the zoom curve below. */
export const HEATMAP_RADIUS_SLIDER_DEFAULT = 18

/** Piecewise-linear curve for minimum blur (px) vs zoom — avoids dot-grid at low slider values. */
const FLOOR_ZOOM_STOPS = /** @type {const} */ ([
  [1, 9],
  [2, 9],
  [4, 10],
  [6, 11],
  [8, 12],
  [10, 14],
  [12, 16],
  [14, 18],
])

/** Baseline blur curve (px) at slider = {@link HEATMAP_RADIUS_SLIDER_DEFAULT}. */
const BASE_ZOOM_STOPS = /** @type {const} */ ([
  [1, 26],
  [2, 21],
  [3, 19],
  [4, 18],
  [5, 17],
  [6, 16],
  [7, 15],
  [8, 14],
  [9, 13],
  [10, 12],
  [11, 11],
  [12, 10],
])

function linearInterpZ(z, stops) {
  if (z <= stops[0][0]) return stops[0][1]
  if (z >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [za, va] = stops[i]
    const [zb, vb] = stops[i + 1]
    if (z >= za && z <= zb) {
      if (zb === za) return va
      return va + ((z - za) / (zb - za)) * (vb - va)
    }
  }
  return stops[stops.length - 1][1]
}

/**
 * MapLibre heatmap blur is in pixels. Grid NetCDF points sit on a fixed lat/lon lattice; if the
 * radius is smaller than on-screen spacing between neighbors, kernels do not overlap and you see
 * a polka-dot grid. This keeps a zoom-dependent floor while scaling the slider around
 * {@link HEATMAP_RADIUS_SLIDER_DEFAULT}. `detailBoost` lowers the floor at higher zooms while
 * keeping a minimum blur to avoid banding/circle artifacts.
 *
 * Implemented as a single `['interpolate',['linear'],['zoom'],…]` (no nested `max`/`*`).
 * Compound expressions for `heatmap-radius` can fail or blank the map under **globe** projection
 * in MapLibre GL JS 5.x.
 */
/**
 * @param {{ noSmoothing?: boolean }} [opts]
 */
export function getHeatmapRadiusAtZoom(userRadius, detailBoost, zoom, opts) {
  if (opts?.noSmoothing) {
    const r = Math.max(1, userRadius)
    return Math.round(r * 1000) / 1000
  }
  const scale = userRadius / HEATMAP_RADIUS_SLIDER_DEFAULT
  const detail = Math.min(1, Math.max(0, detailBoost))
  const z = Math.min(14, Math.max(1, zoom))
  // Detail boost must apply at all zooms (previous (z-4)/8 made it a no-op below ~zoom 4).
  const zoomT = Math.min(1, Math.max(0, (z - 1) / 12))
  const floorScale = 1 - detail * (0.45 + 0.35 * zoomT)
  const baseScale = 1 - detail * (0.3 + 0.25 * zoomT)
  const floorBase = linearInterpZ(z, FLOOR_ZOOM_STOPS)
  const base = linearInterpZ(z, BASE_ZOOM_STOPS)
  const minFloor = Math.max(3, (6 + (1 - zoomT) * 2) * (1 - detail * 0.65))
  const floor = Math.max(minFloor, floorBase * floorScale)
  const v = Math.max(floor, scale * base * baseScale)
  return Math.round(v * 1000) / 1000
}

export function buildHeatmapRadiusExpression(userRadius, detailBoost = 0, opts) {
  /** @type {unknown[]} */
  const expr = ['interpolate', ['linear'], ['zoom']]
  for (let z = 1; z <= 14; z++) {
    expr.push(z, getHeatmapRadiusAtZoom(userRadius, detailBoost, z, opts))
  }
  return expr
}

export const TICK_VALUES = [0, 100, 200, 300, 400, 500]

export const TICK_COLORS = [
  '#e7e7e7','#d0e1f1','#95c4e0','#4a98c9','#1764aa',
  '#108447','#53b560','#fff6b1','#fcaa60','#f78440',
  '#ed5e3c','#c21c26','#a50126','#9900f9',
]

export const HEATMAP_COLOR_EXPR = [
  'interpolate',['linear'],['heatmap-density'],
  0.000,'rgba(0,0,0,0)',
  0.002,'rgba(231,231,231,0.45)',
  0.006,'rgba(208,225,241,0.65)',
  0.012,'rgba(149,196,224,0.80)',
  0.020,'rgba(74,152,201,0.88)',
  0.030,'rgba(23,100,170,0.93)',
  0.042,'rgba(16,132,71,0.97)',
  0.055,'rgba(83,181,96,1)',
  0.070,'rgba(255,246,177,1)',
  0.090,'rgba(252,170,96,1)',
  0.120,'rgba(247,132,78,1)',
  0.180,'rgba(237,94,60,1)',
  0.320,'rgba(194,28,38,1)',
  0.550,'rgba(165,1,38,1)',
  1.000,'rgba(153,0,249,1)',
]

export const HEATMAP_WEIGHT_EXPR = [
  'interpolate',['linear'],['get','v'],
  0,0, 5,0.08, 15,0.20, 30,0.35, 75,0.60, 200,0.85, 500,1.0,
]
