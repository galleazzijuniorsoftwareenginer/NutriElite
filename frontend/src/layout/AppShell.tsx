import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import clsx from 'clsx'
import { Logo } from '../components/Logo'
import { Badge } from '../components/Badge'
import { NavIcon, type NavIconName } from '../components/NavIcon'
import { OnboardingModal } from '../components/OnboardingModal'
import { TourHost } from '../components/TourHost'
import { useAuthStore } from '../store/authStore'
import { useTourStore } from '../store/tourStore'
import { APP_SHELL_TOUR_ID, appShellTourSteps } from '../tours/appShellTour'

const NAV_ITEMS: { to: string; label: string; end: boolean; icon: NavIconName; tour: string }[] = [
  { to: '/', label: 'Inicio', end: true, icon: 'home', tour: 'nav-inicio' },
  { to: '/pacientes', label: 'Pacientes', end: false, icon: 'users', tour: 'nav-pacientes' },
  { to: '/agenda', label: 'Agenda', end: false, icon: 'calendar', tour: 'nav-agenda' },
  { to: '/plantillas', label: 'Plantillas', end: false, icon: 'clipboard', tour: 'nav-plantillas' },
  { to: '/recetas', label: 'Recetas', end: false, icon: 'cooking', tour: 'nav-recetas' },
  { to: '/referencia', label: 'Referencia', end: false, icon: 'book', tour: 'nav-referencia' },
]

export function AppShell() {
  const { username, isPro, role, logout, firstLogin, setProfile } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(firstLogin)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initial = (username || '?').slice(0, 1).toUpperCase()

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
          <Logo size={24} />
        </div>
        <div className="px-3 pt-3">
          <NavLink to="/plan/nuevo" className="block" data-tour="nav-nuevo-plan">
            <Button variant="ai" className="w-full justify-center gap-1.5">
              <NavIcon name="sparkles" size={15} />
              Nuevo plan
            </Button>
          </NavLink>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-tour={item.tour}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive ? 'bg-accent-light text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
                )
              }
            >
              <NavIcon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 flex-col gap-0.5 border-t border-border p-3">
          <NavLink
            to="/configuracion?tab=suscripcion"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-accent-light text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
              )
            }
          >
            <NavIcon name="crown" />
            {isPro ? 'Mi plan' : 'Mejorar plan'}
            {isPro && <Badge tone="ai" className="ml-auto">PRO</Badge>}
          </NavLink>
          <NavLink
            to="/configuracion?tab=perfil"
            data-tour="nav-configuracion"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-accent-light text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
              )
            }
          >
            <NavIcon name="settings" />
            Configuración
          </NavLink>
          <button
            onClick={() => useTourStore.getState().start(APP_SHELL_TOUR_ID, appShellTourSteps)}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] font-medium text-text-2 transition-colors hover:bg-bg hover:text-text"
          >
            <NavIcon name="book" />
            Ver tutorial
          </button>
          {role === 'student' && (
            <div className="px-3 pt-1.5">
              <Badge tone="blue">ESTUDIANTE</Badge>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex items-center md:hidden">
            <Logo size={24} />
          </div>
          <div className="relative ml-auto flex items-center gap-3">
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
                    to="/configuracion?tab=perfil"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2 text-[13px] text-text hover:bg-bg"
                  >
                    Perfil
                  </NavLink>
                  <NavLink
                    to="/configuracion?tab=preferencias"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2 text-[13px] text-text hover:bg-bg"
                  >
                    Configuración
                  </NavLink>
                  <NavLink
                    to="/configuracion?tab=suscripcion"
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
          <NavLink
            to="/plan/nuevo"
            data-tour="nav-nuevo-plan"
            className={({ isActive }) =>
              clsx(
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold',
                isActive ? 'bg-accent text-white' : 'bg-accent-light text-accent'
              )
            }
          >
            <NavIcon name="sparkles" size={14} />
            Nuevo plan
          </NavLink>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-tour={item.tour}
              className={({ isActive }) =>
                clsx(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium',
                  isActive ? 'bg-accent-light text-accent' : 'text-text-2'
                )
              }
            >
              <NavIcon name={item.icon} size={14} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => {
          setOnboardingOpen(false)
          setProfile(isPro, false)
        }}
        onStartTour={() => {
          setOnboardingOpen(false)
          setProfile(isPro, false)
          useTourStore.getState().start(APP_SHELL_TOUR_ID, appShellTourSteps)
        }}
      />
      <TourHost />
    </div>
  )
}
