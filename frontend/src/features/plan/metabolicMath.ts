import type { Formula, Gender, Goal } from '../../types'

/**
 * Espejo en TypeScript de backend/services/metabolic_service.py y del
 * cálculo de GET en backend/services/plan_service.py — usado SOLO para la
 * previsualización en vivo antes de crear el plan (Bloque 1: Datos y
 * Dietocálculo en una sola ventana, como Avena). El valor que realmente se
 * persiste siempre viene del backend en /plan — si algún día se cambia una
 * fórmula ahí, hay que replicar el cambio aquí también.
 */
export function calculateGeb(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  formula: Formula,
  bodyFatPercent?: number | null
): number {
  const isMale = gender === 'male'

  switch (formula) {
    case 'mifflin':
      return isMale ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161

    case 'harris':
      return isMale
        ? 66.473 + 13.752 * weight + 5.003 * height - 6.775 * age
        : 655.1 + 9.563 * weight + 1.85 * height - 4.676 * age

    case 'schofield':
      if (age < 3) return isMale ? 59.512 * weight - 30.4 : 58.317 * weight - 31.1
      if (age <= 10) return isMale ? 22.7 * weight + 495 : 22.5 * weight + 499
      if (age <= 18) return isMale ? 17.5 * weight + 651 : 12.2 * weight + 746
      if (age <= 30) return isMale ? 15.057 * weight + 692.2 : 14.818 * weight + 486.6
      if (age <= 60) return isMale ? 11.472 * weight + 873.1 : 8.126 * weight + 845.6
      return isMale ? 11.711 * weight + 587.7 : 9.082 * weight + 658.5

    case 'katch': {
      const leanMass = weight * (1 - (bodyFatPercent ?? 0) / 100)
      return 370 + 21.6 * leanMass
    }

    case 'cunningham': {
      const leanMass = weight * (1 - (bodyFatPercent ?? 0) / 100)
      return 500 + 22 * leanMass
    }

    default:
      return 0
  }
}

/** GET = GEB × factor de actividad × 1.10 (ETA, opcional) — antes del ajuste por objetivo. */
export function calculateGetBase(geb: number, activityLevel: number, useEta: boolean): number {
  return geb * activityLevel * (useEta ? 1.1 : 1)
}

export function applyGoalAdjustment(getBase: number, goal: Goal): number {
  if (goal === 'cut') return getBase - 300
  if (goal === 'bulk') return getBase + 300
  return getBase
}
