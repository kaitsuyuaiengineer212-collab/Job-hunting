import { Minus, Plus } from './icons'

export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  unit,
  decimals = 0,
  label,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
  unit: string
  decimals?: number
  label: string
}) {
  const round = (n: number) => Number(n.toFixed(decimals))
  return (
    <div className="inline-flex items-center rounded-xl overflow-hidden" style={{ background: 'var(--fill-secondary)' }}>
      <button
        type="button"
        aria-label={`Decrease ${label} by ${step}${unit}`}
        onClick={() => onChange(Math.max(min, round(value - step)))}
        className="flex items-center justify-center active:opacity-50"
        style={{ width: 44, height: 44, color: 'var(--accent-strong)' }}
      >
        <Minus size={18} />
      </button>
      <span className="text-headline label text-center tabular-nums" style={{ minWidth: 56 }}>
        {value.toFixed(decimals)}
        <span className="text-footnote label-secondary ml-0.5">{unit}</span>
      </span>
      <button
        type="button"
        aria-label={`Increase ${label} by ${step}${unit}`}
        onClick={() => onChange(round(value + step))}
        className="flex items-center justify-center active:opacity-50"
        style={{ width: 44, height: 44, color: 'var(--accent-strong)' }}
      >
        <Plus size={18} />
      </button>
    </div>
  )
}
