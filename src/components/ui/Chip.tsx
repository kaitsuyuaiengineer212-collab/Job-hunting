import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className="text-subhead font-medium rounded-full px-4 shrink-0 transition-colors duration-200"
      style={{
        height: 36,
        background: active ? 'var(--accent)' : 'var(--fill-secondary)',
        color: active ? 'var(--accent-on)' : 'var(--label)',
      }}
    >
      {children}
    </motion.button>
  )
}
