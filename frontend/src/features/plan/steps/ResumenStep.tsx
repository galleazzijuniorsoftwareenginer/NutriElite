import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pdfDownloadUrl, saveAsTemplate, sharePlan } from '../../../api/plans'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Field'
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
  const queryClient = useQueryClient()
  const [shareUrl, setShareUrl] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedBooking, setCopiedBooking] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateSaved, setTemplateSaved] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  function extractErrorDetail(err: unknown, fallback: string) {
    const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
    return detail || fallback
  }

  const templateMut = useMutation({
    mutationFn: () => saveAsTemplate(plan.planId, templateName || 'Mi plantilla'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setTemplateSaved(true)
      setTimeout(() => setTemplateSaved(false), 2000)
    },
  })
  const templateError = templateMut.isError ? extractErrorDetail(templateMut.error, 'No se pudo guardar la plantilla.') : ''

  const get = plan.originalGet + clampAdjustment(kcalAdjustment)
  const { carbG, protG, fatG } = gramsFromPct(get, carbPct, protPct, fatPct)

  async function handleShare() {
    setSharing(true)
    setShareError('')
    try {
      const { url } = await sharePlan(plan.planId)
      setShareUrl(url)
    } catch (err) {
      setShareError(extractErrorDetail(err, 'No se pudo generar el enlace. Intenta de nuevo.'))
    } finally {
      setSharing(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCopyBookingOnly() {
    await navigator.clipboard.writeText(`${shareUrl}/agendar`)
    setCopiedBooking(true)
    setTimeout(() => setCopiedBooking(false), 2000)
  }

  async function handleDownload() {
    setDownloadError('')
    // No pasamos "perfil" por query string: el backend ya busca los datos del
    // nutricionista (incluido el logo) directo en la base cuando no se pasa.
    const url = pdfDownloadUrl(plan.planId, {
      menu: weeklyMenu ?? undefined,
      override: { protein_g: protG, carbs_g: carbG, fats_g: fatG },
    })
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Plan no encontrado.' : 'No se pudo generar el PDF.')
      }
      const blob = await res.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `nutrielite_${plan.planId}.pdf`
      a.click()
      window.URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'No se pudo descargar el PDF. Intenta de nuevo.')
    }
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
        {downloadError && <p className="text-[11px] font-medium text-danger">{downloadError}</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">Guardar como plantilla</h3>
        <p className="text-xs text-text-2">
          Guarda este plan como plantilla reutilizable para futuros pacientes con necesidades similares.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Nombre de la plantilla"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-9 text-xs"
          />
          <Button variant="secondary" loading={templateMut.isPending} onClick={() => templateMut.mutate()}>
            Guardar
          </Button>
        </div>
        {templateSaved && <p className="text-[11px] font-medium text-accent">✓ Plantilla guardada</p>}
        {templateError && <p className="text-[11px] font-medium text-danger">{templateError}</p>}
      </Card>

      <Card className="flex flex-col gap-3 lg:col-span-3">
        <h3 className="text-sm font-semibold text-text">Portal del paciente</h3>
        <p className="text-xs text-text-2">
          Comparte un enlace donde tu paciente ve el menú de la semana, la lista de compras y puede
          agendar su próxima cita según tu disponibilidad — sin necesidad de crear una cuenta. Se actualiza
          automáticamente si regeneras el menú.
        </p>
        {shareUrl ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-xs text-text-2"
                onFocus={(e) => e.target.select()}
              />
              <Button size="sm" variant="secondary" onClick={handleCopy}>
                {copied ? '✓ Copiado' : 'Copiar enlace'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-3">Solo el calendario, sin el menú (para cuando aún no compartes la dieta):</span>
              <Button size="sm" variant="ghost" onClick={handleCopyBookingOnly}>
                {copiedBooking ? '✓ Copiado' : '📅 Link solo agendar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-fit flex-col gap-1.5">
            <Button variant="secondary" loading={sharing} onClick={handleShare} className="w-fit">
              🔗 Generar enlace para el paciente
            </Button>
            {shareError && <p className="text-[11px] font-medium text-danger">{shareError}</p>}
          </div>
        )}
      </Card>
    </div>
  )
}
