import { useState } from 'react'
import { createPlan } from '../../../api/plans'
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const w = parseFloat(weight)
    const h = parseFloat(height)
    const a = parseInt(age, 10)
    if (!w || !h || !a) {
      setError('Completa peso, altura y edad.')
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
          <FieldWrap label="Edad">
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
          </FieldWrap>
          <FieldWrap label="Género">
            <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
            </Select>
          </FieldWrap>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <FieldWrap label="Fórmula metabólica">
            <Select value={formula} onChange={(e) => setFormula(e.target.value as Formula)}>
              <option value="mifflin">Mifflin-St Jeor</option>
              <option value="harris">Harris-Benedict</option>
              <option value="schofield">Schofield (pediátrica)</option>
            </Select>
          </FieldWrap>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" loading={loading}>
            Calcular plan →
          </Button>
        </div>
      </form>
    </Card>
  )
}
