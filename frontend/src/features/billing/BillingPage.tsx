import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { startCheckout } from '../../api/billing'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { useAuthStore } from '../../store/authStore'
import { PreferenciasForm } from '../configuracion/PreferenciasForm'

const FREE_FEATURES = ['3 planes por semana', 'Cálculo TMB/GET/SMAE', 'Exportación PDF básica']
const PRO_FEATURES = [
  'Planes ilimitados',
  'Generador de menú semanal con IA',
  'Marca personalizada en el PDF (logo, cédula, clínica)',
  'Plantillas de planes ilimitadas',
  'Soporte prioritario',
]

export function BillingContent() {
  const isPro = useAuthStore((s) => s.isPro)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    try {
      const { url } = await startCheckout()
      window.location.href = url
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || 'No se pudo iniciar el pago. Intenta de nuevo en unos minutos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          {isPro ? 'Tu suscripción' : 'Actualiza a Pro'}
        </h1>
        <p className="text-sm text-text-2">
          {isPro ? 'Ya tienes acceso completo a NutriElite.' : 'Desbloquea el generador de menú con IA y planes ilimitados.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className={isPro ? 'opacity-60' : ''}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Free</h2>
            <span className="text-lg font-semibold text-text">$0</span>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-text-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-accent">✓</span> {f}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="border-accent">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              Pro {isPro && <Badge tone="accent">ACTIVO</Badge>}
            </h2>
            <span className="text-lg font-semibold text-text">$199 MXN/mes</span>
          </div>
          <ul className="mb-4 flex flex-col gap-2 text-sm text-text-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-accent">✓</span> {f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <Button onClick={handleUpgrade} loading={loading} className="w-full">
              Suscribirme a Pro
            </Button>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </Card>
      </div>
    </div>
  )
}

type Tab = 'suscripcion' | 'preferencias'

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'suscripcion', label: 'Suscripción', hint: 'Free vs Pro, facturación' },
  { key: 'preferencias', label: 'Preferencias de plan', hint: 'Valores por defecto al calcular' },
]

export function BillingPage() {
  const [params] = useSearchParams()
  const initial = (params.get('tab') as Tab) || 'suscripcion'
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === initial) ? initial : 'suscripcion')

  return (
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
        {tab === 'suscripcion' && <BillingContent />}
        {tab === 'preferencias' && <PreferenciasForm />}
      </div>
    </div>
  )
}
