import type { TourStep } from '../store/tourStore'

export const AGENDA_TOUR_ID = 'agenda'

export const agendaTourSteps: TourStep[] = [
  {
    target: '[data-tour="agenda-agendar-cita"]',
    title: 'Agendar cita',
    body: 'Programa una cita con un paciente — si tiene email registrado, recibe una confirmación automática por correo.',
  },
  {
    target: '[data-tour="agenda-nueva-consulta"]',
    title: 'Nueva consulta',
    body: 'Registra una consulta (ABCD) directo desde la agenda, sin tener que entrar primero al expediente del paciente.',
  },
  {
    target: '[data-tour="agenda-vista"]',
    title: 'Lista o grid semanal',
    body: 'Cambia entre una lista cronológica de citas o una cuadrícula semanal tipo calendario.',
  },
]
