import { useMemo } from 'react'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Input } from '../../../components/Field'
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

type MacroKey = 'carbPct' | 'protPct' | 'fatPct'

const MACROS: { key: MacroKey; label: string; color: string; factor: number; cssVar: string }[] = [
  { key: 'carbPct', label: 'Carbohidratos', color: 'text-carb', factor: 4, cssVar: 'bg-carb' },
  { key: 'protPct', label: 'Proteína', color: 'text-prot', factor: 4, cssVar: 'bg-prot' },
  { key: 'fatPct', label: 'Grasas', color: 'text-fat', factor: 9, cssVar: 'bg-fat' },
]

function num(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

function MacroRow({
  label,
  color,
  cssVar,
  pct,
  grams,
  kcal,
  gPerKg,
  weight,
  onPctChange,
  onGramsChange,
  onKcalChange,
  onGPerKgChange,
}: {
  label: string
  color: string
  cssVar: string
  pct: number
  grams: number
  kcal: number
  gPerKg: number
  weight: number
  onPctChange: (v: number) => void
  onGramsChange: (v: number) => void
  onKcalChange: (v: number) => void
  onGPerKgChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${cssVar}`} />
        <span className="text-sm font-semibold text-text">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">%</span>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Number.isFinite(pct) ? Math.round(pct * 10) / 10 : 0}
            onChange={(e) => onPctChange(num(e.target.value))}
            className={`text-sm font-semibold ${color}`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">Gramos</span>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={Number.isFinite(grams) ? Math.round(grams * 10) / 10 : 0}
            onChange={(e) => onGramsChange(num(e.target.value))}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">Kcal</span>
          <Input
            type="number"
            min={0}
            step={1}
            value={Number.isFinite(kcal) ? Math.round(kcal) : 0}
            onChange={(e) => onKcalChange(num(e.target.value))}
            className="text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-text-2">g/Kg</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            disabled={!weight}
            value={Number.isFinite(gPerKg) ? Math.round(gPerKg * 100) / 100 : 0}
            onChange={(e) => onGPerKgChange(num(e.target.value))}
            className="text-sm"
          />
        </label>
      </div>
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

  const macroValues: Record<MacroKey, { pct: number; grams: number; kcal: number }> = {
    carbPct: { pct: carbPct, grams: carbG, kcal: carbG * 4 },
    protPct: { pct: protPct, grams: protG, kcal: protG * 4 },
    fatPct: { pct: fatPct, grams: fatG, kcal: fatG * 9 },
  }

  function setFromPct(key: MacroKey, newPct: number) {
    onChangePct({ [key]: Math.max(0, newPct) } as Record<MacroKey, number>)
  }

  function setFromKcal(key: MacroKey, newKcal: number) {
    if (get <= 0) return
    setFromPct(key, (Math.max(0, newKcal) / get) * 100)
  }

  function setFromGrams(key: MacroKey, factor: number, newGrams: number) {
    setFromKcal(key, Math.max(0, newGrams) * factor)
  }

  function setFromGPerKg(key: MacroKey, factor: number, newGPerKg: number) {
    if (!plan.weight) return
    setFromGrams(key, factor, Math.max(0, newGPerKg) * plan.weight)
  }

  function handleObjetivoChange(newTarget: number) {
    if (!Number.isFinite(newTarget) || newTarget <= 0) return
    onChangeAdjustment(newTarget - plan.originalGet)
  }

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

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-2">Objetivo calórico diario (kcal)</span>
            <Input
              type="number"
              min={0}
              step={10}
              value={Math.round(get)}
              onChange={(e) => handleObjetivoChange(num(e.target.value))}
              className="text-lg font-semibold text-text"
            />
            <span className="text-[11px] text-text-3">
              {get >= plan.originalGet
                ? `+${(get - plan.originalGet).toFixed(0)} kcal sobre el GET base`
                : `${(get - plan.originalGet).toFixed(0)} kcal bajo el GET base`}
            </span>
          </label>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-text">Distribución de macronutrientes</h3>
          <div className="flex flex-col gap-3">
            {MACROS.map((m) => (
              <MacroRow
                key={m.key}
                label={m.label}
                color={m.color}
                cssVar={m.cssVar}
                pct={macroValues[m.key].pct}
                grams={macroValues[m.key].grams}
                kcal={macroValues[m.key].kcal}
                gPerKg={plan.weight ? macroValues[m.key].grams / plan.weight : 0}
                weight={plan.weight}
                onPctChange={(v) => setFromPct(m.key, v)}
                onGramsChange={(v) => setFromGrams(m.key, m.factor, v)}
                onKcalChange={(v) => setFromKcal(m.key, v)}
                onGPerKgChange={(v) => setFromGPerKg(m.key, m.factor, v)}
              />
            ))}
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
