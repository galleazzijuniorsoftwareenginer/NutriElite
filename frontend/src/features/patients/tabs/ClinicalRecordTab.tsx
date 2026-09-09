import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getClinicalRecord, updateClinicalRecord } from '../../../api/clinical'
import type { ClinicalRecord } from '../../../types/clinical'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { FieldWrap } from '../../../components/Field'

const EMPTY: Omit<ClinicalRecord, 'id' | 'patient_id'> = {
  antecedentes_heredofamiliares: '',
  antecedentes_patologicos: '',
  antecedentes_no_patologicos: '',
  alergias: '',
  medicamentos_actuales: '',
}

function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
    />
  )
}

export function ClinicalRecordTab({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['clinical-record', patientId], queryFn: () => getClinicalRecord(patientId) })
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data })
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => updateClinicalRecord(patientId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-record', patientId] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-xs text-text-2">
        Expediente clínico según NOM-004-SSA3-2012. Estos datos cambian poco entre consultas — el
        seguimiento de cada visita se registra en la pestaña "Consultas".
      </p>
      <FieldWrap label="Antecedentes heredofamiliares">
        <TextArea value={form.antecedentes_heredofamiliares} onChange={(v) => set('antecedentes_heredofamiliares', v)} />
      </FieldWrap>
      <FieldWrap label="Antecedentes personales patológicos">
        <TextArea value={form.antecedentes_patologicos} onChange={(v) => set('antecedentes_patologicos', v)} />
      </FieldWrap>
      <FieldWrap label="Antecedentes personales no patológicos" hint="Hábitos: tabaquismo, alcoholismo, actividad física, sueño">
        <TextArea value={form.antecedentes_no_patologicos} onChange={(v) => set('antecedentes_no_patologicos', v)} />
      </FieldWrap>
      <FieldWrap label="Alergias">
        <TextArea value={form.alergias} onChange={(v) => set('alergias', v)} />
      </FieldWrap>
      <FieldWrap label="Medicamentos actuales">
        <TextArea value={form.medicamentos_actuales} onChange={(v) => set('medicamentos_actuales', v)} />
      </FieldWrap>
      <div className="flex items-center gap-3">
        <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>
          Guardar ficha clínica
        </Button>
        {saved && <span className="text-xs font-medium text-accent">✓ Guardado</span>}
      </div>
    </Card>
  )
}
