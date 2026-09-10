import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { ProfileForm } from '../profile/ProfilePage'
import { PreferenciasForm } from './PreferenciasForm'
import { BillingContent } from '../billing/BillingPage'

type Tab = 'perfil' | 'preferencias' | 'suscripcion'

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'perfil', label: 'Perfil profesional', hint: 'Datos que aparecen en el PDF' },
  { key: 'preferencias', label: 'Preferencias de plan', hint: 'Valores por defecto al calcular' },
  { key: 'suscripcion', label: 'Suscripción', hint: 'Free vs Pro, facturación' },
]

export function ConfiguracionPage() {
  const [params] = useSearchParams()
  const initial = (params.get('tab') as Tab) || 'perfil'
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === initial) ? initial : 'perfil')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Configuración</h1>
        <p className="text-sm text-text-2">Personaliza tu perfil, tus valores por defecto y tu suscripción.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'shrink-0 rounded-md px-3.5 py-2.5 text-left text-sm font-medium transition-colors lg:shrink',
                tab === t.key ? 'bg-accent-light text-accent' : 'text-text-2 hover:bg-bg hover:text-text'
              )}
            >
              <span className="block">{t.label}</span>
              <span className={clsx('hidden text-[11px] font-normal lg:block', tab === t.key ? 'text-accent/70' : 'text-text-3')}>
                {t.hint}
              </span>
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {tab === 'perfil' && <ProfileForm />}
          {tab === 'preferencias' && <PreferenciasForm />}
          {tab === 'suscripcion' && <BillingContent />}
        </div>
      </div>
    </div>
  )
}
