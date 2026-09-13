import type { ReactNode } from 'react'
import { Logo } from '../../components/Logo'
import { LanguageSelector } from '../../components/LanguageSelector'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="aurora-bg relative hidden flex-col justify-between overflow-hidden p-10 text-deep-text lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative flex items-center justify-between">
          <Logo size={30} dark />
          <LanguageSelector dark />
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium tracking-wide text-deep-text-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-2" />
            Plataforma clínica
          </span>
          <p className="mt-4 font-display text-[2.1rem] font-semibold leading-[1.15] tracking-tight text-deep-text">
            Precisión clínica.
            <br />
            <span style={{ color: 'var(--color-accent-2)' }}>Nutrición inteligente.</span>
          </p>
          <p className="mt-4 text-sm text-deep-text-2">
            Cálculo metabólico, distribución SMAE y menús semanales generados por IA en tiempo real — todo en un
            solo flujo pensado para nutricionistas clínicos.
          </p>
        </div>

        <p className="relative text-xs text-deep-text-2/70">© {new Date().getFullYear()} NutriElite</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo size={28} />
            <LanguageSelector />
          </div>
          <h1 className="text-balance font-display text-[1.75rem] font-semibold tracking-tight text-text">{title}</h1>
          <p className="mt-1.5 text-sm text-text-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
