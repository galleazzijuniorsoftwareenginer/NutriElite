import { Modal } from './Modal'
import { Button } from './Button'
import { Logo } from './Logo'

const STEPS = [
  { title: 'Registra a tus pacientes', desc: 'Guarda datos de contacto e historial para reutilizarlos en cada plan.' },
  { title: 'Calcula el plan en minutos', desc: 'TMB, GET, distribución SMAE y auditoría clínica en un solo flujo guiado.' },
  { title: 'Genera el menú con IA', desc: 'Un cardápio semanal completo con platillos mexicanos, listo para exportar en PDF con tu marca.' },
]

export function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} width={520}>
      <div className="flex flex-col items-center gap-1 pb-2 text-center">
        <Logo size={28} />
        <p className="mt-3 font-display text-xl font-semibold text-text">Bienvenido a NutriElite</p>
        <p className="text-sm text-text-2">Tu flujo clínico completo, potenciado con IA.</p>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-3 rounded-md bg-bg p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-light text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-text">{s.title}</p>
              <p className="text-xs text-text-2">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={onClose} className="mt-5 w-full">
        Empezar
      </Button>
    </Modal>
  )
}
