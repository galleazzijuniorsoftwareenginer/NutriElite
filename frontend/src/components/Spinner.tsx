import clsx from 'clsx'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block h-5 w-5 rounded-full border-2 border-border-strong border-t-accent animate-spin',
        className
      )}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
