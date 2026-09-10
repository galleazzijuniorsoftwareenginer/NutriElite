import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getAudit } from '../../../api/plans'
import { listFoodGroups } from '../../../api/food'
import type { FoodGroupItem } from '../../../types'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Field'
import type { WizardPlanData } from '../planTypes'
import { OMS_RANGES, clampAdjustment, gramsFromPct, inRange } from '../planMath'

interface Props {
  plan: WizardPlanData
  carbPct: number
  protPct: number
  fatPct: number
  kcalAdjustment: number
  onAdjustPct: (pct: { carbPct: number; protPct: number; fatPct: number }) => void
  onContinue: () => void
}

interface EditableRow {
  group: string
  subgroup: string | null
  portions: number
  unitKcal: number
  unitProtein: number
  unitFats: number
  unitCarbs: number
}

/** Orden fijo de las 17 variantes SMAE (igual a Avena) — se muestran todas
 * siempre, con 0 porciones en las que el cálculo automático no usó, en vez
 * de solo la variante que el algoritmo eligió según el objetivo. */
const SMAE_ROW_ORDER: { group: string; subgroup: string | null }[] = [
  { group: 'Verduras', subgroup: null },
  { group: 'Frutas', subgroup: null },
  { group: 'Cereales y tuberculos', subgroup: 'Sin grasa' },
  { group: 'Cereales y tuberculos', subgroup: 'Con grasa' },
  { group: 'Leguminosas', subgroup: null },
  { group: 'Alimentos de origen animal', subgroup: 'Muy bajo aporte grasa' },
  { group: 'Alimentos de origen animal', subgroup: 'Bajo aporte grasa' },
  { group: 'Alimentos de origen animal', subgroup: 'Moderado aporte grasa' },
  { group: 'Alimentos de origen animal', subgroup: 'Alto aporte grasa' },
  { group: 'Leche', subgroup: 'Descremada' },
  { group: 'Leche', subgroup: 'Semidescremada' },
  { group: 'Leche', subgroup: 'Entera' },
  { group: 'Leche', subgroup: 'Con azucar' },
  { group: 'Aceites y Grasas', subgroup: 'Sin proteinas' },
  { group: 'Aceites y Grasas', subgroup: 'Con proteinas' },
  { group: 'Azucares', subgroup: 'Sin grasa' },
  { group: 'Azucares', subgroup: 'Con grasa' },
]

const PIE_COLORS = ['var(--color-carb)', 'var(--color-prot)', 'var(--color-fat)']

function RangeBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ok ? 'bg-accent-light text-accent' : 'bg-warn-light text-warn'}`}>
      {ok ? '✓ Dentro' : '✗ Fuera'}
    </span>
  )
}

function GapLine({ label, contributed, target, unit }: { label: string; contributed: number; target: number; unit: string }) {
  const gap = target - contributed
  const done = Math.abs(gap) < 0.5
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-2">{label}</span>
      <span className={`font-medium ${done ? 'text-accent' : gap > 0 ? 'text-warn' : 'text-danger'}`}>
        {contributed.toFixed(1)}
        {unit} · {done ? 'Completo' : gap > 0 ? `Faltan ${gap.toFixed(1)}${unit}` : `Sobran ${(-gap).toFixed(1)}${unit}`}
      </span>
    </div>
  )
}

export function AuditoriaStep({ plan, carbPct, protPct, fatPct, kcalAdjustment, onAdjustPct, onContinue }: Props) {
  const get = plan.originalGet + clampAdjustment(kcalAdjustment)
  const override = useMemo(() => {
    const g = gramsFromPct(get, carbPct, protPct, fatPct)
    return { protein_g: g.protG, carbs_g: g.carbG, fats_g: g.fatG }
  }, [get, carbPct, protPct, fatPct])

  const { data: audit } = useQuery({
    queryKey: ['audit', plan.planId, override],
    queryFn: () => getAudit(plan.planId, override),
  })

  const { data: foodGroups } = useQuery({
    queryKey: ['food-groups'],
    queryFn: listFoodGroups,
    staleTime: Infinity,
  })

  const [rows, setRows] = useState<EditableRow[]>([])
  useEffect(() => {
    if (!audit || !foodGroups || foodGroups.length === 0) return
    const auditByKey: Record<string, (typeof audit.smae_table)[number]> = {}
    for (const r of audit.smae_table) auditByKey[r.group + '|' + (r.subgroup || '')] = r
    const foodByKey: Record<string, FoodGroupItem> = {}
    for (const f of foodGroups) foodByKey[f.group_name + '|' + (f.subgroup_name || '')] = f

    setRows(
      SMAE_ROW_ORDER.map(({ group, subgroup }) => {
        const key = group + '|' + (subgroup || '')
        const food = foodByKey[key]
        const auditRow = auditByKey[key]
        const portions = auditRow?.portions ?? 0
        return {
          group,
          subgroup,
          portions,
          unitKcal: food?.kcal ?? 0,
          unitProtein: food?.protein ?? 0,
          unitFats: food?.fats ?? 0,
          unitCarbs: food?.carbs ?? 0,
        }
      })
    )
  }, [audit, foodGroups])

  function updatePortions(idx: number, newPortions: number) {
    setRows((prev) => {
      const next = [...prev]
      const row = next[idx]
      const max = row.group === 'Alimentos de origen animal' ? 8 : 99
      next[idx] = { ...row, portions: Math.max(0, Math.min(newPortions, max)) }
      return next
    })
  }

  const totals = rows.reduce(
    (acc, r) => ({
      kcal: acc.kcal + r.portions * r.unitKcal,
      protein: acc.protein + r.portions * r.unitProtein,
      fats: acc.fats + r.portions * r.unitFats,
      carbs: acc.carbs + r.portions * r.unitCarbs,
    }),
    { kcal: 0, protein: 0, fats: 0, carbs: 0 }
  )
  const realCarbPct = totals.kcal > 0 ? (totals.carbs * 4 * 100) / totals.kcal : 0
  const realProtPct = totals.kcal > 0 ? (totals.protein * 4 * 100) / totals.kcal : 0
  const realFatPct = totals.kcal > 0 ? (totals.fats * 9 * 100) / totals.kcal : 0
  const diff = totals.kcal - get
  const closureOk = get > 0 ? Math.abs(diff) / get < 0.1 : true

  const pieData = [
    { name: 'Carbohidratos', value: totals.carbs * 4 },
    { name: 'Proteína', value: totals.protein * 4 },
    { name: 'Grasas', value: totals.fats * 9 },
  ]

  function handleAdjustDietocalculo() {
    if (totals.kcal === 0) return
    const newCarb = Math.round(realCarbPct)
    const newProt = Math.round(realProtPct)
    const newFat = 100 - newCarb - newProt
    onAdjustPct({ carbPct: newCarb, protPct: newProt, fatPct: newFat })
  }

  if (!audit || !foodGroups || rows.length === 0) {
    return <Card className="py-16 text-center text-sm text-text-3">Calculando auditoría…</Card>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="text-center">
          <p className="font-display text-xl font-semibold text-carb">{totals.carbs.toFixed(1)}g</p>
          <p className="text-xs text-text-2">Carbohidratos ({realCarbPct.toFixed(1)}%)</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-xl font-semibold text-prot">{totals.protein.toFixed(1)}g</p>
          <p className="text-xs text-text-2">Proteína ({realProtPct.toFixed(1)}%)</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-xl font-semibold text-fat">{totals.fats.toFixed(1)}g</p>
          <p className="text-xs text-text-2">Grasas ({realFatPct.toFixed(1)}%)</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-xl font-semibold text-text">{totals.kcal.toFixed(0)}</p>
          <p className="text-xs text-text-2">kcal totales</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-x-auto lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-text">Distribución SMAE (editable)</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-text-3">
                <th className="py-2 font-medium">Grupo</th>
                <th className="font-medium">Subgrupo</th>
                <th className="font-medium">Porciones</th>
                <th className="font-medium">Kcal</th>
                <th className="font-medium">Prot</th>
                <th className="font-medium">Grasa</th>
                <th className="font-medium">Carb</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rowKcal = row.portions * row.unitKcal
                const rowProtein = row.portions * row.unitProtein
                const rowFats = row.portions * row.unitFats
                const rowCarbs = row.portions * row.unitCarbs
                return (
                  <tr key={i} className={`border-b border-border/60 ${row.portions === 0 ? 'opacity-50' : ''}`}>
                    <td className="py-2">
                      <span className="rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-medium text-accent">{row.group}</span>
                    </td>
                    <td className="text-text-2">{row.subgroup || '—'}</td>
                    <td>
                      <Input
                        type="number"
                        min={0}
                        value={row.portions}
                        onChange={(e) => updatePortions(i, parseInt(e.target.value, 10) || 0)}
                        className="h-7 w-14 text-center text-xs"
                      />
                    </td>
                    <td>{Math.round(rowKcal)}</td>
                    <td>{rowProtein.toFixed(1)}</td>
                    <td>{rowFats.toFixed(1)}</td>
                    <td>{rowCarbs.toFixed(1)}</td>
                  </tr>
                )
              })}
              <tr className="font-semibold text-text">
                <td className="py-2" colSpan={3}>TOTAL</td>
                <td>{totals.kcal.toFixed(0)}</td>
                <td>{totals.protein.toFixed(1)}</td>
                <td>{totals.fats.toFixed(1)}</td>
                <td>{totals.carbs.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-text">Distribución real</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(0)} kcal`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              <GapLine label="Carbohidratos" contributed={totals.carbs} target={override.carbs_g} unit="g" />
              <GapLine label="Proteína" contributed={totals.protein} target={override.protein_g} unit="g" />
              <GapLine label="Grasas" contributed={totals.fats} target={override.fats_g} unit="g" />
              <GapLine label="Kcal" contributed={totals.kcal} target={get} unit="" />
            </div>
            <div className="mt-3 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-2">Carbohidratos (OMS 45-65%)</span>
                <RangeBadge ok={inRange(realCarbPct, OMS_RANGES.carb)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-2">Proteína (OMS 10-35%)</span>
                <RangeBadge ok={inRange(realProtPct, OMS_RANGES.prot)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-2">Grasas (OMS 20-35%)</span>
                <RangeBadge ok={inRange(realFatPct, OMS_RANGES.fat)} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-text">Cierre energético</h3>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-2">SMAE real vs meta</span>
              <span className={`font-semibold ${closureOk ? 'text-accent' : 'text-warn'}`}>
                {diff >= 0 ? '+' : ''}
                {diff.toFixed(0)} kcal
              </span>
            </div>
            <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={handleAdjustDietocalculo}>
              ↺ Ajustar Dietocálculo con estos %
            </Button>
          </Card>

          <Button onClick={onContinue} className="w-full">
            Generar menú con IA →
          </Button>
        </div>
      </div>
    </div>
  )
}
