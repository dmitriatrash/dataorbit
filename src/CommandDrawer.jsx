import { Button, Spinner, Switch } from '@heroui/react'
import UploadPanel from './UploadPanel'
import MapViewControls from './MapViewControls'
import ControlPanel from './ControlPanel'
import { BASEMAPS } from './basemaps'

const DESTINATIONS = [
  { id: 'dataset', label: 'Dataset', icon: 'database' },
  { id: 'map', label: 'Map', icon: 'map-2' },
  { id: 'adjust', label: 'Adjust', icon: 'adjustments-horizontal' },
]

export default function CommandDrawer({
  status,
  meta,
  error,
  parsingFileName,
  onFile,
  onVariableChange,
  onResetDataset,
  basemap,
  viewMode,
  showNaStateBorders,
  onBasemap,
  onViewMode,
  onShowNaStateBorders,
  onResetMapView,
  controls,
  onChange,
  activeDestination,
  onDestinationChange,
  isOpen,
  onToggle,
  openDisclosure,
  onDisclosureChange,
}) {
  const currentBasemap = BASEMAPS[basemap]

  return (
    <>
      <aside className={`command-drawer ${isOpen ? 'is-open' : 'is-collapsed'}`} aria-label="DataOrbit command drawer">
        <nav className="command-rail" aria-label="Drawer destinations">
          <span className="command-rail__eyebrow">CMD</span>
          {DESTINATIONS.map((destination) => (
            <button
              key={destination.id}
              type="button"
              className={`command-rail__item ${activeDestination === destination.id ? 'is-active' : ''}`}
              aria-current={activeDestination === destination.id ? 'page' : undefined}
              aria-label={destination.label}
              onClick={() => {
                onDestinationChange(destination.id)
                if (!isOpen) onToggle()
              }}
            >
              <i className={`ti ti-${destination.icon}`} aria-hidden="true" />
              <span>{destination.label}</span>
            </button>
          ))}
          <button type="button" className="command-rail__item command-rail__mobile-reset" onClick={onResetMapView} aria-label="Reset view">
            <i className="ti ti-rotate-ccw" aria-hidden="true" />
            <span>Reset</span>
          </button>
          <div className="command-rail__actions">
            <button type="button" className="command-rail__icon" onClick={onResetMapView} aria-label="Reset view" title="Reset view">
              <i className="ti ti-rotate-ccw" aria-hidden="true" />
            </button>
            <button type="button" className="command-rail__icon" onClick={onToggle} aria-label={isOpen ? 'Hide controls' : 'Show controls'} title={isOpen ? 'Hide controls' : 'Show controls'}>
              <i className={`ti ti-layout-sidebar-${isOpen ? 'right-collapse' : 'right-expand'}`} aria-hidden="true" />
            </button>
          </div>
        </nav>

        <div className="command-drawer__content">
          <div className="command-drawer__mobile-handle" aria-hidden="true" />
          <div className="command-drawer__mobile-header">
            <span>DataOrbit</span>
            <span className="command-drawer__mobile-mode">{viewMode === 'globe' ? '3D globe' : '2D map'}</span>
          </div>
          <div className="command-drawer__mobile-tabs" role="tablist" aria-label="Drawer destinations">
            {DESTINATIONS.map((destination) => (
              <button
                key={destination.id}
                type="button"
                role="tab"
                aria-selected={activeDestination === destination.id}
                className={activeDestination === destination.id ? 'is-active' : ''}
                onClick={() => onDestinationChange(destination.id)}
              >
                {destination.label}
              </button>
            ))}
          </div>

          {activeDestination === 'dataset' && (
            <section className="drawer-section drawer-section--dataset" aria-labelledby="dataset-heading">
              <div className="drawer-section__heading">
                <div>
                  <span className="drawer-kicker">Dataset · {status}</span>
                  <h2 id="dataset-heading">{status === 'ready' && meta ? 'Dataset readout' : status === 'error' ? 'Couldn’t read file' : status === 'parsing' ? 'Reading dataset' : 'Open file'}</h2>
                </div>
                {status === 'ready' && meta ? (
                  <Button size="sm" variant="light" onPress={onResetDataset} className="drawer-quiet-button">Clear</Button>
                ) : null}
              </div>
              <UploadPanel
                status={status}
                meta={meta}
                error={error}
                parsingFileName={parsingFileName}
                onFile={onFile}
                onVariableChange={onVariableChange}
                onReset={onResetDataset}
              />
            </section>
          )}

          {activeDestination === 'map' && (
            <section className="drawer-section" aria-labelledby="map-heading">
              <div className="drawer-section__heading">
                <div>
                  <span className="drawer-kicker">Map · current view</span>
                  <h2 id="map-heading">Map commands</h2>
                </div>
                <span className="drawer-section__value">{currentBasemap?.label}</span>
              </div>
              <MapViewControls
                basemap={basemap}
                viewMode={viewMode}
                showNaStateBorders={showNaStateBorders}
                onBasemap={onBasemap}
                onViewMode={onViewMode}
                onShowNaStateBorders={onShowNaStateBorders}
                onResetMapView={onResetMapView}
              />
            </section>
          )}

          {activeDestination === 'adjust' && (
            <section className="drawer-section drawer-section--adjust" aria-labelledby="adjust-heading">
              <div className="drawer-section__heading">
                <div>
                  <span className="drawer-kicker">Adjust · live output</span>
                  <h2 id="adjust-heading">Rendering controls</h2>
                </div>
                <span className="drawer-section__value drawer-section__value--live">Live</span>
              </div>
              <ControlPanel
                {...controls}
                layerMode={meta?.layerMode}
                onChange={onChange}
                openDisclosure={openDisclosure}
                onDisclosureChange={onDisclosureChange}
              />
            </section>
          )}
        </div>
      </aside>

      {status === 'parsing' ? (
        <div className="map-status map-status--loading" role="status" aria-live="polite" aria-busy="true">
          <Spinner size="sm" color="warning" />
          <span>{parsingFileName ? `Reading ${parsingFileName}` : 'Reading variables and sampling the grid.'}</span>
        </div>
      ) : null}
    </>
  )
}
