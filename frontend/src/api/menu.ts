import { api } from './client'
import { useAuthStore } from '../store/authStore'
import type { WeeklyMenu, MenuDay } from '../types'

export async function generateWeeklyMenu(planId: number) {
  const { data } = await api.post<WeeklyMenu>(`/plans/${planId}/menu/ai`)
  return data
}

export async function regenerateDay(planId: number, dia: string) {
  const { data } = await api.post<MenuDay>(`/plans/${planId}/menu/ai/day/${encodeURIComponent(dia)}`)
  return data
}

/** Guarda ediciones manuales de un día (alimento cambiado, gramaje ajustado,
 * ítem agregado/eliminado) sin volver a llamar a la IA. */
export async function updateMenuDayManual(planId: number, dia: string, day: MenuDay) {
  const { data } = await api.put<MenuDay>(`/plans/${planId}/menu/day/${encodeURIComponent(dia)}`, day)
  return data
}

export interface MenuStreamHandlers {
  onDay: (idx: number, day: MenuDay) => void
  onDone: () => void
  onError: (message: string) => void
}

/** Abre uma conexão SSE que recebe cada día del menú semanal a medida que la
 * IA lo termina, en vez de esperar los 7 días de una sola vez. */
export function streamWeeklyMenu(planId: number, handlers: MenuStreamHandlers): () => void {
  const token = useAuthStore.getState().token
  const source = new EventSource(`/plans/${planId}/menu/ai/stream?token=${encodeURIComponent(token || '')}`)

  source.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as { idx: number; day: MenuDay }
      handlers.onDay(parsed.idx, parsed.day)
    } catch {
      // ignora mensagens malformadas
    }
  }
  source.addEventListener('done', () => {
    handlers.onDone()
    source.close()
  })
  source.addEventListener('error', () => {
    handlers.onError('La conexión con el generador de menú se interrumpió.')
    source.close()
  })

  return () => source.close()
}
