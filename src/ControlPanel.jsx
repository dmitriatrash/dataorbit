import { Slider, Switch } from '@heroui/react'

const GROUPS = [
  { id: 'resolution', label: 'Resolution', summary: (props) => `${Math.round(props.maxPoints / 1000)}k points` },
  { id: 'surface', label: 'Surface', summary: (props) => `${props.radius.toFixed(1)}px · ${props.noSmoothing ? 'raw' : 'adaptive'}` },
  { id: 'layer', label: 'Layer', summary: (props) => `${props.intensity.toFixed(2)} · ${props.opacity}%` },
]

export default function ControlPanel({
  radius,
  detailBoost,
  maxPoints,
  noSmoothing,
  intensity,
  opacity,
  boundaryOpacity,
  layerMode,
  onChange,
  openDisclosure,
  onDisclosureChange,
}) {
  const smoothingHint = noSmoothing
    ? 'Raw kernel: radius only. MapLibre still applies its base kernel.'
    : layerMode === 'grid'
      ? 'Structured grid: blur is sampled from cell spacing to avoid visible gaps.'
      : 'Adaptive blur keeps small values from breaking into separate dots.'
  const detailHint = noSmoothing
    ? 'Turn off No smoothing to use the adaptive detail curve.'
    : 'Tightens overlap at higher zooms so smaller features stay readable.'
  const resolutionHint = 'Higher budgets draw more cells but can increase memory use.'
  const props = { radius, detailBoost, maxPoints, noSmoothing, intensity, opacity, boundaryOpacity }

  return (
    <div className="adjust-panel">
      {GROUPS.map((group) => {
        const isOpen = openDisclosure === group.id
        return (
          <section key={group.id} className={`adjust-group ${isOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="adjust-group__trigger"
              aria-expanded={isOpen}
              aria-controls={`adjust-${group.id}`}
              onClick={() => onDisclosureChange(isOpen ? null : group.id)}
            >
              <span>
                <strong>{group.label}</strong>
                <small>{group.summary(props)}</small>
              </span>
              <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true" />
            </button>
            {isOpen ? (
              <div id={`adjust-${group.id}`} className="adjust-group__content">
                {group.id === 'resolution' ? (
                  <SliderRow label="Maximum points" hint={resolutionHint} min={20_000} max={250_000} step={5_000} value={maxPoints} onChange={(value) => onChange('maxPoints', value)} fmt={(value) => Math.round(value).toLocaleString()} endpoints={['20k', '250k']} />
                ) : null}
                {group.id === 'surface' ? (
                  <>
                    <div className="adjust-toggle-row">
                      <div>
                        <span className="adjust-label">No smoothing</span>
                        <small>Use the raw radius without adaptive floors.</small>
                      </div>
                      <Switch isSelected={noSmoothing} onValueChange={(value) => { onChange('noSmoothing', value); if (!value && radius < 2) onChange('radius', 2) }} size="sm" color="warning" aria-label="No smoothing" />
                    </div>
                    <SliderRow label="Smoothing radius" hint={smoothingHint} min={noSmoothing ? 1 : 2} max={80} step={0.5} value={radius} onChange={(value) => onChange('radius', value)} fmt={(value) => value.toFixed(1)} unit="px" disabled={noSmoothing} endpoints={['1', '80']} />
                    <SliderRow label="Detail boost" hint={detailHint} min={0} max={1} step={0.05} value={detailBoost} onChange={(value) => onChange('detailBoost', value)} fmt={(value) => value.toFixed(2)} disabled={noSmoothing} endpoints={['0', '1']} />
                  </>
                ) : null}
                {group.id === 'layer' ? (
                  <>
                    <SliderRow label="Intensity" min={0.1} max={4} step={0.02} value={intensity} onChange={(value) => onChange('intensity', value)} fmt={(value) => value.toFixed(2)} endpoints={['0.1', '4']} />
                    <SliderRow label="Layer opacity" min={10} max={100} step={1} value={opacity} onChange={(value) => onChange('opacity', value)} fmt={(value) => Math.round(value)} unit="%" endpoints={['10%', '100%']} />
                    <SliderRow label="Boundary opacity" min={0} max={100} step={1} value={boundaryOpacity} onChange={(value) => onChange('boundaryOpacity', value)} fmt={(value) => Math.round(value)} unit="%" endpoints={['0%', '100%']} />
                  </>
                ) : null}
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

function SliderRow({ label, hint, min, max, step, value, onChange, fmt, unit = '', disabled = false, endpoints }) {
  const handleChange = (next) => onChange(typeof next === 'number' ? next : next?.[0])
  return (
    <div className={`slider-row ${disabled ? 'is-disabled' : ''}`}>
      <div className="slider-row__heading">
        <span>{label}</span>
        <strong>{fmt(value)}{unit}</strong>
      </div>
      {hint ? <p>{hint}</p> : null}
      <Slider aria-label={label} minValue={min} maxValue={max} step={step} value={value} onChange={handleChange} isDisabled={disabled} className="dataorbit-slider">
        <Slider.Track className="dataorbit-slider__track">
          <Slider.Fill className="dataorbit-slider__fill" />
          <Slider.Thumb className="dataorbit-slider__thumb" />
        </Slider.Track>
      </Slider>
      {endpoints ? <div className="slider-row__endpoints"><span>{endpoints[0]}</span><span>{endpoints[1]}</span></div> : null}
    </div>
  )
}
