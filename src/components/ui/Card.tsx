import type { CSSProperties, ReactNode } from 'react'

type CardTone = 'accent' | 'critical' | 'warning' | 'good'

interface CardProps {
  children: ReactNode
  tone?: CardTone
  padding?: 'p-3' | 'p-4' | 'p-5'
  className?: string
  style?: CSSProperties
}

export function Card({ children, tone, padding = 'p-5', className = '', style }: CardProps) {
  const bg =
    tone === 'accent'
      ? 'var(--accent)'
      : tone === 'critical'
        ? 'var(--critical-soft)'
        : tone === 'warning'
          ? 'var(--warning-soft)'
          : tone === 'good'
            ? 'var(--good-soft)'
            : 'var(--bg-elevated)'
  const color = tone === 'accent' ? 'var(--accent-on)' : 'var(--label)'
  return (
    <div className={`rounded-2xl ${padding} ${className}`} style={{ background: bg, color, boxShadow: tone ? undefined : 'var(--shadow-card)', ...style }}>
      {children}
    </div>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-caption2 label-secondary px-1 mb-2">{children}</h2>
}
