import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { createPlan } from '../../../api/plans'
import { getPlanPreferences } from '../../../api/preferences'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { FieldWrap, Input, Select } from '../../../components/Field'
import type { Formula, Gender, Goal } from '../../../types'
import type { WizardPlanData } from '../planTypes'

interface Props {
  initial: {
    patientId: number | null
    patientName: string
    patientEmail: string
    patientPhone: string
  }
  onCreated: (plan: WizardPlanData) => void
}

const FORMULAS: { value: Formula; label: string; hint: string; needsBodyFat?: boolean }[] = [
  { value: 'mifflin', label: 'Mifflin-St Jeor', hint: 'La más usada en adultos — buena precisión general.' },
  { value: 'harris', label: 'Harris-Benedict', hint: 'Fórmula clásica, tiende a sobreestimar un poco el GET.' },
  { value: 'schofield', label: 'Schofield', hint: 'OMS/FAO/UNU — 6 franjas por edad y sexo, de 0 a 60+ años.' },
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

export function DatosStep({ initial, onCreated }: Props) {
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

  const { data: prefs } = useQuery({ queryKey: ['plan-preferences'], queryFn: getPlanPreferences })

  useEffect(() => {
    if (prefs && !prefsApplied) {
      setFormula(prefs.default_formula)
      setActivityLevel(String(prefs.default_activity_level))
      setGoal(prefs.default_goal)
      setPrefsApplied(true)
    }
  }, [prefs, prefsApplied])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const w = parseFloat(weight)
    let h = parseFloat(height)
    const a = parseInt(age, 10)
    if (!w || !h || !a) {
      setError('Completa peso, altura y edad.')
      return
    }
    if (h >= 0.5 && h <= 3) {
      h = h * 100 // corrige el error común de escribir la altura en metros
    }
    if (h < 40 || h > 250) {
      setError('La altura debe estar en centímetros (ej. 165), entre 40 y 250 cm.')
      return
    }
    const needsBodyFat = FORMULAS.find((f) => f.value === formula)?.needsBodyFat
    const bf = bodyFatPercent ? parseFloat(bodyFatPercent) : null
    if (needsBodyFat && (!bf || bf < 3 || bf > 60)) {
      setError('Esta fórmula requiere el % de grasa corporal (entre 3 y 60).')
      return
    }
    setLoading(true)
    try {
      const res = await createPlan({
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        patient_id: initial.patientId,
        weight: w,
        height: h,
        age: a,
        gender,
        activity_level: parseFloat(activityLevel),
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
        height: h,
        age: a,
        gender,
        activityLevel: parseFloat(activityLevel),
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit">
        <h3 className="mb-1 text-sm font-semibold text-text">Fórmula metabólica</h3>
        <p className="mb-4 text-xs text-text-2">Elige la que quieras usar para este plan.</p>
        <div className="flex flex-col gap-2">
          {FORMULAS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFormula(f.value)}
              className={clsx(
                'rounded-md border px-3.5 py-2.5 text-left transition-colors',
                formula === f.value
                  ? 'border-accent bg-accent-light'
                  : 'border-border bg-surface hover:bg-bg'
              )}
            >
              <span className={clsx('block text-sm font-semibold', formula === f.value ? 'text-accent' : 'text-text')}>
                {f.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-text-3">{f.hint}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-text">Datos del paciente</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

          <div className="h-px bg-border" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FieldWrap label="Peso (kg)">
              <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} required />
            </FieldWrap>
            <FieldWrap label="Altura (cm)">
              <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} required />
            </FieldWrap>
            <FieldWrap
              label="Edad"
              hint={age ? `Categoría: ${personCategory(parseInt(age, 10) || 0)}` : undefined}
            >
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
              Para menores de 18 años se recomienda la fórmula Schofield (tiene franjas específicas por edad).
            </p>
          )}

          {FORMULAS.find((f) => f.value === formula)?.needsBodyFat && (
            <FieldWrap label="% de grasa corporal" hint="Medido por bioimpedancia o pliegues cutáneos — requerido por esta fórmula.">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" loading={loading}>
              Calcular plan →
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
