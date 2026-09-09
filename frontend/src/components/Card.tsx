import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'deep'
}

export function Card({ className, variant = 'default', ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        variant === 'default' &&
          'bg-surface border border-border rounded-lg p-6 shadow-card',
        variant === 'deep' &&
          'aurora-bg rounded-lg p-6 text-deep-text border border-white/10 shadow-float relative overflow-hidden',
        className
      )}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('mb-4 flex items-center justify-between', className)} {...rest} />
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={clsx('text-sm font-semibold text-text', className)} {...rest} />
}
