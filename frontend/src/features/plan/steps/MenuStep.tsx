import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { regenerateDay, streamWeeklyMenu } from '../../../api/menu'
import type { MenuDay, WeeklyMenu } from '../../../types'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import type { WizardPlanData } from '../planTypes'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

type DayStatus = 'pending' | 'loading' | 'done' | 'error'

interface Props {
  plan: WizardPlanData
  weeklyMenu: WeeklyMenu | null
  onMenuReady: (menu: WeeklyMenu) => void
  onContinue: () => void
}

export function MenuStep({ plan, weeklyMenu, onMenuReady, onContinue }: Props) {
  const [days, setDays] = useState<(MenuDay | null)[]>(weeklyMenu ? weeklyMenu.semana : Array(7).fill(null))
  const [statuses, setStatuses] = useState<DayStatus[]>(
    weeklyMenu ? weeklyMenu.semana.map((d) => (d.error ? 'error' : 'done')) : Array(7).fill('pending')
  )
  const [activeDay, setActiveDay] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [streamError, setStreamError] = useState('')
  const closeRef = useRef<() => void>(() => {})

  useEffect(() => () => closeRef.current(), [])

  function startGeneration() {
    setGenerating(true)
    setStreamError('')
    setDays(Array(7).fill(null))
    setStatuses(Array(7).fill('loading'))
    const received: (MenuDay | null)[] = Array(7).fill(null)

    closeRef.current = streamWeeklyMenu(plan.planId, {
      onDay: (idx, day) => {
        received[idx] = day
        setDays((prev) => {
          const next = [...prev]
          next[idx] = day
          return next
        })
        setStatuses((prev) => {
          const next = [...prev]
          next[idx] = day.error ? 'error' : 'done'
          return next
        })
      },
      onDone: () => {
        setGenerating(false)
        onMenuReady({ semana: received.map((d, i) => d ?? fallbackDay(i)) })
      },
      onError: (msg) => {
        setGenerating(false)
        setStreamError(msg)
      },
    })
  }

  function fallbackDay(idx: number): MenuDay {
    return { dia: DIAS_SEMANA[idx], comidas: [], macros: { proteina_g: 0, carb_g: 0, gordura_g: 0, kcal_total: 0 }, error: 'No generado' }
  }

  const regenMut = useMutation({
    mutationFn: (dia: string) => regenerateDay(plan.planId, dia),
    onSuccess: (day, dia) => {
      const idx = DIAS_SEMANA.indexOf(dia)
      setDays((prev) => {
        const next = [...prev]
        next[idx] = day
        return next
      })
      setStatuses((prev) => {
        const next = [...prev]
        next[idx] = day.error ? 'error' : 'done'
        return next
      })
    },
  })

  const allDone = statuses.every((s) => s === 'done' || s === 'error')
  const activeMenuDay = days[activeDay]

  return (
    <div className="flex flex-col gap-4">
      {!weeklyMenu && days.every((d) => d === null) && !generating && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="font-display text-lg text-text">Generador de menú semanal con IA</p>
          <p className="max-w-md text-sm text-text-2">
            Genera un plan alimenticio de 7 días con platillos mexicanos auténticos, respetando la distribución SMAE
            de tu auditoría. Los 7 días se generan en paralelo — verás cada uno aparecer en tiempo real.
          </p>
          <Button onClick={startGeneration} className="mt-2">
            ✨ Generar cardápio semanal
          </Button>
        </Card>
      )}

      {(generating || days.some((d) => d !== null)) && (
        <>
          <Card>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia, i) => (
                <button
                  key={dia}
                  onClick={() => statuses[i] !== 'pending' && setActiveDay(i)}
                  disabled={statuses[i] === 'pending'}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    activeDay === i ? 'border-accent bg-accent-light text-accent' : 'border-border text-text-2',
                    statuses[i] === 'pending' && 'opacity-40'
                  )}
                >
                  {statuses[i] === 'loading' && <Spinner className="h-3 w-3 border" />}
                  {statuses[i] === 'done' && <span className="text-accent">✓</span>}
                  {statuses[i] === 'error' && <span className="text-danger">✗</span>}
                  {dia.slice(0, 3)}
                </button>
              ))}
            </div>
          </Card>

          {streamError && <p className="text-xs text-danger">{streamError}</p>}

          {activeMenuDay && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">{activeMenuDay.dia}</h3>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={regenMut.isPending && regenMut.variables === activeMenuDay.dia}
                  onClick={() => regenMut.mutate(activeMenuDay.dia)}
                >
                  ↺ Regenerar este día
                </Button>
              </div>

              {activeMenuDay.error ? (
                <p className="rounded-md bg-danger-light px-3 py-2 text-xs text-danger">
                  No se pudo generar este día ({activeMenuDay.error}). Intenta regenerar.
                </p>
              ) : (
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
                            <span className="text-text-3">
                              {item.quantidade_g}g · {item.kcal} kcal
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="flex justify-between rounded-md bg-bg px-3 py-2 text-xs font-medium text-text-2">
                    <span>Total del día</span>
                    <span>
                      {activeMenuDay.macros.kcal_total} kcal · P {activeMenuDay.macros.proteina_g}g · C{' '}
                      {activeMenuDay.macros.carb_g}g · G {activeMenuDay.macros.gordura_g}g
                    </span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {allDone && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={startGeneration}>
                ↺ Regenerar semana completa
              </Button>
              <Button onClick={onContinue}>Continuar al resumen →</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
