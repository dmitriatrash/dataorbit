/**
 * Structured lat/lon grids from NetCDF (e.g. WRF XLAT/XLONG). We only emit GeoJSON points for
 * MapLibre heatmaps — not MapLibre `image` layers: affine-warping a PNG to four lon/lat corners is
 * wrong for curvilinear model grids and produces huge triangular artifacts in 2D and 3D.
 */

function getDimSizes(reader, varMeta) {
  return varMeta.dimensions.map(id => reader.dimensions[id].size)
}

/**
 * @param {*} reader NetCDFReader
 * @param {*} varMeta variable header
 * @param {number} timeIndex
 * @returns {number[] | null}
 */
export function getSpatialFlatSlice(reader, varMeta, timeIndex = 0) {
  const dims = getDimSizes(reader, varMeta)
  const data = reader.getDataVariable(varMeta.name)

  if (varMeta.record) {
    if (!Array.isArray(data) || data.length <= timeIndex) return null
    const slice = data[timeIndex]
    return Array.isArray(slice) ? slice : Array.from(slice)
  }

  const total = dims.reduce((a, b) => a * b, 1)
  if (data.length !== total) return null

  if (dims.length === 2) return data
  if (dims.length === 3) {
    const [nt, ny, nx] = dims
    const per = ny * nx
    if (timeIndex < 0 || timeIndex >= nt) return null
    return data.slice(timeIndex * per, (timeIndex + 1) * per)
  }
  if (dims.length === 4) {
    const [nt, nz, ny, nx] = dims
    const per = ny * nx
    const vol = nz * per
    if (timeIndex < 0 || timeIndex >= nt) return null
    const off = timeIndex * vol
    return data.slice(off, off + per)
  }
  return null
}

/**
 * @param {*} reader NetCDFReader
 * @param {*} latVar variable header
 * @returns {{ ny: number, nx: number, timeLen: number } | null}
 */
export function inferGridShape(reader, latVar) {
  const dims = getDimSizes(reader, latVar)
  if (dims.length === 2) {
    return { ny: dims[0], nx: dims[1], timeLen: 1 }
  }
  if (dims.length === 3) {
    return { ny: dims[1], nx: dims[2], timeLen: dims[0] }
  }
  if (dims.length === 4) {
    return { ny: dims[2], nx: dims[3], timeLen: dims[0] }
  }
  return null
}

export function buildSubsampledGridGeoJSON(
  latFlat,
  lonFlat,
  dataFlat,
  ny,
  nx,
  fill,
  minV,
  maxV,
  maxFeatures = 45_000,
) {
  const n = ny * nx
  const stride = Math.max(1, Math.ceil(n / maxFeatures))
  const span = Math.max(maxV - minV, 1e-12)
  /** @type {object[]} */
  const features = []

  for (let i = 0; i < n; i += stride) {
    const raw = dataFlat[i]
    if (!Number.isFinite(raw)) continue
    if (fill != null && raw === fill) continue
    let lon = lonFlat[i]
    if (lon > 180) lon -= 360
    const lat = latFlat[i]
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue
    const v = span > 1e-30 ? ((raw - minV) / span) * 500 : 250
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000] },
      properties: { v: Math.round(v * 100) / 100 },
    })
  }

  return { type: 'FeatureCollection', features }
}

function median(values) {
  if (!values.length) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function wrapLonDelta(d) {
  const ad = Math.abs(d)
  return ad > 180 ? 360 - ad : ad
}

export function estimateGridMetrics(latFlat, lonFlat, ny, nx) {
  if (!latFlat || !lonFlat || ny < 2 || nx < 2) return null
  const samples = Math.max(100, Math.min(1200, Math.floor((ny * nx) / 500)))
  const stepY = Math.max(1, Math.floor(ny / Math.sqrt(samples)))
  const stepX = Math.max(1, Math.floor(nx / Math.sqrt(samples)))
  const latSteps = []
  const lonSteps = []
  for (let y = 0; y < ny - 1; y += stepY) {
    const row = y * nx
    for (let x = 0; x < nx - 1; x += stepX) {
      const i = row + x
      const lat = latFlat[i]
      const lon = lonFlat[i]
      const latR = latFlat[i + 1]
      const lonR = lonFlat[i + 1]
      const latD = latFlat[i + nx]
      const lonD = lonFlat[i + nx]
      if (Number.isFinite(lat) && Number.isFinite(latR)) {
        const dLat = Math.abs(latR - lat)
        if (dLat > 0) latSteps.push(dLat)
      }
      if (Number.isFinite(lon) && Number.isFinite(lonR)) {
        const dLon = wrapLonDelta(lonR - lon)
        if (dLon > 0) lonSteps.push(dLon)
      }
      if (Number.isFinite(lat) && Number.isFinite(latD)) {
        const dLat = Math.abs(latD - lat)
        if (dLat > 0) latSteps.push(dLat)
      }
      if (Number.isFinite(lon) && Number.isFinite(lonD)) {
        const dLon = wrapLonDelta(lonD - lon)
        if (dLon > 0) lonSteps.push(dLon)
      }
    }
  }
  const stepLatDeg = median(latSteps)
  const stepLonDeg = median(lonSteps)
  const midIndex = Math.floor(ny / 2) * nx + Math.floor(nx / 2)
  let centerLat = latFlat[midIndex]
  let centerLon = lonFlat[midIndex]
  if (centerLon > 180) centerLon -= 360
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLon)) return null
  if (!Number.isFinite(stepLatDeg) || !Number.isFinite(stepLonDeg)) return null
  return { centerLat, centerLon, stepLatDeg, stepLonDeg }
}

/**
 * If lat/lon/data share a regular 2D (or time×2D) grid, build a capped heatmap FeatureCollection.
 * @returns {{
 *   geojson: object,
 *   minV: number,
 *   maxV: number,
 *   ny: number,
 *   nx: number,
 *   stride: number,
 *   netcdfDims: number[],
 *   gridMetrics: { centerLat: number, centerLon: number, stepLatDeg: number, stepLonDeg: number } | null,
 * } | null}
 */
export function tryAlignedGridHeatmap(reader, latVarName, lonVarName, dataVarName, fill, maxFeatures = 45_000) {
  const latMeta = reader.variables.find(v => v.name === latVarName)
  const lonMeta = reader.variables.find(v => v.name === lonVarName)
  const dataMeta = reader.variables.find(v => v.name === dataVarName)
  if (!latMeta || !lonMeta || !dataMeta) return null

  const shape = inferGridShape(reader, latMeta)
  if (!shape) return null

  const { ny, nx, timeLen } = shape
  if (timeLen < 1 || ny < 2 || nx < 2) return null

  const latFlat = getSpatialFlatSlice(reader, latMeta, 0)
  const lonFlat = getSpatialFlatSlice(reader, lonMeta, 0)
  const dataFlat = getSpatialFlatSlice(reader, dataMeta, 0)
  if (!latFlat || !lonFlat || !dataFlat) return null
  if (latFlat.length !== ny * nx || lonFlat.length !== ny * nx || dataFlat.length !== ny * nx) {
    return null
  }

  let minV = Infinity
  let maxV = -Infinity
  for (let i = 0; i < dataFlat.length; i += 1) {
    const raw = dataFlat[i]
    if (!Number.isFinite(raw)) continue
    if (fill != null && raw === fill) continue
    if (raw < minV) minV = raw
    if (raw > maxV) maxV = raw
  }
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return null

  const gridCellCount = ny * nx
  const stride = Math.max(1, Math.ceil(gridCellCount / maxFeatures))
  const geojson = buildSubsampledGridGeoJSON(
    latFlat,
    lonFlat,
    dataFlat,
    ny,
    nx,
    fill,
    minV,
    maxV,
    maxFeatures,
  )

  const netcdfDims = latMeta.dimensions.map(id => reader.dimensions[id].size)
  const gridMetrics = estimateGridMetrics(latFlat, lonFlat, ny, nx)

  return {
    geojson,
    minV,
    maxV,
    ny,
    nx,
    stride,
    netcdfDims,
    gridMetrics,
    featureCount: geojson.features.length,
    gridCellCount,
  }
}
