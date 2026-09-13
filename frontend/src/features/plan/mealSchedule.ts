import type { MealSlot } from '../../types'

/** Horario fijo de tiempos de comida — espejo de DEFAULT_MEAL_DISTRIBUTION en
 * backend/services/recipe_menu_service.py y ai_menu_service.py. Ya no es
 * editable desde Distribuye (antes lo era vía /plans/{id}/meal-distribution);
 * se muestra tal cual aquí y junto a cada tiempo en el Menú generado. */
export const DEFAULT_MEAL_SCHEDULE: MealSlot[] = [
  { tiempo: 'Desayuno', pct: 25, horario: '08:00' },
  { tiempo: 'Colación matutina', pct: 10, horario: '11:00' },
  { tiempo: 'Comida', pct: 30, horario: '14:00' },
  { tiempo: 'Colación vespertina', pct: 10, horario: '17:00' },
  { tiempo: 'Cena', pct: 20, horario: '20:00' },
  { tiempo: 'Colación nocturna', pct: 5, horario: '22:00' },
]

export function horarioForTiempo(tiempo: string): string | null {
  const slot = DEFAULT_MEAL_SCHEDULE.find((s) => s.tiempo === tiempo)
  return slot?.horario ?? null
}
