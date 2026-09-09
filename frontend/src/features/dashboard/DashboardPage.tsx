import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listPatients } from '../../api/patients'
import { listPlans } from '../../api/plans'
import { listAppointments, sendAppointmentReminder } from '../../api/appointments'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { useAuthStore } from '../../store/authStore'

const GOAL_LABEL: Record<string, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'accent' | 'blue' }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-2">{label}</span>
      <span className={`font-display text-3xl font-semibold ${tone === 'blue' ? 'text-accent-2' : 'text-accent'}`}>
        {value}
      </span>
    </Card>
  )
}

export function DashboardPage() {
  const username = useAuthStore((s) => s.username)
  const queryClient = useQueryClient()
  const { data: patients } = useQuery({ queryKey: ['patients'], queryFn: listPatients })
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: () => listPlans() })
  const { data: appointments } = useQuery({ queryKey: ['appointments', true], queryFn: () => listAppointments(true) })
  const reminderMut = useMutation({
    mutationFn: sendAppointmentReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', true] }),
  })

  const recentPatients = (patients ?? []).slice(0, 5)
  const recentPlans = (plans ?? []).slice(0, 5)
  const plansThisMonth = (plans ?? []).filter((p) => {
    const created = new Date(p.created_at)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="flex flex-col gap-6">
      <Card variant="deep" className="flex flex-wrap items-center justify-between gap-5">
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-deep-text-2">Panel clínico</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Hola, {username}</h1>
          <p className="mt-2 text-sm text-deep-text-2">
            {plans && plans.length > 0
              ? 'Este es el resumen de tu actividad clínica.'
              : 'Empieza generando tu primer plan — el cardápio semanal con IA se genera en segundos.'}
          </p>
        </div>
        <Link to="/plan/nuevo" className="relative">
          <Button variant="ai">✨ Nuevo plan con IA</Button>
        </Link>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pacientes activos" value={patients?.length ?? '—'} />
        <StatCard label="Planes totales" value={plans?.length ?? '—'} tone="blue" />
        <StatCard label="Planes este mes" value={plansThisMonth} />
        <StatCard label="Promedio GET" value={
          plans && plans.length > 0
            ? Math.round(plans.reduce((sum, p) => sum + p.get, 0) / plans.length) + ' kcal'
            : '—'
        } tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Pacientes recientes</h2>
            <Link to="/pacientes" className="text-xs font-medium text-accent hover:underline">
              Ver todos
            </Link>
          </div>
          {recentPatients.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-3">Aún no tienes pacientes registrados.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentPatients.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-light text-xs font-semibold text-accent">
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text">{p.name}</p>
                      <p className="text-xs text-text-3">{p.total_plans} plan(es)</p>
                    </div>
                  </div>
                  <Link to={`/pacientes/${p.id}`} className="text-xs font-medium text-accent-2 hover:underline">
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">Planes recientes</h2>
          </div>
          {recentPlans.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-3">Aún no generaste ningún plan.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentPlans.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-text">{p.patient_name || 'Sin nombre'}</p>
                    <p className="text-xs text-text-3">
                      {GOAL_LABEL[p.goal] || p.goal} · {Math.round(p.get)} kcal
                    </p>
                  </div>
                  <Link to={`/plan/${p.id}`} className="text-xs font-medium text-accent-2 hover:underline">
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {appointments && appointments.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text">📅 Próximas consultas (24h)</h2>
          <ul className="flex flex-col divide-y divide-border">
            {appointments.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-text">{a.patient_name}</p>
                  <p className="text-xs text-text-3">
                    {new Date(a.scheduled_at).toLocaleString('es-MX', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Button size="sm" variant="secondary" loading={reminderMut.isPending && reminderMut.variables === a.id} onClick={() => reminderMut.mutate(a.id)}>
                  Enviar recordatorio
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
