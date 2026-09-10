import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { generateAcervoMenu, regenerateDay, streamWeeklyMenu, updateMenuDayManual } from '../../../api/menu'
import type { MenuDay, MenuItem, WeeklyMenu } from '../../../types'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Field'
import { Spinner } from '../../../components/Spinner'
import { LogoMark } from '../../../components/Logo'
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

  const acervoMut = useMutation({
    mutationFn: () => generateAcervoMenu(plan.planId),
    onSuccess: (menu) => {
      setDays(menu.semana)
      setStatuses(menu.semana.map((d) => (d.error ? 'error' : 'done')))
      onMenuReady(menu)
    },
  })

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

  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<MenuDay | null>(null)

  function startEdit() {
    if (!activeMenuDay) return
    setDraft(JSON.parse(JSON.stringify(activeMenuDay)))
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setDraft(null)
  }

  function updateItem(mi: number, ii: number, field: keyof MenuItem, value: string | number) {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        comidas: prev.comidas.map((m, mmi) =>
          mmi !== mi ? m : { ...m, itens: m.itens.map((it, iii) => (iii !== ii ? it : { ...it, [field]: value })) }
        ),
      }
    })
  }

  function addItem(mi: number) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            comidas: prev.comidas.map((m, mmi) =>
              mmi !== mi ? m : { ...m, itens: [...m.itens, { alimento: '', quantidade_g: 0, kcal: 0 }] }
            ),
          }
        : prev
    )
  }

  function removeItem(mi: number, ii: number) {
    setDraft((prev) =>
      prev
        ? { ...prev, comidas: prev.comidas.map((m, mmi) => (mmi !== mi ? m : { ...m, itens: m.itens.filter((_, iii) => iii !== ii) })) }
        : prev
    )
  }

  const saveEditMut = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('Sin cambios')
      const comidas = draft.comidas.map((m) => ({ ...m, kcal: m.itens.reduce((a, it) => a + (Number(it.kcal) || 0), 0) }))
      const recomputed: MenuDay = {
        ...draft,
        comidas,
        macros: { ...draft.macros, kcal_total: comidas.reduce((a, m) => a + m.kcal, 0) },
      }
      return updateMenuDayManual(plan.planId, recomputed.dia, recomputed)
    },
    onSuccess: (savedDay) => {
      const idx = DIAS_SEMANA.indexOf(savedDay.dia)
      const next = [...days]
      next[idx] = savedDay
      setDays(next)
      onMenuReady({ semana: next.map((d, i) => d ?? fallbackDay(i)) })
      setEditMode(false)
      setDraft(null)
    },
  })

  const displayDay = editMode ? draft : activeMenuDay

  return (
    <div className="flex flex-col gap-4">
      {!weeklyMenu && days.every((d) => d === null) && !generating && (
        <Card variant="deep" className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="pointer-events-none absolute -top-16 -left-16 opacity-20 aurora-orb">
            <LogoMark size={280} />
          </div>
          <LogoMark size={52} animated />
          <p className="font-display text-xl font-semibold tracking-tight">Generador de menú semanal</p>
          <p className="max-w-md text-sm text-deep-text-2">
            Arma un plan de 7 días con recetas reales de tu acervo, respetando la distribución SMAE y el horario de
            cada tiempo de comida. Si el acervo no alcanza para lo que buscas, también puedes generarlo con IA.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button variant="primary" loading={acervoMut.isPending} onClick={() => acervoMut.mutate()} className="relative">
              📖 Generar desde el acervo
            </Button>
            <Button variant="ai" onClick={startGeneration} className="relative">
              ✨ Generar con IA
            </Button>
          </div>
          {acervoMut.isError && (
            <p className="text-xs font-medium text-danger">No se pudo generar desde el acervo — intenta con IA.</p>
          )}
        </Card>
      )}

      {(generating || days.some((d) => d !== null)) && (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-text-2">
                {generating && <Spinner className="h-3.5 w-3.5 border" />}
                {generating
                  ? 'Generando con IA…'
                  : `${statuses.filter((s) => s === 'done').length}/7 días listos`}
              </div>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(statuses.filter((s) => s !== 'pending').length / 7) * 100}%`,
                    background: 'linear-gradient(90deg,var(--color-glow-violet),var(--color-glow-cyan))',
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {DIAS_SEMANA.map((dia, i) => (
                <button
                  key={dia}
                  onClick={() => statuses[i] !== 'pending' && setActiveDay(i)}
                  disabled={statuses[i] === 'pending'}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-sm font-semibold transition-colors',
                    activeDay === i ? 'border-accent bg-accent-light text-accent' : 'border-border text-text-2',
                    statuses[i] === 'pending' && 'opacity-40'
                  )}
                >
                  {statuses[i] === 'loading' && <Spinner className="h-3.5 w-3.5 border" />}
                  {statuses[i] === 'done' && <span className="text-accent">✓</span>}
                  {statuses[i] === 'error' && <span className="text-danger">✗</span>}
                  {dia}
                </button>
              ))}
            </div>
            {activeMenuDay && !editMode && (
              <div className="mt-3 flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="ai"
                  loading={regenMut.isPending && regenMut.variables === activeMenuDay.dia}
                  onClick={() => regenMut.mutate(activeMenuDay.dia)}
                >
                  ↺ Regenerar este día
                </Button>
                {!activeMenuDay.error && (
                  <Button size="sm" variant="secondary" onClick={startEdit}>
                    ✏️ Editar alimentos
                  </Button>
                )}
              </div>
            )}
          </Card>

          {streamError && <p className="text-xs text-danger">{streamError}</p>}

          {displayDay && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">{displayDay.dia}</h3>
                {editMode && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancelar</Button>
                    <Button size="sm" loading={saveEditMut.isPending} onClick={() => saveEditMut.mutate()}>
                      💾 Guardar cambios
                    </Button>
                  </div>
                )}
              </div>

              {displayDay.error ? (
                <p className="rounded-md bg-danger-light px-3 py-2 text-xs text-danger">
                  No se pudo generar este día ({displayDay.error}). Intenta regenerar.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayDay.comidas.map((meal, mi) => (
                    <div key={mi} className="rounded-md border border-border p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-text">{meal.tiempo}</span>
                        <span className="text-text-3">
                          {editMode ? meal.itens.reduce((a, it) => a + (Number(it.kcal) || 0), 0) : meal.kcal} kcal
                        </span>
                      </div>
                      {editMode ? (
                        <div className="flex flex-col gap-1.5">
                          {meal.itens.map((item, ii) => (
                            <div key={ii} className="flex items-center gap-1.5">
                              <div className="min-w-0 flex-1">
                                <Input
                                  value={item.alimento}
                                  onChange={(e) => updateItem(mi, ii, 'alimento', e.target.value)}
                                  placeholder="Alimento"
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div className="w-16 shrink-0">
                                <Input
                                  type="number"
                                  value={item.quantidade_g}
                                  onChange={(e) => updateItem(mi, ii, 'quantidade_g', parseFloat(e.target.value) || 0)}
                                  placeholder="g"
                                  className="h-7 text-center text-xs"
                                />
                              </div>
                              <span className="shrink-0 text-[10px] text-text-3">g</span>
                              <div className="w-16 shrink-0">
                                <Input
                                  type="number"
                                  value={item.kcal}
                                  onChange={(e) => updateItem(mi, ii, 'kcal', parseFloat(e.target.value) || 0)}
                                  placeholder="kcal"
                                  className="h-7 text-center text-xs"
                                />
                              </div>
                              <span className="shrink-0 text-[10px] text-text-3">kcal</span>
                              <button onClick={() => removeItem(mi, ii)} className="shrink-0 text-danger hover:opacity-70">×</button>
                            </div>
                          ))}
                          <Button size="sm" variant="ghost" className="w-fit" onClick={() => addItem(mi)}>
                            + Agregar alimento
                          </Button>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  ))}
                  <div className="flex justify-between rounded-md bg-bg px-3 py-2 text-xs font-medium text-text-2">
                    <span>Total del día</span>
                    {editMode ? (
                      <span>{displayDay.comidas.reduce((a, m) => a + m.itens.reduce((b, it) => b + (Number(it.kcal) || 0), 0), 0)} kcal</span>
                    ) : (
                      <span>
                        {displayDay.macros.kcal_total} kcal · P {displayDay.macros.proteina_g}g · C{' '}
                        {displayDay.macros.carb_g}g · G {displayDay.macros.gordura_g}g
                      </span>
                    )}
                  </div>
                  {editMode && (
                    <p className="text-[11px] text-text-3">
                      Los totales de proteína/carbohidratos/grasa del día no se recalculan automáticamente al editar
                      alimentos a mano — ajusta la auditoría si necesitas que coincidan exactamente.
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}

          {allDone && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" loading={acervoMut.isPending} onClick={() => acervoMut.mutate()}>
                📖 Regenerar desde acervo
              </Button>
              <Button variant="secondary" onClick={startGeneration}>
                ✨ Regenerar con IA
              </Button>
              <Button variant="primary" onClick={onContinue}>Continuar al resumen →</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
