import type { TourStep } from '../store/tourStore'

export const PATIENTS_LIST_TOUR_ID = 'patients-list'

// Solo apunta a elementos que existen siempre (botón y filtros), nunca a
// filas de la lista — con cero pacientes registrados esas filas no
// existirían y el tour se quedaría sin nada que resaltar.
export const patientsListTourSteps: TourStep[] = [
  {
    target: '[data-tour="patients-nuevo"]',
    title: 'Registra un paciente',
    body: 'Guarda sus datos de contacto — luego podrás generarle planes, ver su historial clínico y agendar citas.',
  },
  {
    target: '[data-tour="patients-filtros"]',
    title: 'Filtra tu lista',
    body: 'Filtra por estado (activo, en pausa, inactivo) o busca por nombre/email para encontrar un paciente rápido.',
  },
]
