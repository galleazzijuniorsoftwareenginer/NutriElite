import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { createAppointment, deleteAppointment, listAppointments, sendAppointmentReminder, updateAppointment, type Appointment } from '../../api/appointments'
import { listPatients } from '../../api/patients'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { FieldWrap, Input, Select } from '../../components/Field'
import { confirmAction } from '../../store/confirmStore'

const GRID_START_HOUR = 8
const GRID_END_HOUR = 17

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // 0 = lunes
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function NewAppointmentForm({ onSaved }: { onSaved: () => void }) {
  const { data: patients } = useQuery({ queryKey: ['patients'], queryFn: () => listPatients() })
  const [patientId, setPatientId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('30')
  const [notes, setNotes] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      createAppointment({
        patient_id: parseInt(patientId, 10),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(duration, 10) || 30,
        notes,
      }),
    onSuccess: onSaved,
  })

  return (
    <div className="flex flex-col gap-4">
      <FieldWrap label="Paciente">
        <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Selecciona un paciente…</option>
          {(patients ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </FieldWrap>
      <FieldWrap label="Fecha y hora">
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Duración (minutos)">
        <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FieldWrap>
      <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!patientId || !scheduledAt} className="w-full">
        Agendar cita
      </Button>
    </div>
  )
}

function NuevaConsultaPicker({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { data: patients } = useQuery({ queryKey: ['patients'], queryFn: () => listPatients() })
  const [patientId, setPatientId] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <FieldWrap label="Paciente" hint="Te llevaremos a su ficha para registrar la consulta.">
        <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Selecciona un paciente…</option>
          {(patients ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </FieldWrap>
      <Button
        disabled={!patientId}
        className="w-full"
        onClick={() => {
          navigate(`/pacientes/${patientId}?tab=Consultas`)
          onClose()
        }}
      >
        Continuar →
      </Button>
    </div>
  )
}

function WeekGrid({ appointments }: { appointments: Appointment[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  }), [weekStart])
  const hours = useMemo(() => {
    // Siempre cubre el horario laboral 8-17, pero si hay citas fuera de ese
    // rango en la semana mostrada, se extiende para que nunca queden citas
    // ocultas fuera de la grilla.
    let start = GRID_START_HOUR
    let end = GRID_END_HOUR
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    appointments.forEach((a) => {
      const d = new Date(a.scheduled_at)
      if (d >= weekStart && d < weekEnd) {
        start = Math.min(start, d.getHours())
        end = Math.max(end, d.getHours())
      }
    })
    const arr: number[] = []
    for (let h = start; h <= end; h++) arr.push(h)
    return arr
  }, [weekStart, appointments])

  function apptsAt(day: Date, hour: number) {
    return appointments.filter((a) => {
      const d = new Date(a.scheduled_at)
      return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate() && d.getHours() === hour
    })
  }

  return (
    <Card className="overflow-x-auto p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <button onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })} className="rounded-md px-2 py-1 text-xs text-text-2 hover:bg-bg">
          ← Semana anterior
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold capitalize text-text">
            {days[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              const now = new Date()
              const next = appointments
                .filter((a) => new Date(a.scheduled_at) >= now)
                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
              setWeekStart(startOfWeek(next ? new Date(next.scheduled_at) : now))
            }}
            className="rounded-full bg-accent-light px-2.5 py-1 text-[11px] font-semibold text-accent hover:brightness-95"
          >
            Ir a próxima cita
          </button>
        </div>
        <button onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })} className="rounded-md px-2 py-1 text-xs text-text-2 hover:bg-bg">
          Semana siguiente →
        </button>
      </div>
      <div className="min-w-[820px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-bg">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-2 text-center text-xs font-semibold capitalize text-text">
              {d.toLocaleDateString('es-MX', { weekday: 'short' })}
              <div className="text-[10px] font-normal text-text-3">{d.getDate()}</div>
            </div>
          ))}
        </div>
        {hours.map((h) => (
          <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/60">
            <div className="flex items-center justify-center py-2 text-[11px] font-medium text-text-3">{h}:00</div>
            {days.map((d) => {
              const items = apptsAt(d, h)
              return (
                <div key={d.toISOString() + h} className="min-h-[42px] border-l border-border/60 p-1">
                  {items.map((a) => (
                    <div key={a.id} className="truncate rounded bg-accent-light px-1.5 py-1 text-[10px] font-medium text-accent" title={a.patient_name}>
                      {a.patient_name}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Card>
  )
}

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
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                onClick={async () => {
                  if (await confirmAction({ message: `¿Deseas cancelar la cita de ${appt.patient_name}?`, confirmLabel: 'Sí, cancelar cita' }))
                    statusMut.mutate('cancelled')
                }}
              >
                Cancelar
              </Button>
            )}
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-danger"
          onClick={async () => {
            if (await confirmAction({ message: `¿Deseas eliminar la cita de ${appt.patient_name}? Esta acción no se puede deshacer.`, confirmLabel: 'Sí, eliminar' }))
              deleteMut.mutate()
          }}
        >
          Eliminar
        </Button>
      </div>

      <Modal open={rescheduling} onClose={() => setRescheduling(false)} title="Reagendar cita" width={380}>
        <RescheduleForm appt={appt} onDone={() => setRescheduling(false)} />
      </Modal>
    </li>
  )
}

export function AgendaPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'proximas' | 'todas' | 'completadas' | 'canceladas'>('proximas')
  const [view, setView] = useState<'lista' | 'grid'>('lista')
  const [newApptOpen, setNewApptOpen] = useState(false)
  const [newConsultaOpen, setNewConsultaOpen] = useState(false)

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Agenda</h1>
          <p className="text-sm text-text-2">Todas tus citas en un solo lugar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setNewConsultaOpen(true)}>+ Nueva consulta</Button>
          <Button size="sm" onClick={() => setNewApptOpen(true)}>📅 Agendar cita</Button>
        </div>
      </div>

      <div className="inline-flex self-start gap-0.5 rounded-full border border-border bg-bg p-1">
        {([['lista', 'Lista'], ['grid', 'Grid semanal']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              view === key ? 'bg-surface text-accent shadow-card' : 'text-text-2'
            }`}
          >
            {label}
          </button>
        ))}
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

      {view === 'grid' ? (
        <WeekGrid appointments={allAppointments ?? []} />
      ) : (
        <>
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
        </>
      )}

      <Modal open={newApptOpen} onClose={() => setNewApptOpen(false)} title="Agendar cita" width={420}>
        <NewAppointmentForm
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            setNewApptOpen(false)
          }}
        />
      </Modal>

      <Modal open={newConsultaOpen} onClose={() => setNewConsultaOpen(false)} title="Nueva consulta" width={420}>
        <NuevaConsultaPicker onClose={() => setNewConsultaOpen(false)} />
      </Modal>
    </div>
  )
}
