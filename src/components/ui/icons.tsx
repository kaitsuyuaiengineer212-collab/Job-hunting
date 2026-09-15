export {
  Home,
  Dumbbell,
  ChartColumnBig,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  X,
  Flame,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus as TrendFlat,
} from 'lucide-react'

export function FlagDot({ tone = 'critical', className }: { tone?: 'critical' | 'warning' | 'good' | 'info'; className?: string }) {
  const color = tone === 'critical' ? 'var(--critical)' : tone === 'warning' ? 'var(--warning)' : tone === 'info' ? 'var(--accent)' : 'var(--good)'
  return <span className={className} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 99, background: color, flexShrink: 0 }} />
}
