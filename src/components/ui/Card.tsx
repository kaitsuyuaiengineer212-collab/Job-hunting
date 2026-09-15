import type { ReactNode } from 'react'

export function Card({ children, tone }: { children: ReactNode; tone?: 'accent' | 'critical' | 'warning' | 'good' }) {
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
    <div className="rounded-2xl p-5" style={{ background: bg, color, boxShadow: tone ? undefined : 'var(--shadow-card)' }}>
      {children}
    </div>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-caption2 label-secondary px-1 mb-2">{children}</h2>
}
