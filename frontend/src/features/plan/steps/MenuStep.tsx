import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { generateAcervoMenu, regenerateDay, streamWeeklyMenu, updateMenuDayManual } from '../../../api/menu'
import { getPlanConfig, getRecipeMatches, savePlanConfig, type PlanConfig } from '../../../api/plans'
import { horarioForTiempo } from '../mealSchedule'
import { getRecipe } from '../../../api/recipes'
import type { MenuDay, MenuItem, WeeklyMenu } from '../../../types'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input, Select } from '../../../components/Field'
import { Spinner } from '../../../components/Spinner'
import { LogoMark } from '../../../components/Logo'
import { Modal } from '../../../components/Modal'
import { RecipeDetailModal } from '../../../components/RecipeDetailModal'
import { Tooltip } from '../../../components/Tooltip'
import type { WizardPlanData } from '../planTypes'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const REGIONES = [
  'México', 'España', 'Argentina', 'Colombia', 'Perú', 'Chile',
  'Estados Unidos', 'Brasil', 'Centroamérica', 'Caribe',
]

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

  const { data: loadedConfig } = useQuery({
    queryKey: ['plan-config', plan.planId],
    queryFn: () => getPlanConfig(plan.planId),
  })

  const [config, setConfig] = useState<PlanConfig>({ idioma: 'es', region: 'México', restricted_ingredients: [] })
  const [restrictedInput, setRestrictedInput] = useState('')
  const [configSaved, setConfigSaved] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  useEffect(() => {
    if (loadedConfig) setConfig(loadedConfig)
  }, [loadedConfig])

  const saveConfigMut = useMutation({
    mutationFn: () => savePlanConfig(plan.planId, config),
    onSuccess: () => {
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2000)
    },
  })

  function addRestricted() {
    const value = restrictedInput.trim()
    if (!value) return
    if (!config.restricted_ingredients.some((r) => r.toLowerCase() === value.toLowerCase())) {
      setConfig((prev) => ({ ...prev, restricted_ingredients: [...prev.restricted_ingredients, value] }))
    }
    setRestrictedInput('')
  }

  function removeRestricted(name: string) {
    setConfig((prev) => ({ ...prev, restricted_ingredients: prev.restricted_ingredients.filter((r) => r !== name) }))
  }

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
      queryClient.invalidateQueries({ queryKey: ['recipe-matches', plan.planId] })
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
      queryClient.invalidateQueries({ queryKey: ['recipe-matches', plan.planId] })
    },
  })

  const allDone = statuses.every((s) => s === 'done' || s === 'error')
  const activeMenuDay = days[activeDay]

  const queryClient = useQueryClient()
  const { data: recipeMatches } = useQuery({
    queryKey: ['recipe-matches', plan.planId],
    queryFn: () => getRecipeMatches(plan.planId),
    enabled: allDone,
  })
  const [openRecipeId, setOpenRecipeId] = useState<number | null>(null)
  const { data: openRecipe } = useQuery({
    queryKey: ['recipe', openRecipeId],
    queryFn: () => getRecipe(openRecipeId!),
    enabled: openRecipeId !== null,
  })

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
      queryClient.invalidateQueries({ queryKey: ['recipe-matches', plan.planId] })
    },
  })

  const displayDay = editMode ? draft : activeMenuDay

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <button
          onClick={() => setConfigOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <h3 className="text-sm font-semibold text-text">Configuración del menú</h3>
            <p className="text-xs text-text-2">
              {config.idioma === 'es' ? 'Español' : config.idioma === 'en' ? 'Inglés' : 'Portugués'} · {config.region}
              {config.restricted_ingredients.length > 0 && ` · ${config.restricted_ingredients.length} restricción(es)`}
            </p>
          </div>
          <span className="text-xs font-medium text-accent">{configOpen ? 'Ocultar ▲' : 'Editar ▾'}</span>
        </button>
        {configOpen && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-2">Idioma del menú</span>
                <Select
                  value={config.idioma}
                  onChange={(e) => setConfig((prev) => ({ ...prev, idioma: e.target.value as PlanConfig['idioma'] }))}
                  className="h-8 text-xs"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="pt">Portugués</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-2">Región / cocina</span>
                <Select
                  value={REGIONES.includes(config.region) ? config.region : 'Otra'}
                  onChange={(e) => setConfig((prev) => ({ ...prev, region: e.target.value }))}
                  className="h-8 text-xs"
                >
                  {REGIONES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Otra">Otra…</option>
                </Select>
                {!REGIONES.includes(config.region) && (
                  <Input
                    value={config.region}
                    onChange={(e) => setConfig((prev) => ({ ...prev, region: e.target.value }))}
                    placeholder="Escribe la región/cocina"
                    className="mt-1 h-8 text-xs"
                  />
                )}
              </label>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-2">Ingredientes restringidos</span>
              <div className="flex gap-1.5">
                <Input
                  value={restrictedInput}
                  onChange={(e) => setRestrictedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addRestricted()
                    }
                  }}
                  placeholder="Ej. Camarón, cacahuate…"
                  className="h-8 text-xs"
                />
                <Button size="sm" variant="secondary" onClick={addRestricted}>+</Button>
              </div>
              {config.restricted_ingredients.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {config.restricted_ingredients.map((ing) => (
                    <span key={ing} className="flex items-center gap-1 rounded-full bg-danger-light px-2 py-0.5 text-[10px] font-medium text-danger">
                      {ing}
                      <Tooltip label="Quitar restricción">
                        <button onClick={() => removeRestricted(ing)} aria-label={`Quitar ${ing}`} className="hover:opacity-70">×</button>
                      </Tooltip>
                    </span>
                  ))}
                </div>
              )}
              <span className="text-[11px] text-text-3">
                Alergias, intolerancias o preferencias — el generador de menú (IA o acervo) los excluirá por completo.
              </span>
            </div>
            <Button size="sm" variant="secondary" loading={saveConfigMut.isPending} onClick={() => saveConfigMut.mutate()} className="w-fit">
              {configSaved ? '✓ Configuración guardada' : '💾 Guardar configuración'}
            </Button>
          </div>
        )}
      </Card>

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
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-semibold text-text">{meal.tiempo}</span>
                          {horarioForTiempo(meal.tiempo) && (
                            <span className="text-[11px] font-normal text-text-3">· {horarioForTiempo(meal.tiempo)}</span>
                          )}
                        </span>
                        <span className="text-text-3">
                          {editMode ? meal.itens.reduce((a, it) => a + (Number(it.kcal) || 0), 0) : meal.kcal} kcal
                        </span>
                      </div>
                      {!editMode && recipeMatches?.[displayDay.dia]?.[meal.tiempo] && (
                        <button
                          onClick={() => setOpenRecipeId(recipeMatches[displayDay.dia][meal.tiempo].recipe_id)}
                          className="mb-1.5 flex w-fit items-center gap-1.5 rounded-full border border-border bg-bg px-2 py-1 text-[11px] font-medium text-text-2 hover:border-accent hover:text-accent"
                        >
                          {recipeMatches[displayDay.dia][meal.tiempo].imagen_url && (
                            <img
                              src={recipeMatches[displayDay.dia][meal.tiempo].imagen_url!}
                              alt=""
                              className="h-4 w-4 rounded-full object-cover"
                            />
                          )}
                          📖 Receta similar: {recipeMatches[displayDay.dia][meal.tiempo].nombre}
                        </button>
                      )}
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
                              <Tooltip label="Quitar alimento">
                                <button onClick={() => removeItem(mi, ii)} aria-label="Quitar alimento" className="shrink-0 text-danger hover:opacity-70">×</button>
                              </Tooltip>
                            </div>
                          ))}
                          <Button size="sm" variant="ghost" className="w-fit" onClick={() => addItem(mi)}>
                            + Agregar alimento
                          </Button>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {meal.itens.map((item, ii) => (
                            <li key={ii} className="flex items-center gap-2 text-xs text-text-2">
                              <span className="w-14 shrink-0 text-center font-medium text-text-3">{item.quantidade_g}g</span>
                              <span className="flex-1">{item.alimento}</span>
                              <span className="shrink-0 text-text-3">{item.kcal} kcal</span>
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

      <Modal open={openRecipeId !== null} onClose={() => setOpenRecipeId(null)} title="Detalle de la receta" width={700}>
        {openRecipe ? <RecipeDetailModal recipe={openRecipe} onClose={() => setOpenRecipeId(null)} /> : null}
      </Modal>
    </div>
  )
}
