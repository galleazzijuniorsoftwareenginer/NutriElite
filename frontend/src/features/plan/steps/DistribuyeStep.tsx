import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAudit } from '../../../api/plans'
import { listFoodGroups } from '../../../api/food'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Field'
import type { WizardPlanData } from '../planTypes'
import { clampAdjustment, gramsFromPct } from '../planMath'
import { buildSmaeRows } from '../smaeRows'
import { DEFAULT_MEAL_SCHEDULE } from '../mealSchedule'

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

  const { data: foodGroups } = useQuery({
    queryKey: ['food-groups'],
    queryFn: listFoodGroups,
    staleTime: Infinity,
  })

  const smaeRows = useMemo(
    () => (audit && foodGroups ? buildSmaeRows(audit, foodGroups) : []),
    [audit, foodGroups]
  )

  const weights = DEFAULT_MEAL_SCHEDULE.map((s) => s.pct)

  // Porciones por grupo x tiempo de comida, editables a mano — se inicializan
  // con el reparto sugerido (distributePortions) pero el nutricionista puede
  // ajustar cualquier celda. Es una referencia de planeación (no se persiste
  // en el backend, que solo guarda el total de porciones por grupo del plan).
  const [cellOverrides, setCellOverrides] = useState<number[][]>([])

  useEffect(() => {
    setCellOverrides(smaeRows.map((row) => distributePortions(row.portions, weights)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smaeRows])

  function updateCell(ri: number, si: number, value: number) {
    setCellOverrides((prev) => prev.map((row, r) => (r === ri ? row.map((v, s) => (s === si ? value : v)) : row)))
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {smaeRows.length > 0 && (
        <Card className="overflow-x-auto lg:col-span-2">
          <h3 className="mb-1 text-sm font-semibold text-text">Porciones SMAE por tiempo de comida</h3>
          <p className="mb-3 text-[11px] text-text-3">
            Horario sugerido: {DEFAULT_MEAL_SCHEDULE.map((s) => `${s.tiempo} ${s.horario}`).join(' · ')}
          </p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-3">
                <th className="py-2 font-medium">Grupo</th>
                {DEFAULT_MEAL_SCHEDULE.map((slot) => (
                  <th key={slot.tiempo} className="text-center font-medium">{slot.tiempo}</th>
                ))}
                <th className="text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {smaeRows.map((row, ri) => {
                const rowCells = cellOverrides[ri] ?? weights.map(() => 0)
                const rowTotal = rowCells.reduce((a, b) => a + b, 0)
                const mismatch = rowTotal !== row.portions
                return (
                  <tr key={ri} className={`border-b border-border/60 ${row.portions === 0 ? 'opacity-50' : ''}`}>
                    <td className="py-2">
                      <span className="rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-medium text-accent">{row.group}</span>
                      {row.subgroup && <span className="ml-1 text-text-3">{row.subgroup}</span>}
                    </td>
                    {rowCells.map((v, si) => (
                      <td key={si} className="text-center">
                        <Input
                          type="number"
                          min={0}
                          value={v}
                          onChange={(e) => updateCell(ri, si, Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-7 w-14 text-center text-xs"
                        />
                      </td>
                    ))}
                    <td className={`text-center font-semibold ${mismatch ? 'text-warn' : 'text-text'}`}>
                      {rowTotal}
                      {mismatch && <span className="ml-0.5 text-[10px] font-normal">/{row.portions}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-text-3">
            Reparto sugerido de porciones SMAE según el horario de cada tiempo de comida — ajusta cualquier celda a
            mano. Cuando el total de una fila no coincide con las porciones del plan, se muestra en naranja.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-text">¿Para qué sirve este paso?</h3>
          <p className="text-xs text-text-2">
            Reparte visualmente las porciones SMAE del plan entre los tiempos de comida y horarios fijos que también
            verás en el menú generado — ajusta cualquier celda si quieres cambiar cuánto va en cada tiempo antes de
            generar el menú con IA o desde tu acervo.
          </p>
        </Card>

        <Button onClick={onContinue} className="w-full">
          Continuar a Menú IA →
        </Button>
      </div>
    </div>
  )
}
