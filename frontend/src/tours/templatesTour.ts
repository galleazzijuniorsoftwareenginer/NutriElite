import type { TourStep } from '../store/tourStore'

export const TEMPLATES_TOUR_ID = 'templates'

export const templatesTourSteps: TourStep[] = [
  {
    target: '[data-tour="templates-mias"]',
    title: 'Mis plantillas',
    body: 'Planes que tú mismo guardaste desde el Resumen de un plan — reutilízalos con un nuevo paciente en un clic.',
  },
  {
    target: '[data-tour="templates-biblioteca"]',
    title: 'Biblioteca clínica',
    body: 'Plantillas prediseñadas por patología (renal, diabetes, embarazo, etc.) para arrancar un plan más rápido en casos comunes.',
  },
]
