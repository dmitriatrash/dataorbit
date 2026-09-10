const HDF5_SIGNATURE = [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a]

export function isHdf5(buffer) {
  const bytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength))
  return HDF5_SIGNATURE.every((byte, index) => bytes[index] === byte)
}

export async function parseNetCDF4(buffer, fileName, maxHeatmapFeatures, requestedVariable) {
  const h5wasm = await import('h5wasm')
  const api = h5wasm.default ?? h5wasm
  const module = await api.ready
  const path = `/dataorbit-${Date.now()}-${sanitizeName(fileName)}`
  const bytes = new Uint8Array(buffer)
  module.FS.writeFile(path, bytes)

  let file
  try {
    file = new api.File(path, 'r')
    const datasets = getRootDatasets(file)
    const latitude = findCoordinate(datasets, 'latitude', 'lat', 'Y')
    const longitude = findCoordinate(datasets, 'longitude', 'lon', 'X')

    if (!latitude || !longitude) {
      throw new Error('No latitude/longitude variables found in the NetCDF4 file.')
    }

    const latValues = toNumberArray(latitude.value)
    const lonValues = toNumberArray(longitude.value)
    const ny = latValues.length
    const nx = lonValues.length
    const gridDatasets = findGridDatasets(datasets, ny, nx)
    const { datasets: channelDatasets, kind: variableKind } = selectChannelDatasets(gridDatasets)
    const data = chooseDataset(channelDatasets, requestedVariable)

    if (!data) {
      throw new Error(`No numeric data variable found for the ${ny} × ${nx} coordinate grid.`)
    }

    const availableVariables = channelDatasets.map((dataset) => ({
      name: datasetName(dataset),
      label: getStringAttribute(dataset, 'long_name') || datasetName(dataset),
      units: getStringAttribute(dataset, 'units') || '—',
    }))

    const fillValue = getNumericAttribute(data, '_FillValue', 'missing_value')
    const scaleFactor = getNumericAttribute(data, 'scale_factor') ?? 1
    const addOffset = getNumericAttribute(data, 'add_offset') ?? 0
    const rawValues = toNumberArray(data.value)
    const gridSize = ny * nx
    const timeOffset = Math.max(0, rawValues.length - gridSize)
    const stride = Math.max(1, Math.ceil(gridSize / maxHeatmapFeatures))
    const samples = []
    let minValue = Infinity
    let maxValue = -Infinity

    for (let index = 0; index < gridSize; index += stride) {
      const raw = rawValues[timeOffset + index]
      if (!isValidSample(raw, fillValue)) continue
      const value = raw * scaleFactor + addOffset
      if (!Number.isFinite(value)) continue
      if (value < minValue) minValue = value
      if (value > maxValue) maxValue = value
      samples.push({ index, value })
    }

    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      throw new Error(`No valid numeric samples found in "${datasetName(data)}".`)
    }

    const span = Math.max(maxValue - minValue, 1e-12)
    const features = samples.flatMap(({ index, value }) => {
      const row = Math.floor(index / nx)
      const column = index % nx
      const lat = Number(latValues[row])
      const lon = Number(lonValues[column])
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return []
      return [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [round(lon), round(lat)] },
        properties: { v: Math.round(((value - minValue) / span) * 500 * 100) / 100 },
      }]
    })

    return {
      geojson: { type: 'FeatureCollection', features },
      meta: {
        varName: datasetName(data),
        units: getStringAttribute(data, 'units') || '—',
        availableVariables,
        variableKind,
        minValue,
        maxValue,
        pointCount: features.length,
        gridCellCount: gridSize,
        subsampleStride: stride,
        subsampled: stride > 1,
        maxHeatmapFeatures,
        fileName,
        layerMode: 'grid',
        netcdfDims: data.shape,
        gridSize: { ny, nx },
        gridMetrics: {
          centerLat: latValues[Math.floor(ny / 2)],
          centerLon: lonValues[Math.floor(nx / 2)],
          stepLatDeg: ny > 1 ? latValues[1] - latValues[0] : 1,
          stepLonDeg: nx > 1 ? lonValues[1] - lonValues[0] : 1,
        },
      },
    }
  } finally {
    file?.close()
    module.FS.unlink(path)
  }
}

function getRootDatasets(file) {
  return file.keys()
    .map((name) => {
      const dataset = file.get(name)
      return Object.assign(dataset, { __name: name })
    })
    .filter((dataset) => dataset?.shape && dataset?.value != null)
}

function findCoordinate(datasets, standardName, namePattern, axis) {
  return datasets.find((dataset) => {
    const standard = getStringAttribute(dataset, 'standard_name')?.toLowerCase()
    const datasetAxis = getStringAttribute(dataset, 'axis')
    return dataset.shape.length === 1 && (standard === standardName || datasetAxis === axis || new RegExp(`^${namePattern}$`, 'i').test(datasetName(dataset)))
  })
}

function findGridDatasets(datasets, ny, nx) {
  return datasets
    .filter((dataset) => {
      if (!dataset.shape || dataset.shape.length < 2) return false
      const shape = dataset.shape
      return shape[shape.length - 2] === ny && shape[shape.length - 1] === nx && dataset.dtype !== 'A1'
    })
    .filter((dataset) => getStringAttribute(dataset, 'coverage_content_type') !== 'auxiliaryInformation')
    .sort((a, b) => {
      const aPhysical = getStringAttribute(a, 'coverage_content_type') === 'physicalMeasurement' ? 0 : 1
      const bPhysical = getStringAttribute(b, 'coverage_content_type') === 'physicalMeasurement' ? 0 : 1
      return aPhysical - bPhysical || datasetName(a).localeCompare(datasetName(b))
    })
}

/**
 * Satellite products name their bands ch1…chN; model output does not. The caller passes the
 * `kind` through to `meta` so the picker can be labelled for what it is actually listing.
 */
function selectChannelDatasets(datasets) {
  const channels = datasets.filter((dataset) => /^ch\d+$/i.test(datasetName(dataset)))
  return channels.length > 0
    ? { datasets: channels, kind: 'channel' }
    : { datasets, kind: 'variable' }
}

function chooseDataset(datasets, requestedVariable) {
  return datasets.find((dataset) => datasetName(dataset) === requestedVariable) || datasets[0]
}

function datasetName(dataset) {
  return dataset?.__name || 'data'
}

function getNumericAttribute(dataset, ...names) {
  for (const name of names) {
    const value = dataset.attrs?.[name]?.value
    const candidate = Array.isArray(value) || ArrayBuffer.isView(value) ? value[0] : value
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate
  }
  return null
}

function getStringAttribute(dataset, name) {
  const value = dataset.attrs?.[name]?.value
  const candidate = Array.isArray(value) || ArrayBuffer.isView(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate.trim() : ''
}

function toNumberArray(value) {
  return Array.from(value, Number)
}

function isValidSample(value, fillValue) {
  return Number.isFinite(value) && (fillValue == null || value !== fillValue)
}

function sanitizeName(name) {
  return name.replace(/[^a-z0-9._-]/gi, '_')
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
