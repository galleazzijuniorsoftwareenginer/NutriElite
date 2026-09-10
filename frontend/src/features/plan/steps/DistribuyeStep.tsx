import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getMealDistribution, saveMealDistribution, getAudit } from '../../../api/plans'
import type { MealSlot } from '../../../types'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Field'
import type { WizardPlanData } from '../planTypes'
import { clampAdjustment, gramsFromPct } from '../planMath'

/** Reparte `total` porciones enteras entre los pesos dados (%) sin perder ni sumar de más,
 * usando el método de mayores restos: cada celda recibe el piso de su parte proporcional
 * y las unidades sobrantes van a las celdas con mayor resto decimal. */
function distributePortions(total: number, weights: number[]): number[] {
  const sumW = weights.reduce((a, b) => a + b, 0)
  if (total <= 0 || sumW <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (w / sumW) * total)
  const floors = raw.map(Math.floor)
  let remainder = total - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  const result = [...floors]
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    result[order[k].i] += 1
  }
  return result
}

interface Props {
  plan: WizardPlanData
  carbPct: number
  protPct: number
  fatPct: number
  kcalAdjustment: number
  onContinue: () => void
}

const DEFAULT_ITEMS: MealSlot[] = [
  { tiempo: 'Desayuno', pct: 25, horario: '08:00' },
  { tiempo: 'Colación matutina', pct: 10, horario: '11:00' },
  { tiempo: 'Comida', pct: 30, horario: '14:00' },
  { tiempo: 'Colación vespertina', pct: 10, horario: '17:00' },
  { tiempo: 'Cena', pct: 20, horario: '20:00' },
  { tiempo: 'Colación nocturna', pct: 5, horario: '22:00' },
]

export function DistribuyeStep({ plan, carbPct, protPct, fatPct, kcalAdjustment, onContinue }: Props) {
  const get = plan.originalGet + clampAdjustment(kcalAdjustment)
  const { carbG, protG, fatG } = gramsFromPct(get, carbPct, protPct, fatPct)

  const auditOverride = useMemo(
    () => ({ protein_g: protG, carbs_g: carbG, fats_g: fatG }),
    [protG, carbG, fatG]
  )
  const { data: audit } = useQuery({
    queryKey: ['audit', plan.planId, auditOverride],
    queryFn: () => getAudit(plan.planId, auditOverride),
  })

  const { data: loaded } = useQuery({
    queryKey: ['meal-distribution', plan.planId],
    queryFn: () => getMealDistribution(plan.planId),
  })

  const [items, setItems] = useState<MealSlot[]>(DEFAULT_ITEMS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (loaded && loaded.length > 0) setItems(loaded)
  }, [loaded])

  const saveMut = useMutation({
    mutationFn: () => saveMealDistribution(plan.planId, items),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const sum = items.reduce((acc, i) => acc + i.pct, 0)
  const isValid = Math.round(sum) === 100

  function update(idx: number, field: keyof MealSlot, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  function addSlot() {
    setItems((prev) => [...prev, { tiempo: 'Nueva colación', pct: 0, horario: '' }])
  }

  function removeSlot(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="overflow-x-auto lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">Distribuye {get.toFixed(0)} kcal por tiempo de comida</h3>
          <Button size="sm" variant="secondary" onClick={addSlot}>+ Agregar tiempo</Button>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-text-3">
              <th className="py-2 font-medium">Tiempo</th>
              <th className="font-medium">Horario</th>
              <th className="font-medium">%</th>
              <th className="font-medium">Kcal</th>
              <th className="font-medium">Prot</th>
              <th className="font-medium">Carb</th>
              <th className="font-medium">Grasa</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((slot, i) => {
              const slotKcal = (get * slot.pct) / 100
              const factor = slot.pct / 100
              return (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-2">
                    <Input
                      value={slot.tiempo}
                      onChange={(e) => update(i, 'tiempo', e.target.value)}
                      className="h-7 w-36 text-xs"
                    />
                  </td>
                  <td>
                    <Input
                      type="time"
                      value={slot.horario || ''}
                      onChange={(e) => update(i, 'horario', e.target.value)}
                      className="h-7 w-24 text-xs"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={slot.pct}
                      onChange={(e) => update(i, 'pct', parseFloat(e.target.value) || 0)}
                      className="h-7 w-16 text-center text-xs"
                    />
                  </td>
                  <td className="text-text-2">{slotKcal.toFixed(0)}</td>
                  <td className="text-text-2">{(protG * factor).toFixed(1)}g</td>
                  <td className="text-text-2">{(carbG * factor).toFixed(1)}g</td>
                  <td className="text-text-2">{(fatG * factor).toFixed(1)}g</td>
                  <td>
                    <button onClick={() => removeSlot(i)} className="text-danger hover:opacity-70">×</button>
                  </td>
                </tr>
              )
            })}
            <tr className="font-semibold text-text">
              <td className="py-2" colSpan={2}>TOTAL</td>
              <td className={isValid ? 'text-accent' : 'text-warn'}>{sum.toFixed(0)}%</td>
              <td colSpan={4} />
            </tr>
          </tbody>
        </table>
        {!isValid && (
          <p className="mt-2 text-xs font-medium text-warn">
            Los porcentajes deben sumar 100% (van {sum.toFixed(0)}%) para poder guardar y continuar.
          </p>
        )}
      </Card>

      {audit && audit.smae_table.length > 0 && (
        <Card className="overflow-x-auto lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-text">Porciones SMAE por tiempo de comida</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-3">
                <th className="py-2 font-medium">Grupo</th>
                {items.map((slot, i) => (
                  <th key={i} className="text-center font-medium">{slot.tiempo}</th>
                ))}
                <th className="text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {audit.smae_table.map((row, ri) => {
                const perSlot = distributePortions(row.portions, items.map((s) => s.pct))
                return (
                  <tr key={ri} className="border-b border-border/60">
                    <td className="py-2">
                      <span className="rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-medium text-accent">{row.group}</span>
                      {row.subgroup && <span className="ml-1 text-text-3">{row.subgroup}</span>}
                    </td>
                    {perSlot.map((p, si) => (
                      <td key={si} className="text-center text-text-2">{p || '—'}</td>
                    ))}
                    <td className="text-center font-semibold text-text">{row.portions}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-text-3">
            Reparto sugerido de porciones SMAE según el % de cada tiempo de comida — ajusta el % arriba para redistribuir.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-text">¿Para qué sirve este paso?</h3>
          <p className="text-xs text-text-2">
            Define cuánta energía va en cada tiempo de comida y a qué hora se sugiere tomarlo. El generador de menú con
            IA respetará esta distribución en vez de un reparto genérico — y puedes seguir ajustándola manualmente
            en cualquier momento antes de generar el menú.
          </p>
        </Card>

        <Button variant="secondary" loading={saveMut.isPending} disabled={!isValid} onClick={() => saveMut.mutate()} className="w-full">
          {saved ? '✓ Distribución guardada' : '💾 Guardar distribución'}
        </Button>

        <Button
          onClick={async () => {
            if (!isValid) return
            await saveMut.mutateAsync()
            onContinue()
          }}
          disabled={!isValid}
          className="w-full"
        >
          Continuar a Menú IA →
        </Button>
      </div>
    </div>
  )
}
