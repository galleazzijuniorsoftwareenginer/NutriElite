export type NavIconName =
  | 'home'
  | 'users'
  | 'calendar'
  | 'clipboard'
  | 'cooking'
  | 'book'
  | 'graduation'
  | 'sparkles'
  | 'crown'
  | 'settings'

const PATHS: Record<NavIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6" />
      <path d="M21 20c0-2.8-2-5.2-4.7-5.9" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5.5" y="4.5" width="13" height="17" rx="2" />
      <path d="M9 4.5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v.5" />
      <path d="M8.5 11h7M8.5 15h7M8.5 19h4" />
    </>
  ),
  cooking: (
    <>
      <path d="M4 12h16a1 1 0 0 1 1 1v1a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8v-1a1 1 0 0 1 1-1Z" />
      <path d="M8 12c0-2 .8-3 .8-5S8 4 8 4M12 12c0-2 .8-3 .8-5S12 4 12 4M16 12c0-2 .8-3 .8-5S16 4 16 4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 0 4 23.5" />
      <path d="M4 5.5v16" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 1 2.5 2.5" />
      <path d="M20 5.5v16" />
    </>
  ),
  graduation: (
    <>
      <path d="M2 9 12 4l10 5-10 5-10-5Z" />
      <path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
      <path d="M22 9v6" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3v3M11 15v3M4 9h3M15 9h3M6 6l1.5 1.5M14.5 6 16 4.5" />
      <path d="M11 4 9.4 8 6 9.6 9.4 11.2 11 15.2l1.6-4 3.4-1.6-3.4-1.6L11 4Z" />
    </>
  ),
  crown: (
    <>
      <path d="M3 8.5 7 11l5-6.5L17 11l4-2.5-1.6 9.5a1 1 0 0 1-1 .8H5.6a1 1 0 0 1-1-.8L3 8.5Z" />
      <path d="M7 19.5h10" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V19a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
}

export function NavIcon({ name, size = 17, className }: { name: NavIconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}
