import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPublicPlan, getBusySlots, bookPublicAppointment } from '../../api/public'
import { Logo } from '../../components/Logo'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { Button } from '../../components/Button'

const SLOT_START_HOUR = 8
const SLOT_END_HOUR = 20
const SLOT_MINUTES = 30
const BOOKING_DURATION_MINUTES = 30

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function BookingSection({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(today))
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data: busySlots } = useQuery({
    queryKey: ['public-busy-slots', token],
    queryFn: () => getBusySlots(token),
  })

  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
    return slots
  }, [])

  const isSlotBusy = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const start = new Date(`${selectedDate}T00:00:00`)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60000)
    const now = new Date()
    if (start <= now) return true
    return (busySlots ?? []).some((b) => {
      const bStart = new Date(b.scheduled_at)
      const bEnd = new Date(bStart.getTime() + b.duration_minutes * 60000)
      return start < bEnd && bStart < end
    })
  }

  const mut = useMutation({
    mutationFn: () => {
      const [h, m] = selectedTime!.split(':').map(Number)
      const dt = new Date(`${selectedDate}T00:00:00`)
      dt.setHours(h, m, 0, 0)
      return bookPublicAppointment(token, dt.toISOString())
    },
    onSuccess: (res) => {
      setConfirmed(new Date(res.scheduled_at).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))
      setSelectedTime(null)
      queryClient.invalidateQueries({ queryKey: ['public-busy-slots', token] })
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || 'No se pudo agendar la cita, intenta con otro horario.')
    },
  })

  const maxDate = new Date(today.getTime() + 60 * 86400000)

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-text">📅 Agendar mi próxima cita</h2>
      <p className="mb-4 text-xs text-text-2">Horario disponible: {SLOT_START_HOUR}:00 – {SLOT_END_HOUR}:00.</p>

      {confirmed ? (
        <div className="rounded-md bg-accent-2-light px-4 py-3 text-sm text-accent-2">
          ✅ Cita confirmada para <b className="capitalize">{confirmed}</b>. Recibirás un correo de confirmación.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="date"
            value={selectedDate}
            min={toDateInputValue(today)}
            max={toDateInputValue(maxDate)}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSelectedTime(null)
            }}
            className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {timeSlots.map((t) => {
              const busy = isSlotBusy(t)
              return (
                <button
                  key={t}
                  disabled={busy}
                  onClick={() => setSelectedTime(t)}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    busy
                      ? 'cursor-not-allowed border-border text-text-3 opacity-40'
                      : selectedTime === t
                        ? 'border-accent bg-accent text-white'
                        : 'border-border text-text hover:bg-bg'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button disabled={!selectedTime} loading={mut.isPending} onClick={() => mut.mutate()} className="self-start">
            Confirmar cita
          </Button>
        </div>
      )}
    </Card>
  )
}

export function PublicPlanPage() {
  const { token } = useParams()
  const [activeDay, setActiveDay] = useState(0)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-plan', token],
    queryFn: () => getPublicPlan(token!),
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <Logo size={28} />
        <p className="mt-4 text-sm text-text-2">Este enlace no es válido o ya expiró. Consulta con tu nutricionista.</p>
      </div>
    )
  }

  const dias = data.weekly_menu?.semana ?? []
  const activeMenuDay = dias[activeDay]

  return (
    <div className="min-h-screen bg-bg pb-16">
      <header className="border-b border-border bg-surface px-4 py-4 sm:px-8">
        <Logo size={26} />
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 sm:px-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Hola, {data.patient_first_name} 👋</h1>
          <p className="text-sm text-text-2">
            {data.goal_label} {data.get ? `· Meta: ${data.get.toFixed(0)} kcal/día` : ''}
          </p>
        </div>

        {dias.length === 0 ? (
          <Card className="py-10 text-center text-sm text-text-3">
            Tu nutricionista aún no generó el cardápio de esta semana.
          </Card>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto">
              {dias.map((d, i) => (
                <button
                  key={d.dia}
                  onClick={() => setActiveDay(i)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    activeDay === i ? 'border-accent bg-accent-light text-accent' : 'border-border text-text-2'
                  }`}
                >
                  {d.dia.slice(0, 3)}
                </button>
              ))}
            </div>

            {activeMenuDay && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-text">{activeMenuDay.dia}</h2>
                <div className="flex flex-col gap-3">
                  {activeMenuDay.comidas.map((meal, mi) => (
                    <div key={mi} className="rounded-md border border-border p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-text">{meal.tiempo}</span>
                        <span className="text-text-3">{meal.kcal} kcal</span>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {meal.itens.map((item, ii) => (
                          <li key={ii} className="flex items-center justify-between text-xs text-text-2">
                            <span>{item.alimento}</span>
                            <span className="text-text-3">{item.quantidade_g}g</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text">🛒 Lista de compras de la semana</h2>
              {data.shopping_list.length === 0 ? (
                <p className="text-sm text-text-3">Sin datos suficientes para generar la lista.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {data.shopping_list.map((item) => (
                    <li key={item.alimento} className="flex items-center justify-between rounded-md bg-bg px-3 py-2 text-xs">
                      <span className="capitalize text-text">{item.alimento}</span>
                      <span className="font-medium text-text-2">{item.cantidad_g_total}g</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        {data.can_book && token && <BookingSection token={token} />}
      </main>
    </div>
  )
}
