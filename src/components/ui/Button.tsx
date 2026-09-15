import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'destructive'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'inline-flex items-center justify-center gap-1.5 text-headline transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100'
  const variants: Record<Variant, string> = {
    primary: 'rounded-full px-6 py-3',
    secondary: 'rounded-full px-5 py-2.5',
    destructive: 'px-1 py-2 text-[15px] font-normal',
  }
  const style =
    variant === 'primary'
      ? { background: 'var(--accent)', color: 'var(--accent-on)' }
      : variant === 'secondary'
        ? { background: 'var(--accent-soft)', color: 'var(--accent-strong)' }
        : { color: 'var(--critical)' }

  return <button className={`${base} ${variants[variant]} ${className}`} style={style} {...props} />
}
