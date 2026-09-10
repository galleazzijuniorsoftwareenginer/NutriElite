import { useMemo } from 'react'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import type { WizardPlanData } from '../planTypes'
import { checkClinicalAlerts, clampAdjustment, gramsFromPct } from '../planMath'

interface Props {
  plan: WizardPlanData
  carbPct: number
  protPct: number
  fatPct: number
  kcalAdjustment: number
  onChangePct: (pct: { carbPct?: number; protPct?: number; fatPct?: number }) => void
  onChangeAdjustment: (adj: number) => void
  onContinue: () => void
}

function MacroSlider({
  label,
  value,
  color,
  onChange,
}: {
  label: string
  value: number
  color: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-2">{label}</span>
        <span className="font-semibold text-text">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-current"
        style={{ color }}
      />
    </div>
  )
}

export function DietocalculoStep({
  plan,
  carbPct,
  protPct,
  fatPct,
  kcalAdjustment,
  onChangePct,
  onChangeAdjustment,
  onContinue,
}: Props) {
  const get = plan.originalGet + clampAdjustment(kcalAdjustment)
  const { carbG, protG, fatG } = gramsFromPct(get, carbPct, protPct, fatPct)
  const sum = carbPct + protPct + fatPct
  const isValid = Math.round(sum) === 100
  const imc = plan.weight && plan.height ? plan.weight / (plan.height / 100) ** 2 : null

  const alerts = useMemo(
    () =>
      checkClinicalAlerts({
        tmb: plan.tmb,
        originalGet: plan.originalGet,
        get,
        gProt: protG,
        peso: plan.weight,
        goal: plan.goal,
        carbPct,
        fatPct,
      }),
    [plan, get, protG, carbPct, fatPct]
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-text-2">TMB</p>
              <p className="font-display text-xl font-semibold text-text">{plan.tmb != null ? plan.tmb.toFixed(0) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-2">GET base</p>
              <p className="font-display text-xl font-semibold text-text">{plan.originalGet != null ? plan.originalGet.toFixed(0) : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-2">IMC</p>
              <p className="font-display text-xl font-semibold text-text">{imc != null ? imc.toFixed(1) : '—'}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-2">Ajuste calórico</span>
              <span className={`font-semibold ${kcalAdjustment < 0 ? 'text-danger' : kcalAdjustment > 0 ? 'text-accent' : 'text-text-2'}`}>
                {get.toFixed(0)} kcal GET ajustado
              </span>
            </div>
            <input
              type="range"
              min={-500}
              max={500}
              step={10}
              value={kcalAdjustment}
              onChange={(e) => onChangeAdjustment(parseInt(e.target.value, 10))}
              className="w-full accent-accent"
            />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-text">Distribución de macronutrientes</h3>
          <div className="flex flex-col gap-4">
            <MacroSlider label="Carbohidratos" value={carbPct} color="var(--color-carb)" onChange={(v) => onChangePct({ carbPct: v })} />
            <MacroSlider label="Proteína" value={protPct} color="var(--color-prot)" onChange={(v) => onChangePct({ protPct: v })} />
            <MacroSlider label="Grasas" value={fatPct} color="var(--color-fat)" onChange={(v) => onChangePct({ fatPct: v })} />
          </div>

          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-bg">
            <div className="bg-carb transition-all" style={{ width: `${Math.min(carbPct, 100)}%` }} />
            <div className="bg-prot transition-all" style={{ width: `${Math.min(protPct, 100)}%` }} />
            <div className="bg-fat transition-all" style={{ width: `${Math.min(fatPct, 100)}%` }} />
          </div>

          <div className={`mt-3 rounded-md px-3 py-2 text-xs font-medium ${isValid ? 'bg-accent-light text-accent' : 'bg-warn-light text-warn'}`}>
            {isValid
              ? 'Distribución correcta — suma 100%. Lista para generar auditoría.'
              : sum < 100
                ? `Faltan ${(100 - sum).toFixed(0)}% para cerrar 100%.`
                : `Exceso de ${(sum - 100).toFixed(0)}% — reduce algún macro.`}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
            {[
              { label: 'Carb', g: carbG, kcal: carbG * 4, color: 'text-carb' },
              { label: 'Prot', g: protG, kcal: protG * 4, color: 'text-prot' },
              { label: 'Grasa', g: fatG, kcal: fatG * 9, color: 'text-fat' },
            ].map((m) => (
              <div key={m.label} className="rounded-md bg-bg p-2.5">
                <p className={`font-semibold ${m.color}`}>{m.g.toFixed(1)}g</p>
                <p className="text-text-3">{plan.weight ? `${(m.g / plan.weight).toFixed(2)} g/kg` : '—'}</p>
                <p className="text-text-3">{m.kcal.toFixed(0)} kcal</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-text">Alertas clínicas</h3>
          {alerts.length === 0 ? (
            <div className="rounded-md bg-accent-light px-3 py-2 text-xs font-medium text-accent">
              ✅ Distribución dentro de los parámetros clínicos recomendados
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-md px-3 py-2 text-xs font-medium ${a.type === 'danger' ? 'bg-danger-light text-danger' : 'bg-warn-light text-warn'}`}
                >
                  ⚠️ {a.message}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Button onClick={onContinue} disabled={!isValid} className="w-full">
          Generar auditoría SMAE →
        </Button>
      </div>
    </div>
  )
}
