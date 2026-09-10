import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { getPatientPlans } from '../../api/patients'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { ClinicalRecordTab } from './tabs/ClinicalRecordTab'
import { ConsultationsTab } from './tabs/ConsultationsTab'
import { RenalTab } from './tabs/RenalTab'

const GOAL_LABEL: Record<string, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

const TABS = ['Planes', 'Ficha clínica', 'Consultas', 'Módulo renal'] as const
type Tab = (typeof TABS)[number]

interface PatientPlansResponse {
  patient: { id: number; name: string; email: string; phone: string }
  plans: { id: number; created_at: string; goal: string; weight: number; get: number; tmb: number }[]
}

export function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('Planes')
  const { data, isLoading } = useQuery<PatientPlansResponse>({
    queryKey: ['patient', id],
    queryFn: () => getPatientPlans(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <p className="text-sm text-text-3">Cargando…</p>
  if (!data) return <p className="text-sm text-text-3">Paciente no encontrado.</p>

  const patientId = data.patient.id

  const sortedPlans = [...data.plans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const latestPlan = sortedPlans[0]
  const firstPlan = sortedPlans[sortedPlans.length - 1]
  const weightDelta = latestPlan && firstPlan && latestPlan.id !== firstPlan.id ? latestPlan.weight - firstPlan.weight : null
  const daysSinceLast = latestPlan ? Math.floor((Date.now() - new Date(latestPlan.created_at).getTime()) / 86400000) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/pacientes" className="text-xs font-medium text-accent-2 hover:underline">
            ← Pacientes
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-text">{data.patient.name}</h1>
          <p className="text-sm text-text-2">
            {data.patient.email || 'Sin email'} {data.patient.phone && `· ${data.patient.phone}`}
          </p>
        </div>
        <Button
          onClick={() =>
            navigate(
              `/plan/nuevo?patientId=${patientId}&name=${encodeURIComponent(data.patient.name)}&email=${encodeURIComponent(
                data.patient.email || ''
              )}&phone=${encodeURIComponent(data.patient.phone || '')}`
            )
          }
        >
          + Nuevo plan para {data.patient.name.split(' ')[0]}
        </Button>
      </div>

      {latestPlan && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">Último peso</span>
            <span className="font-display text-xl font-semibold text-accent">{latestPlan.weight} kg</span>
          </Card>
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">Variación</span>
            <span className={clsx('font-display text-xl font-semibold', weightDelta === null ? 'text-text-3' : weightDelta > 0 ? 'text-warn' : weightDelta < 0 ? 'text-accent-2' : 'text-text-3')}>
              {weightDelta === null ? '—' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
            </span>
          </Card>
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">TMB actual</span>
            <span className="font-display text-xl font-semibold text-accent-2">{Math.round(latestPlan.tmb)} kcal</span>
          </Card>
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">Última actividad</span>
            <span className="font-display text-xl font-semibold text-accent">
              {daysSinceLast === 0 ? 'Hoy' : `${daysSinceLast}d`}
            </span>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === t ? 'bg-accent-light text-accent' : 'text-text-2 hover:bg-bg'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Planes' && (
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-text">Historial de planes ({data.plans.length})</h2>
          </div>
          {data.plans.length === 0 ? (
            <p className="p-8 text-center text-sm text-text-3">Este paciente aún no tiene planes.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.plans.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-text">
                      {GOAL_LABEL[p.goal] || p.goal} · {Math.round(p.get)} kcal
                    </p>
                    <p className="text-xs text-text-3">
                      {new Date(p.created_at).toLocaleDateString()} · TMB {Math.round(p.tmb)} kcal · {p.weight} kg
                    </p>
                  </div>
                  <Link to={`/plan/${p.id}`}>
                    <Button size="sm" variant="secondary">Abrir</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'Ficha clínica' && <ClinicalRecordTab patientId={patientId} />}
      {tab === 'Consultas' && <ConsultationsTab patientId={patientId} />}
      {tab === 'Módulo renal' && <RenalTab patientId={patientId} />}
    </div>
  )
}
