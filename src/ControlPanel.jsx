import { CardRoot, CardContent, Slider } from '@heroui/react'

export default function ControlPanel({ radius, detailBoost, maxPoints, noSmoothing, intensity, opacity, boundaryOpacity, layerMode, onChange }) {
  const smoothingHint = noSmoothing
    ? 'Raw kernel: uses your radius in pixels only (no zoom curve, no grid overlap floor). Expect visible dots if the kernel is smaller than sample spacing.'
    : layerMode === 'grid'
      ? 'Structured grid: adjusts heatmap blur. Values are sampled at cell centers (subsampled on huge grids).'
      : 'Heatmap mode: small values use a minimum blur so the grid does not break into separate dots.'
  const detailHint = noSmoothing
    ? 'Turn off “No smoothing” to use detail boost with the adaptive blur curve.'
    : 'Lowers minimum blur at every zoom and tightens grid overlap so small features read sharper before dotting.'
  const resolutionHint =
    'Draws more grid cells for higher detail. Large values increase memory and can slow the map.'

  return (
    <CardRoot className="bg-black/70 border border-white/15 backdrop-blur-md rounded-xl">
      <CardContent className="p-4 flex flex-col gap-5">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-black/40 text-orange-500 focus:ring-orange-400/50"
            checked={noSmoothing}
            onChange={(e) => {
              const next = e.target.checked
              onChange('noSmoothing', next)
              if (!next && radius < 2) onChange('radius', 2)
            }}
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-xs tracking-widest uppercase text-white/70">No smoothing</span>
            <span className="text-[10px] leading-snug text-white/40">
              Heatmap uses only the radius slider (min 1px). MapLibre still applies its kernel; this removes extra floors and zoom shaping.
            </span>
          </span>
        </label>
        <SliderRow
          label="Smoothing Radius"
          hint={smoothingHint}
          unit="px"
          min={noSmoothing ? 1 : 2}
          max={80}
          step={0.5}
          value={radius}
          onChange={v => onChange('radius', v)}
          fmt={v => v.toFixed(1)}
          disabled={noSmoothing}
        />
        <SliderRow
          label="Detail Boost"
          hint={detailHint}
          unit=""
          min={0}
          max={1}
          step={0.05}
          value={detailBoost}
          onChange={v => onChange('detailBoost', v)}
          fmt={v => v.toFixed(2)}
          disabled={noSmoothing}
        />
        <SliderRow
          label="Max Points"
          hint={resolutionHint}
          unit=""
          min={20_000}
          max={250_000}
          step={5_000}
          value={maxPoints}
          onChange={v => onChange('maxPoints', v)}
          fmt={v => `${Math.round(v / 1000)}k`}
        />
        <SliderRow
          label="Intensity"
          unit=""
          min={0.1}
          max={4}
          step={0.02}
          value={intensity}
          onChange={v => onChange('intensity', v)}
          fmt={v => v.toFixed(2)}
        />
        <SliderRow label="Layer Opacity"    unit="%"   min={10}  max={100} step={1}   value={opacity}         onChange={v => onChange('opacity', v)} />
        <SliderRow label="Boundary Opacity" unit="%"   min={0}   max={100} step={1}   value={boundaryOpacity} onChange={v => onChange('boundaryOpacity', v)} />
      </CardContent>
    </CardRoot>
  )
}

function SliderRow({ label, hint, unit, min, max, step, value, onChange, fmt, disabled = false }) {
  const display = fmt ? fmt(value) : Math.round(value)
  const handleChange = (v) => {
    if (typeof v === 'number') {
      onChange(v)
      return
    }
    if (Array.isArray(v) && typeof v[0] === 'number') {
      onChange(v[0])
    }
  }
  return (
    <div className={`flex flex-col gap-2 ${disabled ? 'opacity-45 pointer-events-none' : ''}`}>
      <div className="flex justify-between items-center">
        <span className="text-xs tracking-widest uppercase text-white/60">{label}</span>
        <span className="text-sm font-mono text-orange-300 tabular-nums">{display}{unit}</span>
      </div>
      {hint ? (
        <p className="text-[10px] leading-snug text-white/40 -mt-0.5">{hint}</p>
      ) : null}
      <Slider
        aria-label={label}
        minValue={min}
        maxValue={max}
        step={step}
        value={value}
        onChange={handleChange}
        isDisabled={disabled}
        className="w-full"
      >
        <Slider.Track className="relative h-0.5 w-full rounded-full bg-white/20">
          <Slider.Fill className="absolute h-full rounded-full bg-orange-500" />
          <Slider.Thumb className="size-3 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)] focus:outline-none focus:shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
        </Slider.Track>
      </Slider>
    </div>
  )
}
