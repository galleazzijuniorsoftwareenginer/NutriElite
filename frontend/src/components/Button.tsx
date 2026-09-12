import { type ButtonHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'text-white border-transparent shadow-glow hover:brightness-110 [background:linear-gradient(120deg,var(--color-accent),var(--color-accent-dark))]',
  ai: 'text-white border-transparent shadow-glow hover:brightness-110 [background:linear-gradient(120deg,var(--color-glow-violet),var(--color-glow-cyan))]',
  secondary: 'bg-surface text-text border-border-strong hover:bg-bg',
  ghost: 'bg-transparent text-text-2 border-transparent hover:bg-bg hover:text-text',
  danger: 'bg-danger text-white border-danger hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-md border font-semibold',
          'transition-[color,background-color,border-color,box-shadow,filter,transform] duration-150',
          'touch-manipulation focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 active:scale-[0.98]',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...rest}
      >
        {loading && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
