import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPatientPlans } from '../../api/patients'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'

const GOAL_LABEL: Record<string, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

interface PatientPlansResponse {
  patient: { id: number; name: string; email: string; phone: string }
  plans: { id: number; created_at: string; goal: string; weight: number; get: number; tmb: number }[]
}

export function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery<PatientPlansResponse>({
    queryKey: ['patient', id],
    queryFn: () => getPatientPlans(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <p className="text-sm text-text-3">Cargando…</p>
  if (!data) return <p className="text-sm text-text-3">Paciente no encontrado.</p>

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
              `/plan/nuevo?patientId=${data.patient.id}&name=${encodeURIComponent(data.patient.name)}&email=${encodeURIComponent(
                data.patient.email || ''
              )}&phone=${encodeURIComponent(data.patient.phone || '')}`
            )
          }
        >
          + Nuevo plan para {data.patient.name.split(' ')[0]}
        </Button>
      </div>

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
    </div>
  )
}
