import { TICK_VALUES, TICK_COLORS } from './heatmapColors'

export default function Legend({ meta }) {
  const title = meta?.varName
    ? `${meta.varName}${meta.units && meta.units !== '—' ? ` — ${meta.units}` : ''}`
    : 'Scalar field'

  return (
    <div className="
      absolute bottom-6 left-1/2 -translate-x-1/2
      bg-black/80 border border-white/15 backdrop-blur-md
      rounded-lg px-4 py-3
      pointer-events-none
    ">
      <p className="text-xs tracking-widest uppercase text-white/70 text-center mb-2">
        {title}
      </p>
      <p className="text-[11px] tracking-widest uppercase text-white/50 text-center mb-2 font-mono">
        Heatmap weight 0–500 (normalized from file min–max)
      </p>
      <div className="flex h-2.5 rounded overflow-hidden" style={{ width: 520 }}>
        {TICK_COLORS.map((color, i) => (
          <div key={i} className="flex-1" style={{ background: color }} />
        ))}
      </div>
      <div className="flex justify-between mt-1" style={{ width: 520 }}>
        {TICK_VALUES.map(v => (
          <span key={v} className="text-[10px] text-white/55 font-mono">{v}</span>
        ))}
      </div>
    </div>
  )
}
