import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function Chip({
  active,
  onClick,
  tone,
  children,
}: {
  active?: boolean
  onClick?: () => void
  tone?: string
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className="text-subhead font-medium rounded-full pl-3.5 pr-4 shrink-0 transition-colors duration-200 inline-flex items-center gap-2"
      style={{
        height: 38,
        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
        color: active ? 'var(--accent-on)' : 'var(--label)',
        border: active ? '1px solid transparent' : '1px solid var(--separator)',
        boxShadow: active ? '0 6px 14px -6px var(--accent)' : 'var(--shadow-card)',
      }}
    >
      {tone && !active && <span style={{ width: 7, height: 7, borderRadius: 99, background: tone, flexShrink: 0 }} />}
      {children}
    </motion.button>
  )
}
