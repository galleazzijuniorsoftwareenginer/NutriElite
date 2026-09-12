import type { AuditResponse, FoodGroupItem } from '../../types'

export interface SmaeRow {
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
 * de solo la variante que el algoritmo eligió según el objetivo. Compartido
 * entre Auditoría y Distribuye para que ambas tablas coincidan siempre. */
export const SMAE_ROW_ORDER: { group: string; subgroup: string | null }[] = [
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

export function buildSmaeRows(audit: AuditResponse, foodGroups: FoodGroupItem[]): SmaeRow[] {
  const auditByKey: Record<string, (typeof audit.smae_table)[number]> = {}
  for (const r of audit.smae_table) auditByKey[r.group + '|' + (r.subgroup || '')] = r
  const foodByKey: Record<string, FoodGroupItem> = {}
  for (const f of foodGroups) foodByKey[f.group_name + '|' + (f.subgroup_name || '')] = f

  return SMAE_ROW_ORDER.map(({ group, subgroup }) => {
    const key = group + '|' + (subgroup || '')
    const food = foodByKey[key]
    const auditRow = auditByKey[key]
    return {
      group,
      subgroup,
      portions: auditRow?.portions ?? 0,
      unitKcal: food?.kcal ?? 0,
      unitProtein: food?.protein ?? 0,
      unitFats: food?.fats ?? 0,
      unitCarbs: food?.carbs ?? 0,
    }
  })
}
