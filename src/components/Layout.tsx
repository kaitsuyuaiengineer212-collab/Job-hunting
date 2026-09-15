import type { ReactNode } from 'react'
import { Home, Dumbbell, ChartColumnBig, ClipboardList } from './ui/icons'

export type TabKey = 'today' | 'record' | 'progress' | 'menu'

const TABS: { key: TabKey; label: string; Icon: typeof Home }[] = [
  { key: 'today', label: 'Today', Icon: Home },
  { key: 'record', label: 'Record', Icon: Dumbbell },
  { key: 'progress', label: 'Progress', Icon: ChartColumnBig },
  { key: 'menu', label: 'Menu', Icon: ClipboardList },
]

export function Layout({
  active,
  onChange,
  children,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
  children: ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <main className="flex-1 pb-32">{children}</main>
      <nav
        className="fixed bottom-0 inset-x-0 backdrop-blur-xl"
        style={{ background: 'var(--glass-bg)', borderTop: '1px solid var(--separator)' }}
      >
        <div className="max-w-md mx-auto grid grid-cols-4 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                onClick={() => onChange(key)}
                className="flex flex-col items-center gap-1 active:opacity-70"
                style={{ minHeight: 56 }}
              >
                <span
                  className="flex items-center justify-center rounded-2xl transition-colors"
                  style={{
                    width: 52,
                    height: 34,
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--label-tertiary)',
                  }}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.3 : 1.8} />
                </span>
                <span
                  className="text-caption1 normal-case tracking-normal"
                  style={{ fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--accent)' : 'var(--label-secondary)' }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-5">
      <h1 className="text-large-title label pt-7 pb-5">{title}</h1>
      <div className="flex flex-col gap-8 pb-4">{children}</div>
    </div>
  )
}
