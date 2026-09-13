import { create } from 'zustand'

export interface TourStep {
  target: string
  title: string
  body: string
}

interface TourState {
  tourId: string | null
  steps: TourStep[]
  stepIndex: number
}

interface TourStore extends TourState {
  start: (tourId: string, steps: TourStep[]) => void
  next: () => void
  prev: () => void
  stop: () => void
  isSeen: (tourId: string) => boolean
}

const SEEN_KEY = 'nutrielite_tours_seen'

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set<string>(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function markSeen(tourId: string) {
  try {
    const seen = readSeen()
    seen.add(tourId)
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)))
  } catch {
    // sin persistencia disponible — el tour funciona igual en esta sesión
  }
}

/** Motor genérico de tours guiados: cualquier página puede llamar `start(id,
 * steps)` con selectores CSS (convención `data-tour="..."`) y <TourHost/>
 * (montado una sola vez) se encarga de resaltar cada elemento y mostrar el
 * popover — sin estado local por componente, igual que confirmStore. */
export const useTourStore = create<TourStore>((set, get) => ({
  tourId: null,
  steps: [],
  stepIndex: 0,
  start: (tourId, steps) => set({ tourId, steps, stepIndex: 0 }),
  next: () => {
    const { stepIndex, steps, tourId } = get()
    if (stepIndex + 1 >= steps.length) {
      if (tourId) markSeen(tourId)
      set({ tourId: null, steps: [], stepIndex: 0 })
    } else {
      set({ stepIndex: stepIndex + 1 })
    }
  },
  prev: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
  stop: () => {
    const { tourId } = get()
    if (tourId) markSeen(tourId)
    set({ tourId: null, steps: [], stepIndex: 0 })
  },
  isSeen: (tourId) => readSeen().has(tourId),
}))
