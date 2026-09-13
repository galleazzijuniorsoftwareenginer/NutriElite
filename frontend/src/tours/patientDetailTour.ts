import type { TourStep } from '../store/tourStore'

export const PATIENT_DETAIL_TOUR_ID = 'patient-detail'

// Las 5 pestañas del expediente del paciente están siempre en el DOM
// (no dependen de datos cargados), así que el tour funciona de entrada.
export const patientDetailTourSteps: TourStep[] = [
  {
    target: '[data-tour="patient-tab-planes"]',
    title: 'Planes',
    body: 'El historial de planes generados para este paciente, con su evolución de peso y GEB.',
  },
  {
    target: '[data-tour="patient-tab-clinica"]',
    title: 'Ficha clínica',
    body: 'Antecedentes heredofamiliares, patológicos y no patológicos, alergias y medicamentos actuales (NOM-004-SSA3-2012).',
  },
  {
    target: '[data-tour="patient-tab-consultas"]',
    title: 'Consultas',
    body: 'Registra cada visita con la metodología ABCD (antropométricos, bioquímicos, clínicos, dietéticos) y extrae valores de laboratorio con IA desde una foto.',
  },
  {
    target: '[data-tour="patient-tab-renal"]',
    title: 'Módulo renal',
    body: 'Calcula metas nutricionales KDOQI (kcal, proteína, sodio, potasio, fósforo, líquidos) para pacientes con ERC.',
  },
  {
    target: '[data-tour="patient-tab-diario"]',
    title: 'Diario alimentario',
    body: 'Revisa lo que el paciente registró por su cuenta en el portal — útil para ver adherencia entre consultas.',
  },
]
