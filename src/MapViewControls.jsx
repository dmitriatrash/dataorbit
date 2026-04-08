import { CardRoot, CardContent } from '@heroui/react'
import { BASEMAP_IDS, BASEMAPS } from './basemaps'
import { NATURAL_EARTH_ATTRIBUTION } from './naStateBoundaries'

const btnBase =
  'px-2.5 py-2 rounded-lg text-xs tracking-wide uppercase transition-colors border'
const btnInactive =
  'bg-white/[0.07] text-white/70 border-white/15 hover:bg-white/12 hover:text-white/90'
const btnActive =
  'bg-orange-500/25 text-orange-200 border-orange-500/55'

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
    <CardRoot className="bg-black/70 border border-white/15 backdrop-blur-md rounded-xl">
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span id="basemap-label" className="text-xs tracking-widest uppercase text-white/60">
            Map style
          </span>
          <div
            role="group"
            aria-labelledby="basemap-label"
            className="flex flex-wrap gap-1.5"
          >
            {BASEMAP_IDS.map(id => (
              <button
                key={id}
                type="button"
                onClick={() => onBasemap(id)}
                className={`
                  flex-1 min-w-[4.75rem] ${btnBase}
                  ${basemap === id ? btnActive : btnInactive}
                `}
              >
                {BASEMAPS[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span id="viewmode-label" className="text-xs tracking-widest uppercase text-white/60">
            View
          </span>
          <div
            role="group"
            aria-labelledby="viewmode-label"
            className="flex gap-1.5"
          >
            <button
              type="button"
              onClick={() => onViewMode('mercator')}
              className={`
                flex-1 ${btnBase}
                ${viewMode === 'mercator' ? btnActive : btnInactive}
              `}
            >
              2D
            </button>
            <button
              type="button"
              onClick={() => onViewMode('globe')}
              className={`
                flex-1 ${btnBase}
                ${viewMode === 'globe' ? btnActive : btnInactive}
              `}
            >
              3D globe
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResetMapView}
            className="w-full px-2.5 py-2.5 rounded-lg text-xs font-medium tracking-wide uppercase border border-white/20 bg-white/[0.08] text-white/90 hover:bg-white/14 hover:border-white/30 transition-colors"
          >
            Reset map view
          </button>
          <p className="text-[11px] text-white/45 leading-snug">
            Returns pan, zoom, tilt, and rotation to the default.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
          <span id="na-states-label" className="text-xs tracking-widest uppercase text-white/60">
            US / CA / MX — state and province lines
          </span>
          <div
            role="group"
            aria-labelledby="na-states-label"
            className="flex gap-1.5"
          >
            <button
              type="button"
              aria-pressed={showNaStateBorders}
              onClick={() => onShowNaStateBorders(true)}
              className={`
                  flex-1 ${btnBase}
                  ${showNaStateBorders ? btnActive : btnInactive}
                `}
            >
              Show
            </button>
            <button
              type="button"
              aria-pressed={!showNaStateBorders}
              onClick={() => onShowNaStateBorders(false)}
              className={`
                  flex-1 ${btnBase}
                  ${!showNaStateBorders ? btnActive : btnInactive}
                `}
            >
              Hide
            </button>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed font-mono">
            {NATURAL_EARTH_ATTRIBUTION}
          </p>
        </div>

        <p className="text-[10px] text-white/45 leading-relaxed font-mono border-t border-white/10 pt-3">
          {BASEMAPS[basemap].attribution}
        </p>
      </CardContent>
    </CardRoot>
  )
}
