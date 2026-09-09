import clsx from 'clsx'

type Tone = 'accent' | 'blue' | 'warn' | 'danger' | 'neutral'

const toneClasses: Record<Tone, string> = {
  accent: 'bg-accent-light text-accent',
  blue: 'bg-accent-2-light text-accent-2',
  warn: 'bg-warn-light text-warn',
  danger: 'bg-danger-light text-danger',
  neutral: 'bg-bg text-text-2',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  )
}
