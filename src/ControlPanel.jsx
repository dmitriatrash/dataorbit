import { CardRoot, CardContent, SliderRoot, SliderTrack, SliderFill, SliderThumb } from '@heroui/react'

export default function ControlPanel({ radius, intensity, opacity, boundaryOpacity, onChange }) {
  return (
    <CardRoot className="bg-black/70 border border-white/15 backdrop-blur-md rounded-xl">
      <CardContent className="p-4 flex flex-col gap-5">
        <SliderRow label="Smoothing Radius" unit="px"  min={2}   max={80}  step={1}   value={radius}          onChange={v => onChange('radius', v)} />
        <SliderRow label="Intensity"        unit=""    min={0.1} max={4}   step={0.1} value={intensity}       onChange={v => onChange('intensity', v)} fmt={v=>v.toFixed(1)} />
        <SliderRow label="Layer Opacity"    unit="%"   min={10}  max={100} step={1}   value={opacity}         onChange={v => onChange('opacity', v)} />
        <SliderRow label="Boundary Opacity" unit="%"   min={0}   max={100} step={1}   value={boundaryOpacity} onChange={v => onChange('boundaryOpacity', v)} />
      </CardContent>
    </CardRoot>
  )
}

function SliderRow({ label, unit, min, max, step, value, onChange, fmt }) {
  const display = fmt ? fmt(value) : Math.round(value)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs tracking-widest uppercase text-white/60">{label}</span>
        <span className="text-sm font-mono text-orange-300 tabular-nums">{display}{unit}</span>
      </div>
      <SliderRoot
        aria-label={label}
        minValue={min}
        maxValue={max}
        step={step}
        value={value}
        onChange={onChange}
        className="relative flex items-center w-full h-4 cursor-pointer"
      >
        <SliderTrack className="relative w-full h-0.5 rounded-full bg-white/20 grow">
          <SliderFill className="absolute h-full rounded-full bg-orange-500" />
        </SliderTrack>
        <SliderThumb
          index={0}
          className="block w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)] focus:outline-none focus:shadow-[0_0_12px_rgba(251,146,60,0.8)] transition-shadow"
        />
      </SliderRoot>
    </div>
  )
}
