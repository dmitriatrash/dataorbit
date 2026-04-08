import { useState, useReducer, useCallback } from 'react'
import { Spinner } from '@heroui/react'
import GlobeMap        from './GlobeMap'
import UploadPanel     from './UploadPanel'
import MapViewControls from './MapViewControls'
import ControlPanel    from './ControlPanel'
import Legend          from './Legend'
import { useNetCDF } from './useNetCDF'

const DEFAULT_CONTROLS = {
  radius:          18,
  intensity:       0.8,
  opacity:         88,
  boundaryOpacity: 100,
}

function controlsReducer(state, { key, value }) {
  return { ...state, [key]: value }
}

export default function App() {
  const [controls, dispatch] = useReducer(controlsReducer, DEFAULT_CONTROLS)
  const { status, geojson, meta, error, parsingFileName, parse, reset } = useNetCDF()
  const [basemap, setBasemap] = useState('dark')
  const [viewMode, setViewMode] = useState('globe')
  const [showNaStateBorders, setShowNaStateBorders] = useState(false)
  const [showUiChrome, setShowUiChrome] = useState(true)
  const [mapResetSignal, setMapResetSignal] = useState(0)
  const resetMapView = useCallback(() => {
    setMapResetSignal(n => n + 1)
  }, [])

  const handleChange = useCallback((key, value) => {
    dispatch({ key, value })
  }, [])

  return (
    <div className="relative w-screen h-screen bg-[#06060e] overflow-hidden">

      {/* ── Globe ── */}
      <GlobeMap
        geojson={geojson}
        radius={controls.radius}
        intensity={controls.intensity}
        opacity={controls.opacity}
        boundaryOpacity={controls.boundaryOpacity}
        basemap={basemap}
        viewMode={viewMode}
        showNaStateBorders={showNaStateBorders}
        resetSignal={mapResetSignal}
      />

      {!showUiChrome && (
        <button
          type="button"
          onClick={() => setShowUiChrome(true)}
          aria-label="Show map controls"
          className="absolute top-4 left-4 z-20 rounded-xl border border-white/20 bg-black/70 backdrop-blur-md px-3 py-2.5 text-xs tracking-widest uppercase text-orange-300 font-mono hover:bg-black/80 hover:border-orange-500/40 transition-colors shadow-lg"
        >
          Show controls
        </button>
      )}

      {/* ── Left sidebar ── */}
      <div
        className={`
          absolute top-4 left-4 z-10 flex flex-col gap-3 w-72 max-w-[calc(100vw-2rem)]
          transition-all duration-300 ease-out
          ${showUiChrome
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'}
        `}
        aria-hidden={!showUiChrome}
      >

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-sm tracking-[0.18em] uppercase text-white font-bold font-mono">
              DataOrbit
            </h1>
            <p className="text-xs tracking-widest uppercase text-white/55 font-mono mt-0.5">
              NetCDF grid · globe & map
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUiChrome(false)}
            aria-label="Hide map controls"
            className="shrink-0 mt-0.5 px-2.5 py-1.5 rounded-lg text-xs tracking-widest uppercase text-white/60 border border-white/15 hover:text-orange-300 hover:border-white/25 transition-colors"
          >
            Hide
          </button>
        </div>

        {/* Upload */}
        <UploadPanel
          status={status}
          meta={meta}
          error={error}
          parsingFileName={parsingFileName}
          onFile={parse}
          onReset={reset}
        />

        <MapViewControls
          basemap={basemap}
          viewMode={viewMode}
          showNaStateBorders={showNaStateBorders}
          onBasemap={setBasemap}
          onViewMode={setViewMode}
          onShowNaStateBorders={setShowNaStateBorders}
          onResetMapView={resetMapView}
        />

        {/* Controls — always visible */}
        <ControlPanel
          {...controls}
          layerMode={meta?.layerMode}
          onChange={handleChange}
        />

      </div>

      {/* ── Legend ── */}
      {showUiChrome && <Legend meta={meta} />}

      {/* ── Idle overlay hint ── */}
      {status === 'idle' && showUiChrome && (
        <div className="
          absolute inset-0 flex items-center justify-center
          pointer-events-none
        ">
          <div className="text-center">
            <p className="text-sm tracking-widest uppercase text-white/35 font-mono max-w-md px-4">
              Upload a NetCDF file with latitude & longitude to explore the grid
            </p>
          </div>
        </div>
      )}

      {/* ── Loading: full-viewport feedback (map is empty until GeoJSON is ready) ── */}
      {status === 'parsing' && showUiChrome && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-orange-400/25 bg-black/75 backdrop-blur-md px-10 py-8 shadow-xl max-w-md mx-4">
            <Spinner size="lg" color="warning" classNames={{ wrapper: 'w-10 h-10' }} />
            <div className="text-center space-y-1">
              <p className="text-sm tracking-widest uppercase text-orange-200/95 font-mono">
                Loading dataset
              </p>
              {parsingFileName ? (
                <p className="text-xs font-mono text-white/80 truncate max-w-[min(100%,280px)]" title={parsingFileName}>
                  {parsingFileName}
                </p>
              ) : null}
              <p className="text-[11px] tracking-wide text-white/50 max-w-xs leading-relaxed pt-1">
                Reading the file and building the grid. Large files may take a little while.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
