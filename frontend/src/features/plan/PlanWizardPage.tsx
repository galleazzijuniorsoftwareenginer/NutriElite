import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { getPlan, listTemplates } from '../../api/plans'
import { DatosStep } from './steps/DatosStep'
import { DietocalculoStep } from './steps/DietocalculoStep'
import { AuditoriaStep } from './steps/AuditoriaStep'
import { DistribuyeStep } from './steps/DistribuyeStep'
import { MenuStep } from './steps/MenuStep'
import { ResumenStep } from './steps/ResumenStep'
import { DEFAULT_PCT, type WizardPlanData } from './planTypes'
import type { Formula, WeeklyMenu } from '../../types'
import { useTourStore } from '../../store/tourStore'
import { PLAN_WIZARD_TOUR_ID, planWizardTourSteps } from '../../tours/planWizardTour'

const STEPS = ['Datos', 'Dietocálculo', 'Auditoría SMAE', 'Distribuye', 'Menú IA', 'Resumen y PDF']
const STEP_TOUR_IDS = ['wizard-step-datos', 'wizard-step-dietocalculo', 'wizard-step-auditoria', 'wizard-step-distribuye', 'wizard-step-menu', 'wizard-step-resumen']

export function PlanWizardPage() {
  const { planId: planIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const existingPlanId = planIdParam ? Number(planIdParam) : null

  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [plan, setPlan] = useState<WizardPlanData | null>(null)
  const [pct, setPct] = useState(DEFAULT_PCT)
  const [kcalAdjustment, setKcalAdjustment] = useState(0)
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null)

  const templateId = searchParams.get('templateId')
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
    enabled: !!templateId,
  })

  useEffect(() => {
    if (templateId && templates) {
      const tpl = templates.find((t) => t.id === Number(templateId))
      if (tpl) {
        const carb = Math.round(((tpl.carbs * 4) / tpl.get) * 100)
        const prot = Math.round(((tpl.protein * 4) / tpl.get) * 100)
        setPct({ carbPct: carb, protPct: prot, fatPct: 100 - carb - prot })
      }
    }
  }, [templateId, templates])

  const { data: existingPlan } = useQuery({
    queryKey: ['plan', existingPlanId],
    queryFn: () => getPlan(existingPlanId!),
    enabled: !!existingPlanId,
  })

  useEffect(() => {
    if (existingPlan) {
      setPlan({
        planId: existingPlan.plan_id,
        patientName: existingPlan.patient_name,
        patientEmail: existingPlan.patient_email,
        patientPhone: existingPlan.patient_phone,
        patientId: null,
        weight: existingPlan.weight,
        height: existingPlan.height,
        age: existingPlan.age,
        gender: existingPlan.gender,
        activityLevel: existingPlan.activity_level,
        goal: existingPlan.goal,
        // Planes creados antes de que /plans/{id} devolviera "formula" no la
        // tienen guardada del lado del backend — mifflin es el valor por
        // defecto histórico, no una suposición nueva.
        formula: (existingPlan.formula as Formula | null) ?? 'mifflin',
        tmb: existingPlan.TMB,
        originalGet: existingPlan.GET,
      })
      // Si el plan ya tiene un menú semanal generado, lo restauramos para que
      // el nutricionista pueda seguir editando alimentos sin tener que
      // regenerarlo desde cero al reabrir el plan.
      if (existingPlan.weekly_menu?.semana?.length) {
        setWeeklyMenu(existingPlan.weekly_menu)
        setMaxStep(5)
        setStep(4)
      } else {
        setMaxStep(2)
        setStep(1)
      }
    }
  }, [existingPlan])

  function goToStep(target: number) {
    if (target <= maxStep) setStep(target)
  }

  function handlePlanCreated(p: WizardPlanData) {
    setPlan(p)
    setMaxStep(1)
    setStep(1)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-text">
          {plan ? `Plan de ${plan.patientName}` : 'Nuevo plan'}
        </h1>
        <button
          onClick={() => useTourStore.getState().start(PLAN_WIZARD_TOUR_ID, planWizardTourSteps)}
          className="text-xs font-medium text-accent hover:underline"
        >
          Ver tutorial del asistente
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-border bg-surface p-1.5">
        {STEPS.map((label, i) => (
          <button
            key={label}
            data-tour={STEP_TOUR_IDS[i]}
            onClick={() => goToStep(i)}
            disabled={i > maxStep}
            className={clsx(
              'flex flex-1 basis-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              i === step ? 'bg-accent-light text-accent' : i <= maxStep ? 'text-text-2 hover:bg-bg' : 'text-text-3 cursor-not-allowed'
            )}
          >
            <span
              className={clsx(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]',
                i === step ? 'bg-accent text-white' : i < maxStep ? 'bg-accent-light text-accent' : 'bg-bg text-text-3'
              )}
            >
              {i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <DatosStep
          initial={{
            patientId: searchParams.get('patientId') ? Number(searchParams.get('patientId')) : null,
            patientName: searchParams.get('name') || '',
            patientEmail: searchParams.get('email') || '',
            patientPhone: searchParams.get('phone') || '',
          }}
          onCreated={handlePlanCreated}
        />
      )}

      {step === 1 && plan && (
        <DietocalculoStep
          plan={plan}
          carbPct={pct.carbPct}
          protPct={pct.protPct}
          fatPct={pct.fatPct}
          kcalAdjustment={kcalAdjustment}
          onChangePct={(p) => setPct((prev) => ({ ...prev, ...p }))}
          onChangeAdjustment={setKcalAdjustment}
          onContinue={() => {
            setMaxStep((m) => Math.max(m, 2))
            setStep(2)
          }}
        />
      )}

      {step === 2 && plan && (
        <AuditoriaStep
          plan={plan}
          carbPct={pct.carbPct}
          protPct={pct.protPct}
          fatPct={pct.fatPct}
          kcalAdjustment={kcalAdjustment}
          onAdjustPct={setPct}
          onContinue={() => {
            setMaxStep((m) => Math.max(m, 3))
            setStep(3)
          }}
        />
      )}

      {step === 3 && plan && (
        <DistribuyeStep
          plan={plan}
          carbPct={pct.carbPct}
          protPct={pct.protPct}
          fatPct={pct.fatPct}
          kcalAdjustment={kcalAdjustment}
          onContinue={() => {
            setMaxStep((m) => Math.max(m, 4))
            setStep(4)
          }}
        />
      )}

      {step === 4 && plan && (
        <MenuStep
          plan={plan}
          weeklyMenu={weeklyMenu}
          onMenuReady={(menu) => {
            setWeeklyMenu(menu)
            setMaxStep((m) => Math.max(m, 5))
          }}
          onContinue={() => setStep(5)}
        />
      )}

      {step === 5 && plan && (
        <ResumenStep
          plan={plan}
          carbPct={pct.carbPct}
          protPct={pct.protPct}
          fatPct={pct.fatPct}
          kcalAdjustment={kcalAdjustment}
          weeklyMenu={weeklyMenu}
        />
      )}
    </div>
  )
}
