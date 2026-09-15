import { motion, type HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'destructive'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: HTMLMotionProps<'button'> & { variant?: Variant }) {
  const base = 'inline-flex items-center justify-center gap-1.5 text-headline disabled:opacity-40'
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

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`${base} ${variants[variant]} ${className}`}
      style={style}
      {...props}
    />
  )
}
