import type { ReactNode } from 'react'
import { Logo } from '../../components/Logo'

function PlanPreviewCard() {
  const macros = [
    { key: 'carb', label: 'Carb', grams: 220, pct: 45, color: 'var(--color-carb)' },
    { key: 'prot', label: 'Prot', grams: 145, pct: 30, color: 'var(--color-prot)' },
    { key: 'fat', label: 'Grasa', grams: 55, pct: 25, color: 'var(--color-fat)' },
  ]
  const rows = [
    { group: 'Cereales y tubérculos', portions: '6 porciones' },
    { group: 'Alimentos de origen animal', portions: '5 porciones' },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-float backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-deep-text-2/80">Plan activo</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-deep-text">Paciente · Pérdida de peso</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-deep-text">
          1,840 kcal
        </span>
      </div>

      <div className="mt-4 flex h-2 gap-[2px] overflow-hidden rounded-full bg-white/10">
        {macros.map((m) => (
          <div key={m.key} className="rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-deep-text-2">
        {macros.map((m) => (
          <span key={m.key} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
            {m.label} {m.grams}g
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-white/10 pt-3.5">
        {rows.map((row) => (
          <div key={row.group} className="flex items-center justify-between text-xs">
            <span className="text-deep-text-2">{row.group}</span>
            <span className="font-medium text-deep-text">{row.portions}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
        <Logo size={30} dark />

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
          <div className="mt-7">
            <PlanPreviewCard />
          </div>
        </div>

        <p className="relative text-xs text-deep-text-2/70">© {new Date().getFullYear()} NutriElite</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size={28} />
          </div>
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-text">{title}</h1>
          <p className="mt-1.5 text-sm text-text-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
