import { motion, AnimatePresence } from 'framer-motion'
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
      <motion.button
        type="button"
        aria-label={`Decrease ${label} by ${step}${unit}`}
        onClick={() => onChange(Math.max(min, round(value - step)))}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        className="flex items-center justify-center"
        style={{ width: 44, height: 44, color: 'var(--accent-strong)' }}
      >
        <Minus size={18} />
      </motion.button>
      <span className="text-headline label text-center tabular-nums overflow-hidden" style={{ minWidth: 56 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-block"
          >
            {value.toFixed(decimals)}
          </motion.span>
        </AnimatePresence>
        <span className="text-footnote label-secondary ml-0.5">{unit}</span>
      </span>
      <motion.button
        type="button"
        aria-label={`Increase ${label} by ${step}${unit}`}
        onClick={() => onChange(round(value + step))}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        className="flex items-center justify-center"
        style={{ width: 44, height: 44, color: 'var(--accent-strong)' }}
      >
        <Plus size={18} />
      </motion.button>
    </div>
  )
}
