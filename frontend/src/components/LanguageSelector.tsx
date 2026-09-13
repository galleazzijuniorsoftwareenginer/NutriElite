import { useEffect, useRef, useState } from 'react'

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'nutrielite_locale'

export function getStoredLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored as LanguageCode
  } catch {
    // localStorage indisponible (modo privado, etc.) — usa el default
  }
  return 'es'
}

// Selector visual de idioma para pantallas de auth — la elección persiste,
// pero todavía no traduce el resto de la app (eso es un bloque aparte).
export function LanguageSelector({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<LanguageCode>(getStoredLanguage)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function select(code: LanguageCode) {
    setLang(code)
    setOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // sin persistencia disponible — la sesión sigue funcionando igual
    }
  }

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          dark
            ? 'border-white/15 bg-white/5 text-deep-text-2 hover:text-deep-text'
            : 'border-border bg-surface text-text-2 hover:text-text'
        }`}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-10 mt-1.5 w-36 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-float"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                onClick={() => select(l.code)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors ${
                  l.code === lang ? 'bg-accent-light text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
                }`}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
