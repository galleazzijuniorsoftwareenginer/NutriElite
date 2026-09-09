import { pdfDownloadUrl } from '../../../api/plans'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import type { WizardPlanData } from '../planTypes'
import type { WeeklyMenu } from '../../../types'
import { clampAdjustment, gramsFromPct, GOAL_LABEL, FORMULA_LABEL } from '../planMath'
import { useAuthStore } from '../../../store/authStore'

interface Props {
  plan: WizardPlanData
  carbPct: number
  protPct: number
  fatPct: number
  kcalAdjustment: number
  weeklyMenu: WeeklyMenu | null
}

export function ResumenStep({ plan, carbPct, protPct, fatPct, kcalAdjustment, weeklyMenu }: Props) {
  const token = useAuthStore((s) => s.token)

  const get = plan.originalGet + clampAdjustment(kcalAdjustment)
  const { carbG, protG, fatG } = gramsFromPct(get, carbPct, protPct, fatPct)

  async function handleDownload() {
    // No pasamos "perfil" por query string: el backend ya busca los datos del
    // nutricionista (incluido el logo) directo en la base cuando no se pasa.
    const url = pdfDownloadUrl(plan.planId, {
      menu: weeklyMenu ?? undefined,
      override: { protein_g: protG, carbs_g: carbG, fats_g: fatG },
    })
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const blob = await res.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `nutrielite_${plan.planId}.pdf`
    a.click()
    window.URL.revokeObjectURL(objectUrl)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-text">Resumen del plan</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-text-2">Paciente</dt>
            <dd className="font-medium text-text">{plan.patientName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-2">Objetivo</dt>
            <dd className="font-medium text-text">{GOAL_LABEL[plan.goal]}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-2">Fórmula</dt>
            <dd className="font-medium text-text">{FORMULA_LABEL[plan.formula]}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-2">GET final</dt>
            <dd className="font-medium text-text">{get.toFixed(0)} kcal</dd>
          </div>
          <div>
            <dt className="text-xs text-text-2">Macros (P/C/G)</dt>
            <dd className="font-medium text-text">
              {protG.toFixed(0)}g / {carbG.toFixed(0)}g / {fatG.toFixed(0)}g
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-2">Menú IA</dt>
            <dd className="font-medium text-text">{weeklyMenu ? '7 días generados' : 'No generado'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">Exportar reporte clínico</h3>
        <p className="text-xs text-text-2">
          El PDF incluye datos del paciente, auditoría nutricional, distribución SMAE
          {weeklyMenu ? ' y el menú semanal generado' : ''}, con tu marca profesional si la configuraste en tu perfil.
        </p>
        <Button onClick={handleDownload} className="w-full">
          ⬇ Descargar PDF
        </Button>
      </Card>
    </div>
  )
}
