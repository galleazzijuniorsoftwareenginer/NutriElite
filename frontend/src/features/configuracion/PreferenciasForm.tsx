import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPlanPreferences, savePlanPreferences, type PlanPreferences } from '../../api/preferences'
import { Card, CardHeader, CardTitle } from '../../components/Card'
import { FieldWrap, Select, Input } from '../../components/Field'
import { Button } from '../../components/Button'

const DEFAULTS: PlanPreferences = {
  default_formula: 'mifflin',
  default_activity_level: 1.55,
  default_goal: 'cut',
  protein_pct: 25,
  fat_pct: 20,
  carb_pct: 55,
  kcal_adjustment_cut: -300,
  kcal_adjustment_bulk: 300,
}

function MacroSlider({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
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

export function PreferenciasForm() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['plan-preferences'], queryFn: getPlanPreferences })
  const [form, setForm] = useState<PlanPreferences>(DEFAULTS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMut = useMutation({
    mutationFn: savePlanPreferences,
    onSuccess: (res) => {
      queryClient.setQueryData(['plan-preferences'], res)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  function set<K extends keyof PlanPreferences>(key: K, value: PlanPreferences[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const macroSum = form.protein_pct + form.fat_pct + form.carb_pct
  const macroValid = Math.round(macroSum) === 100

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Valores por defecto al crear un plan</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrap label="Fórmula metabólica">
            <Select value={form.default_formula} onChange={(e) => set('default_formula', e.target.value as PlanPreferences['default_formula'])}>
              <option value="mifflin">Mifflin-St Jeor</option>
              <option value="harris">Harris-Benedict</option>
              <option value="schofield">Schofield (pediátrica)</option>
            </Select>
          </FieldWrap>
          <FieldWrap label="Nivel de actividad">
            <Select
              value={form.default_activity_level}
              onChange={(e) => set('default_activity_level', parseFloat(e.target.value))}
            >
              <option value="1.2">Sedentario (1.2)</option>
              <option value="1.375">Ligero (1.375)</option>
              <option value="1.55">Moderado (1.55)</option>
              <option value="1.725">Intenso (1.725)</option>
              <option value="1.9">Muy intenso (1.9)</option>
            </Select>
          </FieldWrap>
          <FieldWrap label="Objetivo">
            <Select value={form.default_goal} onChange={(e) => set('default_goal', e.target.value as PlanPreferences['default_goal'])}>
              <option value="cut">Pérdida de peso</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="bulk">Ganancia de masa</option>
            </Select>
          </FieldWrap>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de macros por defecto</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <MacroSlider label="Carbohidratos" value={form.carb_pct} color="var(--color-carb)" onChange={(v) => set('carb_pct', v)} />
          <MacroSlider label="Proteína" value={form.protein_pct} color="var(--color-prot)" onChange={(v) => set('protein_pct', v)} />
          <MacroSlider label="Grasas" value={form.fat_pct} color="var(--color-fat)" onChange={(v) => set('fat_pct', v)} />
        </div>
        <div className={`mt-4 rounded-md px-3 py-2 text-xs font-medium ${macroValid ? 'bg-accent-light text-accent' : 'bg-warn-light text-warn'}`}>
          {macroValid ? 'Suma 100% — lista para usar.' : `Suma ${macroSum.toFixed(0)}% — ajusta para llegar a 100%.`}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ajuste calórico por objetivo</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Déficit para pérdida de peso (kcal)" hint="Se resta al GET al elegir 'Pérdida de peso'.">
            <Input
              type="number"
              step="10"
              value={form.kcal_adjustment_cut}
              onChange={(e) => set('kcal_adjustment_cut', parseFloat(e.target.value) || 0)}
            />
          </FieldWrap>
          <FieldWrap label="Superávit para ganancia de masa (kcal)" hint="Se suma al GET al elegir 'Ganancia de masa'.">
            <Input
              type="number"
              step="10"
              value={form.kcal_adjustment_bulk}
              onChange={(e) => set('kcal_adjustment_bulk', parseFloat(e.target.value) || 0)}
            />
          </FieldWrap>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={() => saveMut.mutate(form)} loading={saveMut.isPending}>
          Guardar preferencias
        </Button>
        {saved && <span className="text-xs font-medium text-accent">✓ Guardado</span>}
      </div>
    </div>
  )
}
