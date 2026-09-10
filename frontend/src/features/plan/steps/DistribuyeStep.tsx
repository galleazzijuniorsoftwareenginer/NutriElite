import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getMealDistribution, saveMealDistribution } from '../../../api/plans'
import type { MealSlot } from '../../../types'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Field'
import type { WizardPlanData } from '../planTypes'
import { clampAdjustment, gramsFromPct } from '../planMath'

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
