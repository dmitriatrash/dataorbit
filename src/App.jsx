import { useState, useReducer, useCallback } from 'react'
import GlobeMap from './GlobeMap'
import CommandDrawer from './CommandDrawer'
import Legend from './Legend'
import { useNetCDF } from './useNetCDF'

const DEFAULT_CONTROLS = {
  radius: 18,
  detailBoost: 0.35,
  maxPoints: 45_000,
  noSmoothing: false,
  intensity: 0.8,
  opacity: 88,
  boundaryOpacity: 100,
}

function controlsReducer(state, { key, value }) {
  return { ...state, [key]: value }
}

export default function App() {
  const [controls, dispatch] = useReducer(controlsReducer, DEFAULT_CONTROLS)
  const { status, geojson, meta, error, parsingFileName, parse, selectVariable, reset } = useNetCDF({
    maxHeatmapFeatures: controls.maxPoints,
  })
  const [basemap, setBasemap] = useState('dark')
  const [viewMode, setViewMode] = useState('globe')
  const [showNaStateBorders, setShowNaStateBorders] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)
  const [activeDestination, setActiveDestination] = useState('dataset')
  const [openDisclosure, setOpenDisclosure] = useState('surface')
  const [mapResetSignal, setMapResetSignal] = useState(0)

  const resetMapView = useCallback(() => {
    setMapResetSignal((signal) => signal + 1)
  }, [])

  const handleChange = useCallback((key, value) => {
    dispatch({ key, value })
  }, [])

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((open) => !open)
  }, [])

  return (
    <div className="dataorbit-app">
      <GlobeMap
        geojson={geojson}
        radius={controls.radius}
        detailBoost={controls.detailBoost}
        noSmoothing={controls.noSmoothing}
        intensity={controls.intensity}
        opacity={controls.opacity}
        boundaryOpacity={controls.boundaryOpacity}
        basemap={basemap}
        viewMode={viewMode}
        showNaStateBorders={showNaStateBorders}
        gridMetrics={meta?.gridMetrics}
        resetSignal={mapResetSignal}
      />

      <header className="map-masthead">
        <div>
          <div className="map-masthead__brand">DataOrbit</div>
          <div className="map-masthead__descriptor">NetCDF grid viewer</div>
        </div>
        <span className="map-masthead__divider" aria-hidden="true" />
        <span className="map-masthead__mode">{viewMode === 'globe' ? '3D globe' : '2D map'}</span>
      </header>

      {status === 'ready' && meta ? (
        <div className="map-status map-status--ready" aria-live="polite">
          <span className="map-status__dot" aria-hidden="true" />
          <span>Ready</span>
          <span className="map-status__separator" aria-hidden="true">/</span>
          <span>{meta.pointCount.toLocaleString()} points rendered</span>
        </div>
      ) : null}

      {status === 'idle' ? (
        <div className="map-empty-state" aria-hidden="true">
          <span>No grid loaded</span>
          <small>Drop a NetCDF file or paste a URL</small>
        </div>
      ) : null}

      <Legend meta={meta} />

      <CommandDrawer
        status={status}
        meta={meta}
        error={error}
        parsingFileName={parsingFileName}
        onFile={parse}
        onVariableChange={selectVariable}
        onResetDataset={reset}
        basemap={basemap}
        viewMode={viewMode}
        showNaStateBorders={showNaStateBorders}
        onBasemap={setBasemap}
        onViewMode={setViewMode}
        onShowNaStateBorders={setShowNaStateBorders}
        onResetMapView={resetMapView}
        controls={controls}
        onChange={handleChange}
        activeDestination={activeDestination}
        onDestinationChange={setActiveDestination}
        isOpen={isDrawerOpen}
        onToggle={toggleDrawer}
        openDisclosure={openDisclosure}
        onDisclosureChange={setOpenDisclosure}
      />
    </div>
  )
}
