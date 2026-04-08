import { useCallback } from 'react'
import { Button, CardRoot, CardContent, Spinner } from '@heroui/react'

export default function UploadPanel({ status, meta, error, parsingFileName, onFile, onReset }) {
  const handleDrop = useCallback(e => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.nc,.nc4,.netcdf'
    input.onchange = e => { if (e.target.files[0]) onFile(e.target.files[0]) }
    input.click()
  }, [onFile])

  if (status === 'ready' && meta) {
    return (
      <CardRoot className="bg-black/70 border border-white/15 backdrop-blur-md rounded-xl">
        <CardContent className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase text-white/60">Active Dataset</span>
            <button onClick={onReset} className="text-xs tracking-widest uppercase text-orange-300 hover:text-orange-200 transition-colors">
              ✕ Clear
            </button>
          </div>
          <p className="text-sm text-white/90 font-mono truncate" title={meta.fileName}>
            {meta.fileName}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
            <Stat label="Variable" value={meta.varName.slice(0, 14)} />
            <Stat
              label="Points"
              value={
                meta.subsampled
                  ? `${meta.pointCount.toLocaleString()} · grid ${meta.gridCellCount?.toLocaleString() ?? '—'}`
                  : meta.pointCount.toLocaleString()
              }
            />
            <Stat label="Range"    value={`${meta.minValue.toPrecision(4)} … ${meta.maxValue.toPrecision(4)}`} />
            <Stat label="Units"    value={meta.units} />
          </div>
          {meta.layerMode === 'grid' && meta.gridSize ? (
            <p className="text-[10px] text-emerald-200/90 leading-snug mt-2 pt-2 border-t border-white/10">
              Model grid {meta.gridSize.ny}×{meta.gridSize.nx}: heatmap uses cell-centered samples (MapLibre image layers are disabled — they distort curvilinear grids).
            </p>
          ) : null}
          {meta.subsampled && meta.gridCellCount != null && meta.subsampleStride != null ? (
            <p className="text-[10px] text-orange-200/85 leading-snug mt-2 pt-2 border-t border-white/10">
              Large grid: every {meta.subsampleStride}th cell is drawn so the map stays within browser memory limits.
            </p>
          ) : null}
        </CardContent>
      </CardRoot>
    )
  }

  if (status === 'parsing') {
    return (
      <CardRoot className="bg-black/70 border border-orange-400/25 backdrop-blur-md rounded-xl">
        <CardContent className="p-5 flex flex-col items-center gap-2 text-center">
          <Spinner size="sm" color="warning" />
          <span className="text-xs tracking-widest uppercase text-orange-200/90">Loading NetCDF…</span>
          {parsingFileName ? (
            <p className="text-[11px] font-mono text-white/75 truncate w-full" title={parsingFileName}>
              {parsingFileName}
            </p>
          ) : null}
          <p className="text-[10px] text-white/45 leading-snug">
            Decoding variables and sampling the grid.
          </p>
        </CardContent>
      </CardRoot>
    )
  }

  if (status === 'error') {
    return (
      <CardRoot className="bg-black/60 border border-red-500/30 backdrop-blur-md rounded-xl">
        <CardContent className="p-4 flex flex-col gap-2">
          <span className="text-xs tracking-widest uppercase text-red-400">Parse Error</span>
          <p className="text-xs text-red-200/90 font-mono leading-relaxed">{error}</p>
          <Button size="sm" variant="outline" onPress={onReset} className="mt-1 text-xs tracking-widest uppercase text-red-300 border-red-500/50">
            Try Again
          </Button>
        </CardContent>
      </CardRoot>
    )
  }

  return (
    <CardRoot className="bg-black/70 border border-white/15 backdrop-blur-md rounded-xl">
      <CardContent className="p-3">
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload NetCDF file"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={handleClick}
          className="border border-dashed border-white/25 rounded-lg p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-orange-400/55 hover:bg-orange-400/5 transition-all duration-200"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/25">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
            <path d="M12 12v9m-3-3 3 3 3-3"/>
          </svg>
          <span className="text-xs tracking-widest uppercase text-white/65 text-center">Drop NetCDF file</span>
          <span className="text-[11px] text-white/45">.nc · .nc4 · .netcdf</span>
        </div>
      </CardContent>
    </CardRoot>
  )
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] tracking-widest uppercase text-white/55">{label}</span>
      <span className="text-xs font-mono text-white/85 truncate">{value}</span>
    </div>
  )
}
