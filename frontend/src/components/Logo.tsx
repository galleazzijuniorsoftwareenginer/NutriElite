import clsx from 'clsx'

let uid = 0

export function LogoMark({ size = 32, animated = false }: { size?: number; animated?: boolean }) {
  const id = (uid++).toString()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`badge-${id}`} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2a2158" />
          <stop offset="1" stopColor="#0d0a24" />
        </linearGradient>
        <linearGradient id={`ring-${id}`} x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9f8bff" />
          <stop offset="1" stopColor="#29e0ce" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#badge-${id})`} />
      <circle cx="32" cy="32" r="14" stroke={`url(#ring-${id})`} strokeWidth="2.2" fill="none" opacity="0.95" />
      <circle cx="32" cy="32" r="20.5" stroke={`url(#ring-${id})`} strokeWidth="1.3" fill="none" opacity="0.4" />
      <circle cx="32" cy="18" r="2.7" fill="#29e0ce" />
      <circle cx="45.5" cy="32" r="2.7" fill="#9f8bff" />
      <circle cx="32" cy="45.5" r="2.7" fill="#9f8bff" />
      <circle cx="32" cy="32" r="3.6" fill="#f5f3ff" className={animated ? 'nx-pulse' : undefined} />
    </svg>
  )
}

export function Logo({ className, size = 26, dark = false }: { className?: string; size?: number; dark?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2 font-display font-bold', className)}>
      <LogoMark size={size} />
      <span className="tracking-tight" style={{ fontSize: size * 0.62 }}>
        <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(120deg,#9f8bff,#29e0ce)' }}>
          Nutri
        </span>
        <span className={dark ? 'text-white' : 'text-text'}>Elite</span>
      </span>
    </span>
  )
}
