import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo } from '../components/Logo'
import { Badge } from '../components/Badge'
import { OnboardingModal } from '../components/OnboardingModal'
import { useAuthStore } from '../store/authStore'

const NAV_ITEMS: { to: string; label: string; end: boolean }[] = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/pacientes', label: 'Pacientes', end: false },
  { to: '/plan/nuevo', label: 'Nuevo plan', end: false },
  { to: '/agenda', label: 'Agenda', end: false },
  { to: '/salon', label: 'Salón de clase', end: false },
]

const RESOURCE_ITEMS: { to: string; label: string; end: boolean }[] = [
  { to: '/plantillas', label: 'Plantillas', end: false },
  { to: '/recetas', label: 'Recetas', end: false },
  { to: '/referencia', label: 'Referencia', end: false },
]

export function AppShell() {
  const { username, isPro, role, logout, firstLogin, setProfile } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(firstLogin)
  const resourcesActive = RESOURCE_ITEMS.some((r) => location.pathname.startsWith(r.to))

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initial = (username || '?').slice(0, 1).toUpperCase()

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
        <div className="flex items-center gap-8">
          <Logo size={26} />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.slice(0, 4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span
                        className="absolute inset-x-2 -bottom-[9px] h-[2.5px] rounded-full"
                        style={{ background: 'linear-gradient(90deg,var(--color-accent),var(--color-glow-cyan))' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            <div className="relative">
              <button
                onClick={() => setResourcesOpen((v) => !v)}
                className={clsx(
                  'relative flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                  resourcesActive ? 'text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
                )}
              >
                Recursos
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
                {resourcesActive && (
                  <span
                    className="absolute inset-x-2 -bottom-[9px] h-[2.5px] rounded-full"
                    style={{ background: 'linear-gradient(90deg,var(--color-accent),var(--color-glow-cyan))' }}
                  />
                )}
              </button>
              {resourcesOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setResourcesOpen(false)} />
                  <div className="absolute left-0 top-9 z-20 w-48 rounded-lg border border-border bg-surface py-1.5 shadow-float">
                    {RESOURCE_ITEMS.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setResourcesOpen(false)}
                        className={({ isActive }) =>
                          clsx(
                            'block px-4 py-2 text-[13px]',
                            isActive ? 'bg-accent-light font-semibold text-accent' : 'text-text hover:bg-bg'
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </>
              )}
            </div>

            {NAV_ITEMS.slice(4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span
                        className="absolute inset-x-2 -bottom-[9px] h-[2.5px] rounded-full"
                        style={{ background: 'linear-gradient(90deg,var(--color-accent),var(--color-glow-cyan))' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="relative flex items-center gap-3">
          {isPro && <Badge tone="ai">PRO</Badge>}
          {role === 'student' && <Badge tone="blue">ESTUDIANTE</Badge>}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-text-2 hover:bg-bg"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full p-[1.5px]"
              style={{ background: 'linear-gradient(135deg,var(--color-accent),var(--color-glow-cyan))' }}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-accent">
                {initial}
              </span>
            </span>
            <span className="hidden sm:inline">{username}</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-48 rounded-lg border border-border bg-surface py-1 shadow-float">
                <NavLink
                  to="/perfil"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3.5 py-2 text-[13px] text-text hover:bg-bg"
                >
                  Perfil
                </NavLink>
                <NavLink
                  to="/plan-pro"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3.5 py-2 text-[13px] text-text hover:bg-bg"
                >
                  {isPro ? 'Mi suscripción' : 'Ser Pro'}
                </NavLink>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={handleLogout}
                  className="block w-full px-3.5 py-2 text-left text-[13px] text-danger hover:bg-danger-light"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-1.5 md:hidden">
        {[...NAV_ITEMS.slice(0, 4), ...RESOURCE_ITEMS, ...NAV_ITEMS.slice(4)].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium',
                isActive ? 'bg-accent-light text-accent' : 'text-text-2'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => {
          setOnboardingOpen(false)
          setProfile(isPro, false)
        }}
      />
    </div>
  )
}
