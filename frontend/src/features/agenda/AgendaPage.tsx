import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { deleteAppointment, listAppointments, sendAppointmentReminder, updateAppointment, type Appointment } from '../../api/appointments'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { FieldWrap, Input } from '../../components/Field'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}
const STATUS_TONE: Record<string, 'accent' | 'blue' | 'warn' | 'danger' | 'neutral'> = {
  scheduled: 'blue',
  completed: 'accent',
  cancelled: 'danger',
  no_show: 'warn',
}

export function RescheduleForm({ appt, onDone }: { appt: Appointment; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(() => {
    const d = new Date(appt.scheduled_at)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const mut = useMutation({
    mutationFn: () => updateAppointment(appt.id, { scheduled_at: new Date(value).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onDone()
    },
  })
  return (
    <div className="flex flex-col gap-4">
      <FieldWrap label="Nueva fecha y hora">
        <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
      </FieldWrap>
      <Button onClick={() => mut.mutate()} loading={mut.isPending} className="w-full">Reagendar</Button>
    </div>
  )
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  const queryClient = useQueryClient()
  const [rescheduling, setRescheduling] = useState(false)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments'] })

  const statusMut = useMutation({
    mutationFn: (status: string) => updateAppointment(appt.id, { status }),
    onSuccess: invalidate,
  })
  const reminderMut = useMutation({
    mutationFn: () => sendAppointmentReminder(appt.id),
    onSuccess: invalidate,
  })
  const deleteMut = useMutation({
    mutationFn: () => deleteAppointment(appt.id),
    onSuccess: invalidate,
  })

  const time = new Date(appt.scheduled_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const isPast = new Date(appt.scheduled_at) < new Date()

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-14 shrink-0 text-sm font-semibold text-text">{time}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{appt.patient_name}</p>
          <p className="text-xs text-text-3">{appt.duration_minutes} min {appt.notes && `· ${appt.notes}`}</p>
        </div>
        <Badge tone={STATUS_TONE[appt.status] ?? 'neutral'}>{STATUS_LABEL[appt.status] ?? appt.status}</Badge>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {appt.status === 'scheduled' && (
          <>
            <Button size="sm" variant="ghost" onClick={() => reminderMut.mutate()} loading={reminderMut.isPending}>
              📩 Recordar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRescheduling(true)}>Reagendar</Button>
            {isPast ? (
              <Button size="sm" variant="secondary" onClick={() => statusMut.mutate('completed')}>Marcar completada</Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => statusMut.mutate('cancelled')}>Cancelar</Button>
            )}
          </>
        )}
        <Button size="sm" variant="ghost" className="text-danger" onClick={() => deleteMut.mutate()}>Eliminar</Button>
      </div>

      <Modal open={rescheduling} onClose={() => setRescheduling(false)} title="Reagendar cita" width={380}>
        <RescheduleForm appt={appt} onDone={() => setRescheduling(false)} />
      </Modal>
    </li>
  )
}

export function AgendaPage() {
  const [filter, setFilter] = useState<'proximas' | 'todas' | 'completadas' | 'canceladas'>('proximas')

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', 'agenda', filter],
    queryFn: () => {
      if (filter === 'proximas') return listAppointments(true)
      if (filter === 'completadas') return listAppointments(false, 'completed')
      if (filter === 'canceladas') return listAppointments(false, 'cancelled')
      return listAppointments(false)
    },
  })

  const { data: allAppointments } = useQuery({
    queryKey: ['appointments', 'agenda', 'todas'],
    queryFn: () => listAppointments(false),
  })

  const stats = useMemo(() => {
    const all = allAppointments ?? []
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = all.filter((a) => new Date(a.scheduled_at) >= startOfMonth)
    const completed = thisMonth.filter((a) => a.status === 'completed').length
    const noShow = thisMonth.filter((a) => a.status === 'no_show').length
    const cancelled = thisMonth.filter((a) => a.status === 'cancelled').length
    const closed = completed + noShow
    const noShowRate = closed > 0 ? Math.round((noShow / closed) * 100) : 0
    const upcoming = all.filter((a) => a.status === 'scheduled' && new Date(a.scheduled_at) >= now).length
    return { thisMonth: thisMonth.length, completed, cancelled, noShowRate, upcoming }
  }, [allAppointments])

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    ;(appointments ?? []).forEach((a) => {
      const key = new Date(a.scheduled_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
    })
    return Array.from(map.entries())
  }, [appointments])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Agenda</h1>
        <p className="text-sm text-text-2">Todas tus citas en un solo lugar.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="flex flex-col gap-0.5 py-3">
          <span className="text-[11px] font-medium text-text-2">Próximas</span>
          <span className="font-display text-xl font-semibold text-accent">{stats.upcoming}</span>
        </Card>
        <Card className="flex flex-col gap-0.5 py-3">
          <span className="text-[11px] font-medium text-text-2">Este mes</span>
          <span className="font-display text-xl font-semibold text-accent-2">{stats.thisMonth}</span>
        </Card>
        <Card className="flex flex-col gap-0.5 py-3">
          <span className="text-[11px] font-medium text-text-2">Completadas (mes)</span>
          <span className="font-display text-xl font-semibold text-accent">{stats.completed}</span>
        </Card>
        <Card className="flex flex-col gap-0.5 py-3">
          <span className="text-[11px] font-medium text-text-2">Tasa de inasistencia</span>
          <span className="font-display text-xl font-semibold text-warn">{stats.noShowRate}%</span>
        </Card>
      </div>

      <div className="inline-flex self-start gap-0.5 rounded-full border border-border bg-bg p-1">
        {([
          ['proximas', 'Próximas'],
          ['todas', 'Todas'],
          ['completadas', 'Completadas'],
          ['canceladas', 'Canceladas'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              filter === key ? 'bg-surface text-accent shadow-card' : 'text-text-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-3">Cargando…</p>
      ) : grouped.length === 0 ? (
        <Card className="py-16 text-center text-sm text-text-3">
          No hay citas {filter === 'proximas' ? 'próximas' : 'en este filtro'}. Agenda una desde el perfil de un{' '}
          <Link to="/pacientes" className="text-accent hover:underline">paciente</Link>.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([day, items]) => (
            <Card key={day} className="p-0 overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold capitalize text-text">{day}</h2>
              </div>
              <ul className="divide-y divide-border">
                {items.map((a) => (
                  <AppointmentRow key={a.id} appt={a} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
