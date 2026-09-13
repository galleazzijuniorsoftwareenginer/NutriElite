import type { TourStep } from '../store/tourStore'

export const RECIPES_TOUR_ID = 'recipes'

export const recipesTourSteps: TourStep[] = [
  {
    target: '[data-tour="recipes-tabs"]',
    title: 'Todas o tus favoritas',
    body: 'Explora el acervo completo o solo las recetas que marcaste con ★ — útil para armar menús más rápido.',
  },
  {
    target: '[data-tour="recipes-search"]',
    title: 'Busca y revisa micros',
    body: 'Busca por nombre y abre cualquier receta: verás sus ingredientes y un panel de micronutrientes calculado desde datos reales de USDA.',
  },
]
