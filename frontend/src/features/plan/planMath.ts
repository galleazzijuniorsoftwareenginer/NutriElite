import type { Goal } from '../../types'

export interface MacroGrams {
  carbG: number
  protG: number
  fatG: number
}

export function gramsFromPct(get: number, carbPct: number, protPct: number, fatPct: number): MacroGrams {
  return {
    carbG: (get * carbPct) / 100 / 4,
    protG: (get * protPct) / 100 / 4,
    fatG: (get * fatPct) / 100 / 9,
  }
}

export function clampAdjustment(adj: number) {
  return Math.max(-3000, Math.min(5000, adj))
}

export const OMS_RANGES = {
  carb: { min: 45, max: 65 },
  prot: { min: 10, max: 35 },
  fat: { min: 20, max: 35 },
}

export function inRange(value: number, range: { min: number; max: number }) {
  return value >= range.min && value <= range.max
}

export interface ClinicalAlert {
  type: 'danger' | 'warn'
  message: string
}

export function checkClinicalAlerts(params: {
  tmb: number
  originalGet: number
  get: number
  gProt: number
  peso: number
  goal: Goal
  carbPct: number
  fatPct: number
}): ClinicalAlert[] {
  const { tmb, originalGet, get, gProt, peso, goal, carbPct, fatPct } = params
  const alerts: ClinicalAlert[] = []

  if (tmb > 0 && get < tmb) {
    alerts.push({
      type: 'danger',
      message: `GET (${get.toFixed(0)} kcal) está abajo del GEB (${tmb.toFixed(0)} kcal) — riesgo metabólico`,
    })
  }

  const deficit = originalGet - get
  if (deficit > 700) {
    alerts.push({
      type: 'warn',
      message: `Déficit de ${deficit.toFixed(0)} kcal es muy agresivo — máximo seguro recomendado: 500 kcal`,
    })
  }

  const protKg = peso > 0 ? gProt / peso : 0
  if (protKg > 2.5) {
    alerts.push({
      type: 'warn',
      message: `Proteína muy alta: ${protKg.toFixed(1)}g/kg — puede sobrecargar los riñones (máx. recomendado: 2.2g/kg)`,
    })
  }
  if (protKg < 1.2 && goal !== 'maintenance') {
    alerts.push({
      type: 'warn',
      message: `Proteína baja: ${protKg.toFixed(1)}g/kg — puede causar pérdida muscular (mín. recomendado: 1.6g/kg)`,
    })
  }

  if (carbPct < OMS_RANGES.carb.min) {
    alerts.push({
      type: 'warn',
      message: `Carbohidratos (${carbPct}%) por debajo del mínimo OMS (${OMS_RANGES.carb.min}%) — puede causar fatiga y déficit de fibra`,
    })
  }
  if (fatPct < OMS_RANGES.fat.min) {
    alerts.push({
      type: 'warn',
      message: `Grasas (${fatPct}%) por debajo del mínimo OMS (${OMS_RANGES.fat.min}%) — puede afectar absorción de vitaminas A, D, E, K`,
    })
  }
  if (goal === 'cut' && deficit < -100) {
    alerts.push({ type: 'warn', message: 'Plan en superávit calórico para objetivo de pérdida de peso' })
  }

  return alerts
}

export const GOAL_LABEL: Record<Goal, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

export const FORMULA_LABEL: Record<string, string> = {
  mifflin: 'Mifflin-St Jeor',
  harris: 'Harris-Benedict',
  schofield: 'Schofield',
  katch: 'Katch-McArdle',
  cunningham: 'Cunningham',
}
