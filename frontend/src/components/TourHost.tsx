import { useEffect, useState } from 'react'
import { useTourStore } from '../store/tourStore'
import { Button } from './Button'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function resolveTarget(selector: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(selector)
  for (const el of matches) {
    if (el.offsetParent !== null) return el
  }
  return matches[0] ?? null
}

const PADDING = 6

/** Móntalo una sola vez (en AppShell, donde viven los elementos de
 * navegación que los tours señalan). Escucha tourStore y dibuja un
 * "spotlight" (recorte oscurecido) sobre el elemento `data-tour` activo
 * más un popover con el texto del paso — sin dependencias extra. */
export function TourHost() {
  const { tourId, steps, stepIndex, next, prev, stop } = useTourStore()
  const [rect, setRect] = useState<Rect | null>(null)

  const step = tourId ? steps[stepIndex] : null

  useEffect(() => {
    if (!step) {
      setRect(null)
      return
    }

    function measure() {
      const el = step && resolveTarget(step.target)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  if (!tourId || !step) return null

  const isLast = stepIndex === steps.length - 1

  // Si el elemento objetivo no está visible (ruta distinta, breakpoint
  // distinto, etc.), no bloqueamos la pantalla con un overlay sin sentido —
  // simplemente se salta el tour.
  if (!rect) return null

  const spotlightRect: Rect = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  }

  const popoverTop = Math.min(spotlightRect.top + spotlightRect.height + 12, window.innerHeight - 180)
  const popoverLeft = Math.min(Math.max(spotlightRect.left, 16), window.innerWidth - 304)

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="pointer-events-none absolute rounded-lg transition-all duration-200"
        style={{
          top: spotlightRect.top,
          left: spotlightRect.left,
          width: spotlightRect.width,
          height: spotlightRect.height,
          boxShadow: '0 0 0 9999px rgba(15, 15, 25, 0.6)',
        }}
      />
      <button
        aria-label="Cerrar tour"
        onClick={stop}
        className="absolute inset-0 cursor-default"
        style={{ background: 'transparent' }}
      />
      <div
        className="absolute w-72 rounded-lg border border-border bg-surface p-4 shadow-float"
        style={{ top: popoverTop, left: popoverLeft }}
      >
        <p className="text-sm font-semibold text-text">{step.title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-text-2">{step.body}</p>
        <div className="mt-3.5 flex items-center justify-between">
          <span className="text-[11px] text-text-3">
            {stepIndex + 1} de {steps.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={stop} className="px-2 py-1 text-[11px] font-medium text-text-3 hover:text-text-2">
              Saltar
            </button>
            {stepIndex > 0 && (
              <Button size="sm" variant="ghost" onClick={prev}>
                Atrás
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={next}>
              {isLast ? 'Terminar' : 'Siguiente'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
