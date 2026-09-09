import type { ReactNode } from 'react'
import { Logo } from '../../components/Logo'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-accent-dark p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <Logo className="text-lg [&_span]:text-white" />
        <div className="relative max-w-md">
          <p className="font-display text-3xl font-medium leading-snug">
            Precisión clínica.
            <br />
            Nutrición inteligente.
          </p>
          <p className="mt-4 text-sm text-white/70">
            Cálculo metabólico, distribución SMAE y menús generados por IA —
            todo en un solo flujo pensado para nutricionistas clínicos.
          </p>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} NutriElite</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo className="text-lg" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-text">{title}</h1>
          <p className="mt-1 text-sm text-text-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
