import type { ReactNode } from 'react'
import { ChevronRight } from './icons'

export function GroupedList({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-grouped)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  )
}

export function Row({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  chevron,
  last,
  wrap,
}: {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  chevron?: boolean
  last?: boolean
  wrap?: boolean
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex gap-3 px-4 py-3 text-left min-h-[44px] ${wrap ? 'items-start' : 'items-center'} ${onClick ? 'active:opacity-60' : ''}`}
      style={{ borderBottom: last ? 'none' : '1px solid var(--separator)' }}
    >
      {icon && (
        <span
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 30, height: 30, marginTop: wrap ? 2 : 0, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className={`text-body label block ${wrap ? '' : 'truncate'}`}>{title}</span>
        {subtitle && <span className={`text-footnote label-secondary block ${wrap ? '' : 'truncate'}`}>{subtitle}</span>}
      </span>
      {trailing && <span className="text-subhead label-secondary shrink-0">{trailing}</span>}
      {chevron && <ChevronRight size={16} className="label-tertiary shrink-0 mt-1" />}
    </Tag>
  )
}
