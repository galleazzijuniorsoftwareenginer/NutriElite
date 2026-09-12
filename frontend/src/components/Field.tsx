import { type InputHTMLAttributes, type SelectHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface FieldWrapProps {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}

export function FieldWrap({ label, hint, error, children }: FieldWrapProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-2">{label}</span>
      {children}
      {hint && !error && <span className="text-[11px] text-text-3">{hint}</span>}
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </label>
  )
}

const inputBase =
  'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-3 outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={clsx(inputBase, className)} {...rest} />
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={clsx(inputBase, 'appearance-none', className)} {...rest}>
      {children}
    </select>
  )
)
Select.displayName = 'Select'
