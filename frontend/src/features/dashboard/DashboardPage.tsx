import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listPatients } from '../../api/patients'
import { listPlans } from '../../api/plans'
import { listAppointments, sendAppointmentReminder, type Appointment } from '../../api/appointments'
import { RescheduleForm } from '../agenda/AgendaPage'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { Tooltip } from '../../components/Tooltip'
import { useAuthStore } from '../../store/authStore'

const GOAL_LABEL: Record<string, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

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

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const startWeekday = (firstDay.getDay() + 6) % 7 // 0 = lunes
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function AppointmentCalendar({ appointments }: { appointments: Appointment[] }) {
  const queryClient = useQueryClient()
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(ymd(today))
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null)

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    appointments.forEach((a) => {
      const key = ymd(new Date(a.scheduled_at))
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    })
    return map
  }, [appointments])

  const cells = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const selectedItems = (byDay.get(selected) ?? []).sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  const monthLabel = cursor.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  const reminderMut = useMutation({
    mutationFn: sendAppointmentReminder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">📅 Próximas consultas</h2>
        <Link to="/agenda" className="text-xs font-medium text-accent hover:underline">
          Ver agenda completa
        </Link>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <Tooltip label="Mes anterior">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            aria-label="Mes anterior"
            className="rounded-md px-2 py-1 text-xs text-text-2 hover:bg-bg"
          >
            ←
          </button>
        </Tooltip>
        <span className="text-xs font-semibold capitalize text-text">{monthLabel}</span>
        <Tooltip label="Mes siguiente">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
            className="rounded-md px-2 py-1 text-xs text-text-2 hover:bg-bg"
          >
            →
          </button>
        </Tooltip>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="py-1 text-[10px] font-semibold text-text-3">
            {w}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={i} />
          const key = ymd(date)
          const hasAppts = byDay.has(key)
          const isToday = key === ymd(today)
          const isSelected = key === selected
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`relative rounded-md py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-accent text-white'
                  : isToday
                    ? 'border border-accent text-accent'
                    : 'text-text hover:bg-bg'
              }`}
            >
              {date.getDate()}
              {hasAppts && (
                <span
                  className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-accent-2'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        {selectedItems.length === 0 ? (
          <p className="py-3 text-center text-xs text-text-3">Sin citas este día.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {selectedItems.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{a.patient_name}</p>
                  <p className="text-xs text-text-3">
                    {new Date(a.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    <Badge tone={a.status === 'scheduled' ? 'blue' : a.status === 'completed' ? 'accent' : 'neutral'}>
                      {a.status === 'scheduled' ? 'Agendada' : a.status === 'completed' ? 'Completada' : a.status}
                    </Badge>
                  </p>
                </div>
                {a.status === 'scheduled' && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={reminderMut.isPending && reminderMut.variables === a.id}
                      onClick={() => reminderMut.mutate(a.id)}
                    >
                      📩
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setRescheduling(a)}>
                      Reagendar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!rescheduling} onClose={() => setRescheduling(null)} title="Reagendar cita" width={380}>
        {rescheduling && <RescheduleForm appt={rescheduling} onDone={() => setRescheduling(null)} />}
      </Modal>
    </Card>
  )
}

function FollowUpWidget({ patients }: { patients: { id: number; name: string; status: string; last_plan: string | null }[] }) {
  const stale = useMemo(() => {
    const now = Date.now()
    return patients
      .filter((p) => p.status === 'activo')
      .map((p) => ({
        ...p,
        daysSince: p.last_plan ? Math.floor((now - new Date(p.last_plan).getTime()) / 86400000) : null,
      }))
      .filter((p) => p.daysSince === null || p.daysSince >= 30)
      .sort((a, b) => (b.daysSince ?? 9999) - (a.daysSince ?? 9999))
      .slice(0, 5)
  }, [patients])

  if (stale.length === 0) return null

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">⏰ Seguimiento pendiente</h2>
        <span className="text-xs text-text-3">Sin plan nuevo hace 30+ días</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {stale.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{p.name}</p>
              <p className="text-xs text-text-3">
                {p.daysSince === null ? 'Sin plan aún' : `Último plan hace ${p.daysSince} días`}
              </p>
            </div>
            <Link to={`/pacientes/${p.id}`} className="shrink-0 text-xs font-medium text-accent-2 hover:underline">
              Ver paciente
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function DashboardPage() {
  const username = useAuthStore((s) => s.username)
  const { data: patients } = useQuery({ queryKey: ['patients'], queryFn: () => listPatients() })
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: () => listPlans() })
  const { data: appointments } = useQuery({ queryKey: ['appointments', 'dashboard'], queryFn: () => listAppointments(false) })

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AppointmentCalendar appointments={appointments ?? []} />
        <FollowUpWidget patients={patients ?? []} />
      </div>
    </div>
  )
}
