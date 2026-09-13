import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createPlan } from '../../../api/plans'
import { getPlanPreferences } from '../../../api/preferences'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { FieldWrap, Input, Select } from '../../../components/Field'
import type { Formula, Gender, Goal } from '../../../types'
import type { WizardPlanData } from '../planTypes'
import { calculateGeb, calculateGetBase, applyGoalAdjustment } from '../metabolicMath'
import { checkClinicalAlerts, clampAdjustment, gramsFromPct } from '../planMath'

interface Props {
  initial: {
    patientId: number | null
    patientName: string
    patientEmail: string
    patientPhone: string
  }
  plan: WizardPlanData | null
  carbPct: number
  protPct: number
  fatPct: number
  kcalAdjustment: number
  onCreated: (plan: WizardPlanData) => void
  onChangePct: (pct: { carbPct?: number; protPct?: number; fatPct?: number }) => void
  onChangeAdjustment: (adj: number) => void
  onContinue: () => void
}

const FORMULAS: { value: Formula; label: string; hint: string; needsBodyFat?: boolean }[] = [
  { value: 'mifflin', label: 'Mifflin-St Jeor', hint: 'La más usada en adultos — buena precisión general.' },
  { value: 'harris', label: 'Harris-Benedict', hint: 'Fórmula clásica, tiende a sobreestimar un poco el GET.' },
  {
    value: 'schofield',
    label: 'Schofield',
    hint: 'OMS/FAO/UNU — la única validada para menores de 18, con franjas propias para todas las edades (0 a 60+).',
  },
  { value: 'katch', label: 'Katch-McArdle', hint: 'Usa masa magra — requiere % de grasa corporal conocido.', needsBodyFat: true },
  { value: 'cunningham', label: 'Cunningham', hint: 'Como Katch-McArdle pero más agresiva — atletas muy magros.', needsBodyFat: true },
]

function personCategory(age: number): string {
  if (age < 3) return 'Bebé/niño(a) (0–3 años)'
  if (age <= 10) return 'Niño(a) (3–10 años)'
  if (age <= 18) return 'Adolescente (10–18 años)'
  if (age <= 30) return 'Adulto joven (18–30 años)'
  if (age <= 60) return 'Adulto (30–60 años)'
  return 'Adulto mayor (60+ años)'
}

function isPediatric(age: number): boolean {
  return age < 18
}

type MacroKey = 'carbPct' | 'protPct' | 'fatPct'

const MACROS: { key: MacroKey; label: string; color: string; factor: number; cssVar: string }[] = [
  { key: 'carbPct', label: 'Carbohidratos', color: 'text-carb', factor: 4, cssVar: 'bg-carb' },
  { key: 'protPct', label: 'Proteína', color: 'text-prot', factor: 4, cssVar: 'bg-prot' },
  { key: 'fatPct', label: 'Grasas', color: 'text-fat', factor: 9, cssVar: 'bg-fat' },
]

function num(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function MacroRow({
  label,
  color,
  cssVar,
  pct,
  grams,
  kcal,
  gPerKg,
  weight,
  onPctChange,
  onGramsChange,
  onKcalChange,
  onGPerKgChange,
}: {
  label: string
  color: string
  cssVar: string
  pct: number
  grams: number
  kcal: number
  gPerKg: number
  weight: number
  onPctChange: (v: number) => void
  onGramsChange: (v: number) => void
  onKcalChange: (v: number) => void
  onGPerKgChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${cssVar}`} />
        <span className="text-sm font-semibold text-text">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">%</span>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Number.isFinite(pct) ? Math.round(pct * 10) / 10 : 0}
            onChange={(e) => onPctChange(num(e.target.value))}
            className={`text-sm font-semibold ${color}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">Gramos</span>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={Number.isFinite(grams) ? Math.round(grams * 10) / 10 : 0}
            onChange={(e) => onGramsChange(num(e.target.value))}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">Kcal</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={Number.isFinite(kcal) ? Math.round(kcal) : 0}
            onChange={(e) => onKcalChange(num(e.target.value))}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">g/Kg</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            disabled={!weight}
            value={Number.isFinite(gPerKg) ? Math.round(gPerKg * 100) / 100 : 0}
            onChange={(e) => onGPerKgChange(num(e.target.value))}
            className="text-sm"
          />
        </label>
      </div>
    </div>
  )
}

export function DatosYCalculoStep({
  initial,
  plan,
  carbPct,
  protPct,
  fatPct,
  kcalAdjustment,
  onCreated,
  onChangePct,
  onChangeAdjustment,
  onContinue,
}: Props) {
  const [patientName, setPatientName] = useState(initial.patientName)
  const [patientEmail, setPatientEmail] = useState(initial.patientEmail)
  const [patientPhone, setPatientPhone] = useState(initial.patientPhone)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender>('female')
  const [activityLevel, setActivityLevel] = useState('1.55')
  const [goal, setGoal] = useState<Goal>('cut')
  const [formula, setFormula] = useState<Formula>('mifflin')
  const [useEta, setUseEta] = useState(true)
  const [bodyFatPercent, setBodyFatPercent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [prefsApplied, setPrefsApplied] = useState(false)

  const { data: prefs } = useQuery({ queryKey: ['plan-preferences'], queryFn: getPlanPreferences, enabled: !plan })

  if (prefs && !prefsApplied) {
    setFormula(prefs.default_formula)
    setActivityLevel(String(prefs.default_activity_level))
    setGoal(prefs.default_goal)
    setPrefsApplied(true)
  }

  const needsBodyFat = FORMULAS.find((f) => f.value === formula)?.needsBodyFat

  const w = num(weight)
  const h = num(height)
  const a = parseInt(age, 10) || 0
  const al = num(activityLevel)
  const bf = needsBodyFat ? num(bodyFatPercent) : undefined

  // Previsualización en vivo antes de crear el plan — una vez creado, el
  // GEB/GET real del backend manda (plan.tmb / plan.originalGet).
  const liveGeb = w > 0 && h > 0 && a > 0 ? calculateGeb(w, h, a, gender, formula, bf) : 0
  const liveGetBase = liveGeb > 0 ? applyGoalAdjustment(calculateGetBase(liveGeb, al, useEta), goal) : 0

  const geb = plan ? plan.tmb : liveGeb
  const getBase = plan ? plan.originalGet : liveGetBase
  const get = getBase + clampAdjustment(kcalAdjustment)
  const { carbG, protG, fatG } = gramsFromPct(get, carbPct, protPct, fatPct)
  const sum = carbPct + protPct + fatPct
  const isValidPct = Math.round(sum) === 100

  const planWeight = plan ? plan.weight : w
  const planHeight = plan ? plan.height : h
  const imc = planWeight && planHeight ? planWeight / (planHeight / 100) ** 2 : null

  const macroValues: Record<MacroKey, { pct: number; grams: number; kcal: number }> = {
    carbPct: { pct: carbPct, grams: carbG, kcal: carbG * 4 },
    protPct: { pct: protPct, grams: protG, kcal: protG * 4 },
    fatPct: { pct: fatPct, grams: fatG, kcal: fatG * 9 },
  }

  function setFromPct(key: MacroKey, newPct: number) {
    onChangePct({ [key]: Math.max(0, newPct) } as Record<MacroKey, number>)
  }
  function setFromKcal(key: MacroKey, newKcal: number) {
    if (get <= 0) return
    setFromPct(key, (Math.max(0, newKcal) / get) * 100)
  }
  function setFromGrams(key: MacroKey, factor: number, newGrams: number) {
    setFromKcal(key, Math.max(0, newGrams) * factor)
  }
  function setFromGPerKg(key: MacroKey, factor: number, newGPerKg: number) {
    if (!planWeight) return
    setFromGrams(key, factor, Math.max(0, newGPerKg) * planWeight)
  }
  function handleObjetivoChange(newTarget: number) {
    if (!Number.isFinite(newTarget) || newTarget <= 0) return
    onChangeAdjustment(newTarget - getBase)
  }

  const alerts = useMemo(
    () =>
      geb > 0
        ? checkClinicalAlerts({
            tmb: geb,
            originalGet: getBase,
            get,
            gProt: protG,
            peso: planWeight,
            goal: plan ? plan.goal : goal,
            carbPct,
            fatPct,
          })
        : [],
    [geb, getBase, get, protG, planWeight, plan, goal, carbPct, fatPct]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!w || w <= 0) return setError('Ingresa un peso válido.')
    let hh = h
    if (!hh || hh <= 0) return setError('Ingresa una altura válida.')
    if (!a || a <= 0) return setError('Ingresa una edad válida.')
    if (needsBodyFat && (!bf || bf <= 0)) return setError('Esta fórmula requiere el % de grasa corporal.')

    setLoading(true)
    try {
      const res = await createPlan({
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        patient_id: initial.patientId,
        weight: w,
        height: hh,
        age: a,
        gender,
        activity_level: al as 1.2 | 1.375 | 1.55 | 1.725 | 1.9,
        goal,
        formula,
        body_fat_percent: needsBodyFat ? bf : null,
        use_eta: useEta,
      })
      onCreated({
        planId: res.plan_id,
        patientName,
        patientEmail,
        patientPhone,
        patientId: initial.patientId,
        weight: w,
        height: hh,
        age: a,
        gender,
        activityLevel: al,
        goal,
        formula,
        useEta,
        tmb: res.TMB,
        originalGet: res.GET,
      })
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      if (status?.status === 403 && status?.data?.detail === 'LIMIT_REACHED') {
        setError('Alcanzaste el límite de 3 planes/semana del plan Free. Actualiza a Pro para planes ilimitados.')
      } else {
        setError('No se pudo generar el plan. Verifica los datos.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!plan && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-text">Datos del paciente</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FieldWrap label="Nombre">
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
            </FieldWrap>
            <FieldWrap label="Email">
              <Input type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Teléfono">
              <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} />
            </FieldWrap>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text">Calcula el objetivo calórico</h3>
            <p className="text-xs text-text-2">Calcula las necesidades energéticas de tu paciente.</p>
          </div>

          {!plan ? (
            <>
              <FieldWrap label="Selecciona la fórmula" hint={FORMULAS.find((f) => f.value === formula)?.hint}>
                <Select value={formula} onChange={(e) => setFormula(e.target.value as Formula)}>
                  {FORMULAS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </Select>
              </FieldWrap>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Peso (kg)">
                  <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} required />
                </FieldWrap>
                <FieldWrap label="Altura (cm)">
                  <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} required />
                </FieldWrap>
                <FieldWrap label="Edad" hint={age ? personCategory(parseInt(age, 10) || 0) : undefined}>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
                </FieldWrap>
                <FieldWrap label="Género">
                  <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                    <option value="female">{age && isPediatric(parseInt(age, 10) || 0) ? 'Niña' : 'Femenino'}</option>
                    <option value="male">{age && isPediatric(parseInt(age, 10) || 0) ? 'Niño' : 'Masculino'}</option>
                  </Select>
                </FieldWrap>
              </div>

              {age && isPediatric(parseInt(age, 10) || 0) && formula !== 'schofield' && (
                <p className="rounded-md bg-warn-light px-3 py-2 text-xs text-warn">
                  ⚠ Mifflin, Harris-Benedict, Katch-McArdle y Cunningham fueron validadas en población adulta.
                  Para menores de 18 años se recomienda la fórmula Schofield.
                </p>
              )}

              {needsBodyFat && (
                <FieldWrap label="% de grasa corporal" hint="Medido por bioimpedancia o pliegues cutáneos.">
                  <Input
                    type="number"
                    step="0.1"
                    value={bodyFatPercent}
                    onChange={(e) => setBodyFatPercent(e.target.value)}
                    placeholder="Ej. 18.5"
                    className="max-w-[160px]"
                    required
                  />
                </FieldWrap>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldWrap label="Nivel de actividad">
                  <Select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                    <option value="1.2">Sedentario (1.2)</option>
                    <option value="1.375">Ligero (1.375)</option>
                    <option value="1.55">Moderado (1.55)</option>
                    <option value="1.725">Intenso (1.725)</option>
                    <option value="1.9">Muy intenso (1.9)</option>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Objetivo">
                  <Select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                    <option value="cut">Pérdida de peso</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="bulk">Ganancia de masa</option>
                  </Select>
                </FieldWrap>
              </div>

              <FieldWrap
                label="ETA (Efecto Térmico de los Alimentos)"
                hint="Energía que el cuerpo gasta en digerir lo que come, ~10% del gasto por actividad."
              >
                <Select value={useEta ? 'si' : 'no'} onChange={(e) => setUseEta(e.target.value === 'si')}>
                  <option value="si">Sí (recomendado)</option>
                  <option value="no">No</option>
                </Select>
              </FieldWrap>
            </>
          ) : (
            <p className="text-xs text-text-2">
              Fórmula: <span className="font-medium text-text">{FORMULAS.find((f) => f.value === plan.formula)?.label}</span>
              {' · '}Actividad: <span className="font-medium text-text">{plan.activityLevel}</span>
              {' · '}ETA: <span className="font-medium text-text">{plan.useEta ? 'Sí' : 'No'}</span>
            </p>
          )}

          <div className="mt-1 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-text-2">GEB</p>
              <p className="font-display text-lg font-semibold text-text">{geb > 0 ? geb.toFixed(0) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-2">GET base</p>
              <p className="font-display text-lg font-semibold text-text">{getBase > 0 ? getBase.toFixed(0) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-2">IMC</p>
              <p className="font-display text-lg font-semibold text-text">{imc != null ? imc.toFixed(1) : '—'}</p>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text">Kilocalorías y macronutrientes</h3>
            <p className="text-xs text-text-2">Define las kilocalorías y macronutrientes para el plan.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-2">Objetivo calórico diario (kcal)</span>
            <Input
              type="number"
              min={0}
              step={10}
              value={get > 0 ? Math.round(get) : ''}
              onChange={(e) => handleObjetivoChange(num(e.target.value))}
              className="text-lg font-semibold text-text"
              disabled={getBase <= 0}
            />
          </label>

          <div className="flex flex-col gap-3">
            {MACROS.map((m) => (
              <MacroRow
                key={m.key}
                label={m.label}
                color={m.color}
                cssVar={m.cssVar}
                pct={macroValues[m.key].pct}
                grams={macroValues[m.key].grams}
                kcal={macroValues[m.key].kcal}
                gPerKg={planWeight ? macroValues[m.key].grams / planWeight : 0}
                weight={planWeight}
                onPctChange={(v) => setFromPct(m.key, v)}
                onGramsChange={(v) => setFromGrams(m.key, m.factor, v)}
                onKcalChange={(v) => setFromKcal(m.key, v)}
                onGPerKgChange={(v) => setFromGPerKg(m.key, m.factor, v)}
              />
            ))}
          </div>

          <div className="flex h-2.5 overflow-hidden rounded-full bg-bg">
            <div className="bg-carb transition-all" style={{ width: `${Math.min(carbPct, 100)}%` }} />
            <div className="bg-prot transition-all" style={{ width: `${Math.min(protPct, 100)}%` }} />
            <div className="bg-fat transition-all" style={{ width: `${Math.min(fatPct, 100)}%` }} />
          </div>

          <div className={`rounded-md px-3 py-2 text-xs font-medium ${isValidPct ? 'bg-accent-light text-accent' : 'bg-warn-light text-warn'}`}>
            {isValidPct
              ? 'Distribución correcta — suma 100%.'
              : sum < 100
                ? `Faltan ${(100 - sum).toFixed(0)}% para cerrar 100%.`
                : `Exceso de ${(sum - 100).toFixed(0)}% — reduce algún macro.`}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-text">Alertas clínicas</h3>
            {alerts.length === 0 ? (
              <div className="rounded-md bg-accent-light px-3 py-2 text-xs font-medium text-accent">
                ✅ Distribución dentro de los parámetros clínicos recomendados
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-md px-3 py-2 text-xs font-medium ${a.type === 'danger' ? 'bg-danger-light text-danger' : 'bg-warn-light text-warn'}`}
                  >
                    ⚠️ {a.message}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {error && <p className="text-xs text-danger">{error}</p>}

          {!plan ? (
            <Button type="submit" loading={loading} className="w-full">
              Calcular plan →
            </Button>
          ) : (
            <Button type="button" onClick={onContinue} disabled={!isValidPct} className="w-full">
              Generar auditoría SMAE →
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
