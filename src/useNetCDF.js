import { useState, useCallback } from 'react'

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

function pickDataVariable(reader, varNames, latVarName, lonVarName, gridLen) {
  const used = new Set([latVarName, lonVarName].filter(Boolean))
  const candidates = varNames.filter(n => !used.has(n) && !isCoordName(n))
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

export function useNetCDF() {
  const [status, setStatus]   = useState('idle')
  const [geojson, setGeojson] = useState(null)
  const [meta,    setMeta]    = useState(null)
  const [error,   setError]   = useState(null)

  const parse = useCallback(async (file) => {
    setStatus('parsing')
    setError(null)
    setGeojson(null)
    setMeta(null)

    try {
      const buffer = await file.arrayBuffer()
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

      const dataVarName = pickDataVariable(reader, varNames, latVarName, lonVarName, N)
      const dataRaw = reader.getDataVariable(dataVarName)
      const dataVar = reader.variables.find(v => v.name === dataVarName)
      const fill = getAttrFirst(dataVar, '_FillValue', 'missing_value')

      const units = unitsString(dataVar) || '—'
      const STEP = 6
      const is2D = latRaw.length === N

      let minV = Infinity
      let maxV = -Infinity
      for (let i = 0; i < N; i += STEP) {
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

      for (let i = 0; i < N; i += STEP) {
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

      console.log(`[NetCDF] ${features.length} points, ${dataVarName} range ${minV.toPrecision(4)}…${maxV.toPrecision(4)} (${units})`)
      setGeojson({ type: 'FeatureCollection', features })
      setMeta({
        varName: dataVarName,
        units,
        minValue: minV,
        maxValue: maxV,
        pointCount: features.length,
        fileName: file.name,
      })
      setStatus('ready')
    } catch (err) {
      console.error('[NetCDF] parse error:', err)
      setError(err.message)
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle'); setGeojson(null); setMeta(null); setError(null)
  }, [])

  return { status, geojson, meta, error, parse, reset }
}
