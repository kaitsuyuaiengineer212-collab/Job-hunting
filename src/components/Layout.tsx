import type { ReactNode } from 'react'

export type TabKey = 'record' | 'history' | 'charts' | 'menu' | 'dashboard'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'record', label: '記録' },
  { key: 'history', label: '履歴' },
  { key: 'charts', label: 'グラフ' },
  { key: 'menu', label: 'メニュー' },
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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <h1 className="text-lg font-bold">💪 筋トレログ</h1>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`py-2 text-xs font-medium ${
                active === tab.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
