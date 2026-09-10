import { TICK_VALUES, TICK_COLORS } from './heatmapColors'

const MOBILE_TICKS = [0, 250, 500]

export default function Legend({ meta }) {
  if (!meta) return null

  const title = meta.varName || 'Source field'
  const units = meta.units && meta.units !== '—' ? meta.units : ''
  const isConstant = meta.minValue === meta.maxValue
  const ticks = isConstant ? [0] : TICK_VALUES

  return (
    <section className="source-legend" aria-label="Source value legend">
      <div className="source-legend__heading">
        <div>
          <strong>{title}{units ? <span> · {units}</span> : null}</strong>
          <small>Source values</small>
        </div>
        <span className="source-legend__range">{formatValue(meta.minValue)} — {formatValue(meta.maxValue)}</span>
      </div>
      <div className="source-legend__ramp" aria-hidden="true">
        {TICK_COLORS.map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} />)}
      </div>
      <div className="source-legend__ticks source-legend__ticks--desktop">
        {ticks.map((weight) => <span key={weight}>{formatTick(weight, meta)}</span>)}
      </div>
      <div className="source-legend__ticks source-legend__ticks--mobile">
        {MOBILE_TICKS.map((weight) => <span key={weight}>{formatTick(weight, meta)}</span>)}
      </div>
      <div className="source-legend__footer">
        <span>{isConstant ? 'Constant source range' : 'Colors are normalized from the file minimum → maximum.'}</span>
        <span>Render weight 0–500</span>
      </div>
    </section>
  )
}

function formatTick(weight, meta) {
  if (meta.minValue === meta.maxValue) return formatValue(meta.minValue)
  return formatValue(meta.minValue + (weight / 500) * (meta.maxValue - meta.minValue))
}

function formatValue(value) {
  if (!Number.isFinite(value)) return '—'
  const absolute = Math.abs(value)
  if ((absolute > 0 && absolute < 0.001) || absolute >= 100000) return value.toExponential(3)
  return value.toPrecision(4)
}
