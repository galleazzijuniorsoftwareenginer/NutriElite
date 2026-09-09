import clsx from 'clsx'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 font-display font-semibold', className)}>
      <span className="h-2 w-2 rounded-full bg-accent" />
      <span className="text-accent">Nutri</span>
      <span className="text-text -ml-1.5">Elite</span>
    </span>
  )
}
