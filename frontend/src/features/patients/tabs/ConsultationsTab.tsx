import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  createConsultation,
  deleteConsultation,
  extractLabsFromImage,
  listConsultations,
} from '../../../api/clinical'
import { createAppointment } from '../../../api/appointments'
import type { LabValue } from '../../../types/clinical'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { FieldWrap, Input } from '../../../components/Field'

function ScheduleAppointmentForm({ patientId, onSaved }: { patientId: number; onSaved: () => void }) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('30')
  const [notes, setNotes] = useState('')
  const mut = useMutation({
    mutationFn: () =>
      createAppointment({
        patient_id: patientId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(duration, 10) || 30,
        notes,
      }),
    onSuccess: onSaved,
  })
  return (
    <div className="flex flex-col gap-4">
      <FieldWrap label="Fecha y hora">
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Duración (minutos)">
        <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FieldWrap>
      <p className="text-xs text-text-3">Si el paciente tiene email registrado, recibirá una confirmación automática.</p>
      <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!scheduledAt} className="w-full">
        Agendar cita
      </Button>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function NewConsultationForm({ patientId, onSaved }: { patientId: number; onSaved: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [peso, setPeso] = useState('')
  const [talla, setTalla] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [evolucion, setEvolucion] = useState('')
  const [labs, setLabs] = useState<LabValue[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')

  const saveMut = useMutation({
    mutationFn: () =>
      createConsultation(patientId, {
        motivo_consulta: motivo,
        peso: peso ? parseFloat(peso) : null,
        talla: talla ? parseFloat(talla) : null,
        diagnostico_nutricional: diagnostico,
        evolucion,
        bioquimicos: labs,
      }),
    onSuccess: onSaved,
  })

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    setExtractError('')
    try {
      const base64 = await fileToBase64(file)
      const valores = await extractLabsFromImage(patientId, base64, file.type || 'image/jpeg')
      setLabs((prev) => [...prev, ...valores])
    } catch {
      setExtractError('No se pudo leer la imagen (¿ANTHROPIC_API_KEY configurada?). Puedes agregar los valores a mano.')
    } finally {
      setExtracting(false)
    }
  }

  function updateLab(idx: number, field: keyof LabValue, value: string) {
    setLabs((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }
  function removeLab(idx: number) {
    setLabs((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FieldWrap label="Peso (kg)">
          <Input type="number" step="0.1" value={peso} onChange={(e) => setPeso(e.target.value)} />
        </FieldWrap>
        <FieldWrap label="Talla (cm)">
          <Input type="number" step="0.1" value={talla} onChange={(e) => setTalla(e.target.value)} />
        </FieldWrap>
      </div>
      <FieldWrap label="Motivo de consulta">
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </FieldWrap>

      <FieldWrap label="Laboratorios (bioquímicos)" hint="Agrega a mano, o sube una foto del estudio para que la IA la lea">
        <div className="flex flex-col gap-2">
          {labs.map((lab, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Nombre" value={lab.nombre} onChange={(e) => updateLab(i, 'nombre', e.target.value)} className="flex-1" />
              <Input placeholder="Valor" value={lab.valor} onChange={(e) => updateLab(i, 'valor', e.target.value)} className="w-20" />
              <Input placeholder="Unidad" value={lab.unidad} onChange={(e) => updateLab(i, 'unidad', e.target.value)} className="w-20" />
              <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => removeLab(i)}>×</Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setLabs((prev) => [...prev, { nombre: '', valor: '', unidad: '' }])}>
              + Agregar valor
            </Button>
            <label className="text-xs font-medium text-accent-2 hover:underline cursor-pointer">
              📷 Leer foto de estudio con IA
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
            {extracting && <span className="text-xs text-text-3">Leyendo…</span>}
          </div>
          {extractError && <p className="text-xs text-danger">{extractError}</p>}
        </div>
      </FieldWrap>

      <FieldWrap label="Diagnóstico nutricional">
        <Input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Evolución">
        <Input value={evolucion} onChange={(e) => setEvolucion(e.target.value)} />
      </FieldWrap>

      <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending} className="w-full">
        Guardar consulta
      </Button>
    </div>
  )
}

export function ConsultationsTab({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient()
  const { data: consultations } = useQuery({
    queryKey: ['consultations', patientId],
    queryFn: () => listConsultations(patientId),
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduled, setScheduled] = useState(false)

  const deleteMut = useMutation({
    mutationFn: deleteConsultation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consultations', patientId] }),
  })

  const chartData = (consultations ?? [])
    .filter((c) => c.peso)
    .slice()
    .reverse()
    .map((c) => ({ fecha: new Date(c.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }), peso: c.peso }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Historial de consultas</h2>
        <div className="flex items-center gap-2">
          {scheduled && <span className="text-xs font-medium text-accent">✓ Cita agendada</span>}
          <Button size="sm" variant="secondary" onClick={() => setScheduleOpen(true)}>📅 Agendar cita</Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>+ Nueva consulta</Button>
        </div>
      </div>

      {chartData.length >= 2 && (
        <Card>
          <h3 className="mb-2 text-xs font-semibold text-text-2">Evolución de peso</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="var(--color-text-3)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-3)" domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip formatter={(v) => `${v} kg`} />
                <Line type="monotone" dataKey="peso" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {!consultations || consultations.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-3">Aún no hay consultas registradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {consultations.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-text">
                    {new Date(c.fecha).toLocaleDateString()} {c.peso && `· ${c.peso} kg`}
                  </p>
                  <p className="text-xs text-text-2">{c.motivo_consulta || 'Sin motivo registrado'}</p>
                  {c.diagnostico_nutricional && <p className="text-xs text-text-3">Dx: {c.diagnostico_nutricional}</p>}
                  {c.bioquimicos && c.bioquimicos.length > 0 && (
                    <p className="mt-1 text-xs text-text-3">
                      {c.bioquimicos.map((l) => `${l.nombre}: ${l.valor}${l.unidad}`).join(' · ')}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="ghost" className="text-danger shrink-0" onClick={() => deleteMut.mutate(c.id)}>
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva consulta" width={560}>
        <NewConsultationForm
          patientId={patientId}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['consultations', patientId] })
            setModalOpen(false)
          }}
        />
      </Modal>

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Agendar cita" width={420}>
        <ScheduleAppointmentForm
          patientId={patientId}
          onSaved={() => {
            setScheduleOpen(false)
            setScheduled(true)
            setTimeout(() => setScheduled(false), 3000)
          }}
        />
      </Modal>
    </div>
  )
}
