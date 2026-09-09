import type { ReactNode } from 'react'
import { Logo, LogoMark } from '../../components/Logo'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="aurora-bg relative hidden flex-col justify-between overflow-hidden p-10 text-deep-text lg:flex">
        <div className="pointer-events-none absolute -bottom-24 -right-24 opacity-[0.16] aurora-orb">
          <LogoMark size={420} />
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <Logo size={30} dark />
        <div className="relative max-w-md">
          <p className="font-display text-4xl font-semibold leading-[1.15] tracking-tight">
            Precisión clínica.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(120deg,#9f8bff,#29e0ce)' }}
            >
              Nutrición inteligente.
            </span>
          </p>
          <p className="mt-4 text-sm text-deep-text-2">
            Cálculo metabólico, distribución SMAE y menús semanales generados por IA en tiempo real —
            todo en un solo flujo pensado para nutricionistas clínicos.
          </p>
        </div>
        <p className="relative text-xs text-deep-text-2/70">© {new Date().getFullYear()} NutriElite</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size={28} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-text">{title}</h1>
          <p className="mt-1 text-sm text-text-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
