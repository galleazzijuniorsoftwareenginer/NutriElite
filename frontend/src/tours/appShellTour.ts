import type { TourStep } from '../store/tourStore'

export const APP_SHELL_TOUR_ID = 'app-shell'

// Recorrido inicial de orientación: apunta a cada entrada de la navegación
// principal (misma convención data-tour="..." que usan las mini-tutoriales
// de cada sección, ver AppShell.tsx).
export const appShellTourSteps: TourStep[] = [
  {
    target: '[data-tour="nav-nuevo-plan"]',
    title: 'Crea un plan nuevo',
    body: 'Aquí inicias el asistente completo: datos del paciente, cálculo metabólico, distribución SMAE y menú semanal con IA.',
  },
  {
    target: '[data-tour="nav-pacientes"]',
    title: 'Pacientes',
    body: 'Registra y consulta el historial clínico, consultas y evaluaciones de cada paciente.',
  },
  {
    target: '[data-tour="nav-agenda"]',
    title: 'Agenda',
    body: 'Programa citas y envía recordatorios automáticos por email.',
  },
  {
    target: '[data-tour="nav-plantillas"]',
    title: 'Plantillas',
    body: 'Reutiliza planes guardados o plantillas clínicas por patología para arrancar más rápido.',
  },
  {
    target: '[data-tour="nav-recetas"]',
    title: 'Recetas',
    body: 'Explora tu acervo de recetas con sus micronutrientes, y guarda tus favoritas.',
  },
  {
    target: '[data-tour="nav-referencia"]',
    title: 'Referencia',
    body: 'Consulta fórmulas metabólicas, la guía SMAE y el resumen KDOQI cuando lo necesites.',
  },
  {
    target: '[data-tour="nav-salon"]',
    title: 'Salón de clase',
    body: 'Si eres profesor, crea una clase con código de acceso. Si eres estudiante, únete con el código y practica con pacientes ficticios.',
  },
  {
    target: '[data-tour="nav-configuracion"]',
    title: 'Configuración',
    body: 'Ajusta tu perfil profesional, el logo que aparece en tus PDFs y tu suscripción.',
  },
]
