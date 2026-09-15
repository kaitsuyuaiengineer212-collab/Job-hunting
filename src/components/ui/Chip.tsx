export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-subhead font-medium rounded-full px-4 shrink-0 active:scale-[0.96] transition-transform"
      style={{
        height: 36,
        background: active ? 'var(--accent)' : 'var(--fill-secondary)',
        color: active ? 'var(--accent-on)' : 'var(--label)',
      }}
    >
      {children}
    </button>
  )
}
