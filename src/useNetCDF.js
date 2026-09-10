import { useState, useCallback, useEffect, useRef } from 'react'
import { tryAlignedGridHeatmap } from './gridRaster'
import { isHdf5, parseNetCDF4 } from './netcdf4'
import { MAX_FILE_BYTES, fetchNetcdfFile, fileNameFromUrl, fileTooLargeMessage, parseNetcdfUrl } from './netcdfUrl'

/**
 * MapLibre heatmaps + huge GeoJSON Feature arrays exhaust JS/WebGL memory; Chrome may crash.
 */
const DEFAULT_MAX_HEATMAP_FEATURES = 45_000

function varLength(reader, name) {
  try {
    const a = reader.getDataVariable(name)
    return a?.length ?? 0
  } catch {
    return 0
  }
}

function isCoordName(n) {
  return /^(lat|lon|xlat|xlong|latitude|longitude|gridlat|gridlon|rot|angle|time|xtime|timestep|times)$/i.test(n)
}

function getAttrFirst(variable, ...attrNames) {
  for (const attrName of attrNames) {
    const a = variable.attributes?.find(x => x.name === attrName)
    if (a?.value == null) continue
    const v = Array.isArray(a.value) ? a.value[0] : a.value
    if (typeof v === 'number' && isFinite(v)) return v
  }
  return null
}

function unitsString(variable) {
  const a = variable.attributes?.find(x => x.name === 'units')
  if (!a?.value) return ''
  if (typeof a.value === 'string') return a.value
  if (Array.isArray(a.value) && a.value.length && typeof a.value[0] === 'string') return a.value[0]
  return ''
}

function isMissing(raw, fill) {
  if (!isFinite(raw)) return true
  if (fill != null && raw === fill) return true
  return false
}

function pickDataVariable(reader, varNames, latVarName, lonVarName, gridLen, requestedVariable = null) {
  const used = new Set([latVarName, lonVarName].filter(Boolean))
  const candidates = varNames.filter(n => !used.has(n) && !isCoordName(n))
  if (requestedVariable && candidates.includes(requestedVariable) && varLength(reader, requestedVariable) === gridLen) return requestedVariable
  const matched = candidates.filter(n => varLength(reader, n) === gridLen)

  if (!matched.length) {
    throw new Error(
      'No data variable found with the same grid size as latitude/longitude. ' +
        `Need a field with length ${gridLen}. Variables: ${varNames.join(', ')}`
    )
  }

  const rank = (name) => {
    if (name.startsWith('COLMD')) return 0
    if (/temperature|temp|t2|theta|sst|pressure|u10|v10|wind|humid|rh|precip|reflect|geopotential|hpbl|height|depth|mass|column|integrated|aod|pm25|aermr|vis|extcof/i.test(name)) return 1
    return 2
  }

  matched.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  return matched[0]
}

export function useNetCDF({ maxHeatmapFeatures = DEFAULT_MAX_HEATMAP_FEATURES } = {}) {
  const [status, setStatus]   = useState('idle')
  const [geojson, setGeojson] = useState(null)
  const [meta,    setMeta]    = useState(null)
  const [error,   setError]   = useState(null)
  const [parsingFileName, setParsingFileName] = useState(null)
  const lastFileRef = useRef(null)
  const lastVariableRef = useRef(null)
  const lastMaxRef = useRef(maxHeatmapFeatures)
  const parseGenerationRef = useRef(0)

  const parse = useCallback(async (source, requestedVariable = null) => {
    if (!source) return
    const generation = ++parseGenerationRef.current
    const isUrl = typeof source === 'string'
    let displayName = isUrl ? source.trim() : source.name
    if (isUrl) {
      try {
        displayName = fileNameFromUrl(parseNetcdfUrl(source))
      } catch {
        displayName = source.trim() || 'remote file'
      }
    } else {
      lastFileRef.current = source
    }
    lastVariableRef.current = requestedVariable
    setStatus('parsing')
    setParsingFileName(displayName ?? null)
    setError(null)
    setGeojson(null)
    setMeta(null)

    try {
      const file = isUrl ? await fetchNetcdfFile(source) : source
      if (generation !== parseGenerationRef.current) return
      lastFileRef.current = file
      setParsingFileName(file.name)

      const maxFeatures = Math.max(10_000, Math.min(500_000, Math.round(maxHeatmapFeatures)))
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(fileTooLargeMessage(file.size))
      }

      const buffer = await file.arrayBuffer()
      if (generation !== parseGenerationRef.current) return
      if (isHdf5(buffer)) {
        const parsed = await parseNetCDF4(buffer, file.name, maxFeatures, requestedVariable)
        if (generation !== parseGenerationRef.current) return
        setGeojson(parsed.geojson)
        setMeta(parsed.meta)
        setParsingFileName(null)
        setStatus('ready')
        return
      }

      const { NetCDFReader } = await import('netcdfjs')
      const reader = new NetCDFReader(buffer)

      const varNames = reader.variables.map(v => v.name)
      console.log('[NetCDF] variables:', varNames)

      const latVarName =
        varNames.find(n => /^XLAT$/i.test(n)) ||
        varNames.find(n => /^gridlat$/i.test(n)) ||
        varNames.find(n => /^latitude$/i.test(n)) ||
        varNames.find(n => /^lat$/i.test(n)) ||
        varNames.find(n => /gridlat/i.test(n))
      const lonVarName =
        varNames.find(n => /^XLONG$/i.test(n)) ||
        varNames.find(n => /^gridlon$/i.test(n)) ||
        varNames.find(n => /^longitude$/i.test(n)) ||
        varNames.find(n => /^lon$/i.test(n)) ||
        varNames.find(n => /gridlon/i.test(n))

      if (!latVarName || !lonVarName) {
        throw new Error(
          'No latitude/longitude variables found. Expected gridlat/gridlon, XLAT/XLONG, or latitude/longitude. ' +
            `Found: ${varNames.join(', ')}`
        )
      }

      const latRaw = reader.getDataVariable(latVarName)
      const lonRaw = reader.getDataVariable(lonVarName)
      const N = latRaw.length

      const dataVarName = pickDataVariable(reader, varNames, latVarName, lonVarName, N, requestedVariable)
      const dataVar = reader.variables.find(v => v.name === dataVarName)
      const fill = getAttrFirst(dataVar, '_FillValue', 'missing_value')

      const units = unitsString(dataVar) || '—'

      const gridHeat = tryAlignedGridHeatmap(
        reader,
        latVarName,
        lonVarName,
        dataVarName,
        fill,
        maxFeatures,
      )

      if (gridHeat) {
        if (generation !== parseGenerationRef.current) return
        setGeojson(gridHeat.geojson)
        setMeta({
          varName: dataVarName,
          units,
          availableVariables: getNetCDF3VariableOptions(reader, varNames, latVarName, lonVarName, N),
          variableKind: 'variable',
          minValue: gridHeat.minV,
          maxValue: gridHeat.maxV,
          pointCount: gridHeat.featureCount,
          gridCellCount: gridHeat.gridCellCount,
          subsampleStride: gridHeat.stride,
          subsampled: gridHeat.stride > 1,
          maxHeatmapFeatures: maxFeatures,
          fileName: file.name,
          layerMode: 'grid',
          netcdfDims: gridHeat.netcdfDims,
          gridSize: { ny: gridHeat.ny, nx: gridHeat.nx },
          gridMetrics: gridHeat.gridMetrics,
        })
        setParsingFileName(null)
        setStatus('ready')
        return
      }

      const dataRaw = reader.getDataVariable(dataVarName)
      const stride = Math.max(1, Math.ceil(N / maxFeatures))
      const is2D = latRaw.length === N

      let minV = Infinity
      let maxV = -Infinity
      for (let i = 0; i < N; i += stride) {
        const raw = dataRaw[i]
        if (isMissing(raw, fill)) continue
        if (raw < minV) minV = raw
        if (raw > maxV) maxV = raw
      }
      if (!isFinite(minV) || !isFinite(maxV)) {
        throw new Error(`No valid numeric samples in "${dataVarName}" (check fill values and range).`)
      }
      const span = Math.max(maxV - minV, 1e-12)

      const features = []

      for (let i = 0; i < N; i += stride) {
        const raw = dataRaw[i]
        if (isMissing(raw, fill)) continue

        const lat = is2D ? latRaw[i] : latRaw[Math.floor(i / (N / latRaw.length))]
        let lon = is2D ? lonRaw[i] : lonRaw[i % lonRaw.length]
        if (lon > 180) lon -= 360
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue

        const v = span > 1e-30 ? ((raw - minV) / span) * 500 : 250

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000] },
          properties: { v: Math.round(v * 100) / 100 },
        })
      }

      console.log(
        `[NetCDF] ${features.length} points (stride ${stride}, grid N=${N}), ${dataVarName} range ${minV.toPrecision(4)}…${maxV.toPrecision(4)} (${units})`
      )
      if (generation !== parseGenerationRef.current) return
      setGeojson({ type: 'FeatureCollection', features })
      setMeta({
        varName: dataVarName,
        units,
        availableVariables: getNetCDF3VariableOptions(reader, varNames, latVarName, lonVarName, N),
        variableKind: 'variable',
        minValue: minV,
        maxValue: maxV,
        pointCount: features.length,
        gridCellCount: N,
        subsampleStride: stride,
        subsampled: stride > 1,
        maxHeatmapFeatures: maxFeatures,
        fileName: file.name,
        layerMode: 'heatmap',
      })
      setParsingFileName(null)
      setStatus('ready')
    } catch (err) {
      if (generation !== parseGenerationRef.current) return
      console.error('[NetCDF] parse error:', err)
      setParsingFileName(null)
      setError(err.message)
      setStatus('error')
    }
  }, [maxHeatmapFeatures])

  useEffect(() => {
    if (lastMaxRef.current === maxHeatmapFeatures) return
    lastMaxRef.current = maxHeatmapFeatures
    const last = lastFileRef.current
    if (!last) return
    if (status === 'parsing') return
      parse(last, lastVariableRef.current)
    }, [maxHeatmapFeatures, parse, status])

  const selectVariable = useCallback((variableName) => {
    const file = lastFileRef.current
    if (file) parse(file, variableName)
  }, [parse])

  const reset = useCallback(() => {
    parseGenerationRef.current += 1
    lastFileRef.current = null
    lastVariableRef.current = null
    setStatus('idle'); setGeojson(null); setMeta(null); setError(null); setParsingFileName(null)
  }, [])

  return { status, geojson, meta, error, parsingFileName, parse, selectVariable, reset }
}

function getNetCDF3VariableOptions(reader, varNames, latVarName, lonVarName, gridLength) {
  const coordinateNames = new Set([latVarName, lonVarName].filter(Boolean))
  return varNames
    .filter((name) => !coordinateNames.has(name) && !isCoordName(name))
    .filter((name) => varLength(reader, name) === gridLength)
    .map((name) => {
      const variable = reader.variables.find((candidate) => candidate.name === name)
      return { name, label: name, units: unitsString(variable) || '—' }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
