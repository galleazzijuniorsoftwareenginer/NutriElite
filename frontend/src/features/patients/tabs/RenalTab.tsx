import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRenalAssessment, listRenalAssessments } from '../../../api/clinical'
import type { CkdStage, DialysisModality } from '../../../types/clinical'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { FieldWrap, Input, Select } from '../../../components/Field'

const STAGE_LABEL: Record<CkdStage, string> = {
  '1': 'Etapa 1 (TFG ≥90, daño renal con función normal)',
  '2': 'Etapa 2 (TFG 60-89, leve)',
  '3a': 'Etapa 3a (TFG 45-59, leve-moderada)',
  '3b': 'Etapa 3b (TFG 30-44, moderada-grave)',
  '4': 'Etapa 4 (TFG 15-29, grave)',
  '5': 'Etapa 5 (TFG <15, falla renal)',
}

export function RenalTab({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient()
  const { data: history } = useQuery({
    queryKey: ['renal-assessments', patientId],
    queryFn: () => listRenalAssessments(patientId),
  })

  const [stage, setStage] = useState<CkdStage>('3a')
  const [modality, setModality] = useState<DialysisModality>('none')
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [gender, setGender] = useState<'' | 'male' | 'female'>('')
  const [potassium, setPotassium] = useState('')
  const [phosphorus, setPhosphorus] = useState('')
  const [albumin, setAlbumin] = useState('')
  const [egfr, setEgfr] = useState('')

  const mut = useMutation({
    mutationFn: () =>
      createRenalAssessment(patientId, {
        ckd_stage: stage,
        dialysis_modality: modality,
        weight: parseFloat(weight),
        age: age ? parseInt(age, 10) : null,
        height_cm: height ? parseFloat(height) : null,
        gender: gender || null,
        potassium_meq_l: potassium ? parseFloat(potassium) : null,
        phosphorus_mg_dl: phosphorus ? parseFloat(phosphorus) : null,
        albumin_g_dl: albumin ? parseFloat(albumin) : null,
        egfr: egfr ? parseFloat(egfr) : null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renal-assessments', patientId] }),
  })

  const latest = history?.[0]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-text">Módulo renal (guías KDOQI 2020)</h2>
          <p className="text-xs text-text-2">
            Calcula metas iniciales de energía, proteína, sodio, potasio, fósforo y líquidos para
            enfermedad renal crónica. Son puntos de partida — ajusta siempre con criterio clínico.
          </p>
        </div>

        <FieldWrap label="Etapa de ERC">
          <Select value={stage} onChange={(e) => setStage(e.target.value as CkdStage)}>
            {Object.entries(STAGE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FieldWrap>
        <FieldWrap label="Modalidad de diálisis">
          <Select value={modality} onChange={(e) => setModality(e.target.value as DialysisModality)}>
            <option value="none">Sin diálisis</option>
            <option value="hemodialysis">Hemodiálisis</option>
            <option value="peritoneal">Diálisis peritoneal</option>
          </Select>
        </FieldWrap>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Peso (kg)">
            <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Edad">
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Talla (cm)">
            <Input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Sexo">
            <Select value={gender} onChange={(e) => setGender(e.target.value as '' | 'male' | 'female')}>
              <option value="">No especificar</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
            </Select>
          </FieldWrap>
        </div>
        <p className="text-[11px] text-text-3">
          Talla y sexo habilitan el ajuste de peso por obesidad (peso corporal ajustado) para no
          sobreestimar kcal/proteína en pacientes con peso real ≥125% del ideal.
        </p>

        <p className="text-xs font-medium text-text-2">Laboratorios (opcional, ajustan las metas)</p>
        <div className="grid grid-cols-3 gap-3">
          <FieldWrap label="K+ (mEq/L)">
            <Input type="number" step="0.1" value={potassium} onChange={(e) => setPotassium(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Fósforo (mg/dL)">
            <Input type="number" step="0.1" value={phosphorus} onChange={(e) => setPhosphorus(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Albúmina (g/dL)">
            <Input type="number" step="0.1" value={albumin} onChange={(e) => setAlbumin(e.target.value)} />
          </FieldWrap>
        </div>
        <FieldWrap label="TFG estimada (eGFR)">
          <Input type="number" step="0.1" value={egfr} onChange={(e) => setEgfr(e.target.value)} />
        </FieldWrap>

        <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!weight}>
          Calcular metas renales
        </Button>
      </Card>

      <div className="flex flex-col gap-4">
        {latest ? (
          <Card variant="deep">
            <p className="text-xs font-semibold uppercase tracking-wide text-deep-text-2">
              Última evaluación · {STAGE_LABEL[latest.ckd_stage as CkdStage]}
            </p>
            {latest.dosing_weight_kg != null && latest.dosing_weight_kg !== latest.weight && (
              <p className="mt-1 text-[11px] text-deep-text-2">
                Peso ajustado por obesidad usado en los cálculos: {latest.dosing_weight_kg}kg (peso real:{' '}
                {latest.weight}kg)
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="font-display text-xl font-semibold">{latest.kcal_total.toFixed(0)}</p>
                <p className="text-xs text-deep-text-2">kcal/día ({latest.kcal_per_kg}/kg)</p>
              </div>
              <div>
                <p className="font-display text-xl font-semibold">{latest.protein_g_total.toFixed(1)}g</p>
                <p className="text-xs text-deep-text-2">Proteína ({latest.protein_g_per_kg}g/kg)</p>
              </div>
              <div>
                <p className="font-display text-xl font-semibold">{latest.sodium_mg.toFixed(0)}mg</p>
                <p className="text-xs text-deep-text-2">Sodio</p>
              </div>
              <div>
                <p className="font-display text-xl font-semibold">{latest.potassium_mg.toFixed(0)}mg</p>
                <p className="text-xs text-deep-text-2">Potasio</p>
              </div>
              <div>
                <p className="font-display text-xl font-semibold">{latest.phosphorus_mg.toFixed(0)}mg</p>
                <p className="text-xs text-deep-text-2">Fósforo</p>
              </div>
              {latest.fluid_ml && (
                <div>
                  <p className="font-display text-xl font-semibold">{latest.fluid_ml.toFixed(0)}mL</p>
                  <p className="text-xs text-deep-text-2">Líquidos</p>
                </div>
              )}
            </div>
            {latest.notes && <p className="mt-4 text-xs leading-relaxed text-deep-text-2">{latest.notes}</p>}
          </Card>
        ) : (
          <Card className="py-10 text-center text-sm text-text-3">
            Aún no hay evaluaciones renales para este paciente.
          </Card>
        )}

        {history && history.length > 1 && (
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-xs font-semibold text-text-2">Historial</h3>
            </div>
            <ul className="divide-y divide-border">
              {history.slice(1).map((h) => (
                <li key={h.id} className="px-4 py-2.5 text-xs text-text-2">
                  {new Date(h.created_at).toLocaleDateString()} · {STAGE_LABEL[h.ckd_stage as CkdStage]} ·{' '}
                  {h.kcal_total.toFixed(0)} kcal · {h.protein_g_total.toFixed(1)}g prot
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}
