import { useState } from 'react'
import { startCheckout } from '../../api/billing'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { useAuthStore } from '../../store/authStore'

const FREE_FEATURES = ['3 planes por semana', 'Cálculo TMB/GET/SMAE', 'Exportación PDF básica']
const PRO_FEATURES = [
  'Planes ilimitados',
  'Generador de menú semanal con IA',
  'Marca personalizada en el PDF (logo, cédula, clínica)',
  'Plantillas de planes ilimitadas',
  'Soporte prioritario',
]

export function BillingPage() {
  const isPro = useAuthStore((s) => s.isPro)
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const { url } = await startCheckout()
      window.location.href = url
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
        </Card>
      </div>
    </div>
  )
}
