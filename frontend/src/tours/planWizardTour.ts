import type { TourStep } from '../store/tourStore'

export const PLAN_WIZARD_TOUR_ID = 'plan-wizard'

// Recorrido por las 6 pestañas del asistente "Nuevo plan" — todas están
// siempre visibles en la barra de pasos (aunque deshabilitadas hasta
// llegar a ellas), así que el tour funciona desde el primer paso.
export const planWizardTourSteps: TourStep[] = [
  {
    target: '[data-tour="wizard-step-datos"]',
    title: '1. Datos',
    body: 'Antropometría del paciente, fórmula metabólica (Mifflin, Harris-Benedict o Schofield) y objetivo (mantener, cortar o volumen).',
  },
  {
    target: '[data-tour="wizard-step-dietocalculo"]',
    title: '2. Dietocálculo',
    body: 'Ajusta el GET final (±500 kcal) y el % de macros — los gramos de proteína, carbohidratos y grasa se recalculan al momento.',
  },
  {
    target: '[data-tour="wizard-step-auditoria"]',
    title: '3. Auditoría SMAE',
    body: 'Revisa la distribución en los 8 grupos de alimentos SMAE y valida que las kcal cuadren con la regla 4-4-9.',
  },
  {
    target: '[data-tour="wizard-step-distribuye"]',
    title: '4. Distribuye',
    body: 'Reparte las porciones SMAE entre los tiempos de comida del día (desayuno, comida, cena, colaciones).',
  },
  {
    target: '[data-tour="wizard-step-menu"]',
    title: '5. Menú IA',
    body: 'Genera el menú semanal con IA o desde tu acervo de recetas, y edita cualquier alimento si hace falta.',
  },
  {
    target: '[data-tour="wizard-step-resumen"]',
    title: '6. Resumen y PDF',
    body: 'Descarga el reporte clínico en PDF, comparte el portal del paciente y guarda el plan como plantilla reutilizable.',
  },
]
