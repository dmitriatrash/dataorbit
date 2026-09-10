import { Button } from '@heroui/react'
import { BASEMAP_IDS, BASEMAPS } from './basemaps'
import { NATURAL_EARTH_ATTRIBUTION } from './naStateBoundaries'

export default function MapViewControls({
  basemap,
  viewMode,
  showNaStateBorders,
  onBasemap,
  onViewMode,
  onShowNaStateBorders,
  onResetMapView,
}) {
  return (
    <div className="map-panel">
      <div className="map-command-row map-command-row--projection">
        <span className="map-command-row__label">Projection</span>
        <div className="choice-group" role="group" aria-label="Projection">
          <button type="button" aria-pressed={viewMode === 'globe'} className={viewMode === 'globe' ? 'is-selected' : ''} onClick={() => onViewMode('globe')}>3D globe</button>
          <button type="button" aria-pressed={viewMode === 'mercator'} className={viewMode === 'mercator' ? 'is-selected' : ''} onClick={() => onViewMode('mercator')}>2D map</button>
        </div>
      </div>

      <div className="map-command-row">
        <span className="map-command-row__label">Map style</span>
        <div className="map-style-options" role="group" aria-label="Map style">
          {BASEMAP_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={basemap === id} className={basemap === id ? 'is-selected' : ''} onClick={() => onBasemap(id)}>
              {BASEMAPS[id].label === 'Topographic' ? 'Topo' : BASEMAPS[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="map-command-row">
        <span className="map-command-row__label">State / province lines</span>
        <div className="choice-group" role="group" aria-label="State and province lines">
          <button type="button" aria-pressed={!showNaStateBorders} className={!showNaStateBorders ? 'is-selected' : ''} onClick={() => onShowNaStateBorders(false)}>Off</button>
          <button type="button" aria-pressed={showNaStateBorders} className={showNaStateBorders ? 'is-selected' : ''} onClick={() => onShowNaStateBorders(true)}>On</button>
        </div>
      </div>

      <div className="map-command-row map-command-row--reset">
        <Button variant="light" onPress={onResetMapView} className="map-reset-button" startContent={<i className="ti ti-rotate-ccw" aria-hidden="true" />}>Reset view</Button>
        <p>Returns pan, zoom, tilt, and rotation to the default.</p>
      </div>

      <div className="map-attribution">
        <p>{BASEMAPS[basemap].attribution}</p>
        <p>{NATURAL_EARTH_ATTRIBUTION}</p>
      </div>
    </div>
  )
}
