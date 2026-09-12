import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMicronutrients, micronutrientsXlsxUrl, pdfDownloadUrl, saveAsTemplate, sharePlan } from '../../../api/plans'
import { getProfile } from '../../../api/profile'
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
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile })
  const [shareUrl, setShareUrl] = useState('')
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedBooking, setCopiedBooking] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateSaved, setTemplateSaved] = useState(false)
  const [showUnmatched, setShowUnmatched] = useState(false)
  const [downloadingXlsx, setDownloadingXlsx] = useState(false)

  const { data: micros, isLoading: microsLoading, isError: microsError } = useQuery({
    queryKey: ['micronutrients', plan.planId],
    queryFn: () => getMicronutrients(plan.planId),
    enabled: !!weeklyMenu,
  })
  const templateMut = useMutation({
    mutationFn: () => saveAsTemplate(plan.planId, templateName || 'Mi plantilla'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setTemplateSaved(true)
      setTimeout(() => setTemplateSaved(false), 2000)
    },
  })

  const get = plan.originalGet + clampAdjustment(kcalAdjustment)
  const { carbG, protG, fatG } = gramsFromPct(get, carbPct, protPct, fatPct)

  async function handleShare() {
    setSharing(true)
    try {
      const { url } = await sharePlan(plan.planId)
      setShareUrl(url)
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

  async function handleDownloadXlsx() {
    setDownloadingXlsx(true)
    try {
      const res = await fetch(micronutrientsXlsxUrl(plan.planId), { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `micronutrientes_plan_${plan.planId}.xlsx`
      a.click()
      window.URL.revokeObjectURL(objectUrl)
    } finally {
      setDownloadingXlsx(false)
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
      </Card>

      {weeklyMenu && (
        <Card className="flex flex-col gap-3 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-text">Micronutrientes de la semana</h3>
            {micros && (
              <Button size="sm" variant="secondary" loading={downloadingXlsx} onClick={handleDownloadXlsx}>
                ⬇ Descargar planilla (XLSX)
              </Button>
            )}
          </div>

          {microsLoading && <p className="text-xs text-text-3">Calculando…</p>}
          {microsError && (
            <p className="text-xs text-danger">No se pudo calcular la planilla de micronutrientes.</p>
          )}

          {micros && !micros.usda_configurado && (
            <p className="rounded-md bg-warn-light px-3 py-2 text-xs text-warn">
              Esta función necesita una clave de USDA FoodData Central configurada en el servidor
              (variable de entorno <code>USDA_FDC_API_KEY</code>, gratuita) para poder buscar los datos.
            </p>
          )}

          {micros && micros.usda_configurado && (
            <>
              <p className="text-xs text-text-2">
                Valores estimados a partir de datos públicos de USDA FoodData Central por ingrediente —
                cobertura: {micros.cobertura.con_datos}/{micros.cobertura.total} ingredientes con dato disponible.
                Son valores de referencia, no un análisis de laboratorio.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-3">
                      <th className="py-2 font-medium">Nutriente</th>
                      <th className="text-right font-medium">Total semana</th>
                      <th className="text-right font-medium">Promedio diario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(micros.campos).map(([field, info]) => (
                      <tr key={field} className="border-b border-border/60">
                        <td className="py-1.5 text-text-2">{info.label}</td>
                        <td className="text-right text-text">
                          {micros.totales_semana[field]?.toFixed(1) ?? '—'} {info.unidad}
                        </td>
                        <td className="text-right text-text-3">
                          {((micros.totales_semana[field] ?? 0) / 7).toFixed(1)} {info.unidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {micros.ingredientes_sin_datos.length > 0 && (
                <div className="text-[11px] text-text-3">
                  <button onClick={() => setShowUnmatched((v) => !v)} className="font-medium text-accent hover:underline">
                    {showUnmatched ? 'Ocultar' : 'Ver'} {micros.ingredientes_sin_datos.length} ingrediente(s) sin dato disponible en USDA
                  </button>
                  {showUnmatched && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {micros.ingredientes_sin_datos.map((ing) => (
                        <li key={ing} className="rounded-full bg-bg px-2 py-0.5 text-text-2">{ing}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      )}

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
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text">Logo de marca</h3>
        <p className="text-xs text-text-2">
          {profile?.logo_base64
            ? 'Tu logo aparece en el encabezado del PDF.'
            : 'Sube tu logo en el perfil para que aparezca en el encabezado del PDF.'}
        </p>
        <div className="flex items-center gap-3">
          {profile?.logo_base64 ? (
            <img src={profile.logo_base64} alt="Logo" className="h-12 w-12 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border-strong text-[9px] text-text-3">
              Sin logo
            </div>
          )}
          <Link to="/configuracion?tab=perfil" className="flex-1">
            <Button variant="secondary" className="w-full">
              {profile?.logo_base64 ? 'Cambiar logo →' : 'Configurar mi logo →'}
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 lg:col-span-3">
        <h3 className="text-sm font-semibold text-text">Portal del paciente</h3>
        <p className="text-xs text-text-2">
          Comparte un enlace donde tu paciente ve el cardápio de la semana, la lista de compras y puede
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
              <span className="text-[11px] text-text-3">Solo el calendario, sin el cardápio (para cuando aún no compartes la dieta):</span>
              <Button size="sm" variant="ghost" onClick={handleCopyBookingOnly}>
                {copiedBooking ? '✓ Copiado' : '📅 Link solo agendar'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" loading={sharing} onClick={handleShare} className="w-fit">
            🔗 Generar enlace para el paciente
          </Button>
        )}
      </Card>
    </div>
  )
}
