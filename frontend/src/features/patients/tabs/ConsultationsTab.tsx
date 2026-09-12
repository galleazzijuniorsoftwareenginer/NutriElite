import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  createConsultation,
  deleteConsultation,
  extractLabsFromImage,
  getGlimAssessment,
  listConsultations,
} from '../../../api/clinical'
import { createAppointment } from '../../../api/appointments'
import type { Consultation, LabValue } from '../../../types/clinical'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Modal } from '../../../components/Modal'
import { FieldWrap, Input, Select } from '../../../components/Field'
import { confirmAction } from '../../../store/confirmStore'

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
      <p className="rounded-md bg-bg px-3 py-2 text-xs text-text-2">
        Esto solo reserva un horario en tu calendario. Para registrar peso, diagnóstico, laboratorios u otros datos
        clínicos de la visita, usa <b>+ Nueva consulta</b> en su lugar.
      </p>
      <FieldWrap label="Fecha y hora">
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Duración (minutos)">
        <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Notas" hint="Nota breve sobre la cita (ej. 'trae estudios'), no es parte del expediente clínico.">
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

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime()
  return Math.max(0, Math.round((Date.now() - then) / 86400000))
}

function formatElapsed(days: number): string {
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  if (days < 30) return `hace ${days} días`
  if (days < 60) return 'hace 1 mes'
  if (days < 365) return `hace ${Math.round(days / 30)} meses`
  const years = Math.round(days / 365)
  return years === 1 ? 'hace 1 año' : `hace ${years} años`
}

function VisitBadge({ previousConsultations }: { previousConsultations: Consultation[] }) {
  if (previousConsultations.length === 0) {
    return (
      <div className="rounded-md bg-accent-2-light px-3 py-2 text-xs font-medium text-accent-2">
        ✨ Esta es la primera consulta del paciente.
      </div>
    )
  }
  const last = previousConsultations[0]
  const visitNumber = previousConsultations.length + 1
  return (
    <div className="rounded-md bg-accent-light px-3 py-2 text-xs font-medium text-accent">
      🔁 Consulta de retorno — visita #{visitNumber}. Última consulta {formatElapsed(daysSince(last.fecha))} ({new Date(last.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}).
    </div>
  )
}

function NewConsultationForm({
  patientId,
  previousConsultations,
  dirtyRef,
  onSaved,
}: {
  patientId: number
  previousConsultations: Consultation[]
  dirtyRef: React.MutableRefObject<boolean>
  onSaved: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [peso, setPeso] = useState('')
  const [talla, setTalla] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [evolucion, setEvolucion] = useState('')
  const [labs, setLabs] = useState<LabValue[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')

  const [pliegueMetodo, setPliegueMetodo] = useState<'ninguno' | 'bioimpedancia' | 'pliegues_jp3'>('ninguno')
  const [grasaManual, setGrasaManual] = useState('')
  const [pliegueEdad, setPliegueEdad] = useState('')
  const [pliegueSexo, setPliegueSexo] = useState<'male' | 'female'>('female')
  const [pliequePecho, setPlieguePecho] = useState('')
  const [pliegueAbdominal, setPliegueAbdominal] = useState('')
  const [pliegueTriceps, setPliegueTriceps] = useState('')
  const [pliegueSuprailiaco, setPliegueSuprailiaco] = useState('')
  const [pliegueMuslo, setPliegueMuslo] = useState('')

  const [ingestaReducida, setIngestaReducida] = useState<'no' | 'leve' | 'severa'>('no')
  const [cargaEnfermedad, setCargaEnfermedad] = useState(false)

  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    dirtyRef.current = Boolean(
      motivo || peso || talla || diagnostico || evolucion || labs.length > 0 ||
      pliegueMetodo !== 'ninguno' || grasaManual || pliegueEdad ||
      pliequePecho || pliegueAbdominal || pliegueTriceps || pliegueSuprailiaco || pliegueMuslo ||
      ingestaReducida !== 'no' || cargaEnfermedad
    )
  }, [motivo, peso, talla, diagnostico, evolucion, labs, pliegueMetodo, grasaManual, pliegueEdad, pliequePecho, pliegueAbdominal, pliegueTriceps, pliegueSuprailiaco, pliegueMuslo, ingestaReducida, cargaEnfermedad, dirtyRef])

  const saveMut = useMutation({
    mutationFn: () =>
      createConsultation(patientId, {
        motivo_consulta: motivo,
        peso: peso ? parseFloat(peso) : null,
        talla: talla ? parseFloat(talla) : null,
        diagnostico_nutricional: diagnostico,
        evolucion,
        bioquimicos: labs,
        pliegue_pecho: pliequePecho ? parseFloat(pliequePecho) : null,
        pliegue_abdominal: pliegueAbdominal ? parseFloat(pliegueAbdominal) : null,
        pliegue_triceps: pliegueTriceps ? parseFloat(pliegueTriceps) : null,
        pliegue_suprailiaco: pliegueSuprailiaco ? parseFloat(pliegueSuprailiaco) : null,
        pliegue_muslo: pliegueMuslo ? parseFloat(pliegueMuslo) : null,
        grasa_corporal_pct: pliegueMetodo === 'bioimpedancia' && grasaManual ? parseFloat(grasaManual) : null,
        grasa_corporal_metodo: pliegueMetodo !== 'ninguno' ? pliegueMetodo : null,
        edad_medicion: pliegueMetodo === 'pliegues_jp3' && pliegueEdad ? parseInt(pliegueEdad, 10) : null,
        sexo_medicion: pliegueMetodo === 'pliegues_jp3' ? pliegueSexo : null,
        ingesta_reducida: ingestaReducida,
        carga_enfermedad_aguda: cargaEnfermedad,
      }),
    onSuccess: () => {
      dirtyRef.current = false
      setSaveError('')
      onSaved()
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setSaveError(
        typeof detail === 'string'
          ? detail
          : 'No se pudo guardar la consulta. Revisa tu conexión o vuelve a iniciar sesión e intenta de nuevo — tus datos siguen en este formulario.'
      )
    },
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
      <VisitBadge previousConsultations={previousConsultations} />
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

      <div className="rounded-md border border-border p-3">
        <FieldWrap label="Composición corporal" hint="Bioimpedancia (% directo) o pliegues con adipómetro (Jackson-Pollock 3 sitios).">
          <Select value={pliegueMetodo} onChange={(e) => setPliegueMetodo(e.target.value as typeof pliegueMetodo)}>
            <option value="ninguno">No registrar en esta consulta</option>
            <option value="bioimpedancia">Bioimpedancia (% grasa directo)</option>
            <option value="pliegues_jp3">Pliegues cutáneos (adipómetro)</option>
          </Select>
        </FieldWrap>

        {pliegueMetodo === 'bioimpedancia' && (
          <div className="mt-3">
            <FieldWrap label="% de grasa corporal">
              <Input type="number" step="0.1" value={grasaManual} onChange={(e) => setGrasaManual(e.target.value)} className="max-w-[140px]" />
            </FieldWrap>
          </div>
        )}

        {pliegueMetodo === 'pliegues_jp3' && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Edad (al medir)">
                <Input type="number" value={pliegueEdad} onChange={(e) => setPliegueEdad(e.target.value)} />
              </FieldWrap>
              <FieldWrap label="Sexo">
                <Select value={pliegueSexo} onChange={(e) => setPliegueSexo(e.target.value as 'male' | 'female')}>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                </Select>
              </FieldWrap>
            </div>
            {pliegueSexo === 'male' ? (
              <div className="grid grid-cols-3 gap-3">
                <FieldWrap label="Pecho (mm)">
                  <Input type="number" step="0.1" value={pliequePecho} onChange={(e) => setPlieguePecho(e.target.value)} />
                </FieldWrap>
                <FieldWrap label="Abdominal (mm)">
                  <Input type="number" step="0.1" value={pliegueAbdominal} onChange={(e) => setPliegueAbdominal(e.target.value)} />
                </FieldWrap>
                <FieldWrap label="Muslo (mm)">
                  <Input type="number" step="0.1" value={pliegueMuslo} onChange={(e) => setPliegueMuslo(e.target.value)} />
                </FieldWrap>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <FieldWrap label="Tríceps (mm)">
                  <Input type="number" step="0.1" value={pliegueTriceps} onChange={(e) => setPliegueTriceps(e.target.value)} />
                </FieldWrap>
                <FieldWrap label="Suprailíaco (mm)">
                  <Input type="number" step="0.1" value={pliegueSuprailiaco} onChange={(e) => setPliegueSuprailiaco(e.target.value)} />
                </FieldWrap>
                <FieldWrap label="Muslo (mm)">
                  <Input type="number" step="0.1" value={pliegueMuslo} onChange={(e) => setPliegueMuslo(e.target.value)} />
                </FieldWrap>
              </div>
            )}
            <p className="text-[11px] text-text-3">El % de grasa se calcula automáticamente al guardar (Jackson-Pollock + ecuación de Siri).</p>
          </div>
        )}
      </div>

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

      <div className="rounded-md border border-border p-3">
        <p className="mb-2 text-xs font-medium text-text-2">
          Criba de desnutrición (GLIM) — criterio etiológico
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Ingesta alimentaria">
            <Select value={ingestaReducida} onChange={(e) => setIngestaReducida(e.target.value as typeof ingestaReducida)}>
              <option value="no">Normal</option>
              <option value="leve">Reducida (leve)</option>
              <option value="severa">Reducida (severa, ≤50% o &gt;2 semanas)</option>
            </Select>
          </FieldWrap>
          <label className="flex items-center gap-2 self-end pb-1.5 text-xs text-text-2">
            <input type="checkbox" checked={cargaEnfermedad} onChange={(e) => setCargaEnfermedad(e.target.checked)} />
            Enfermedad aguda/crónica con inflamación
          </label>
        </div>
      </div>

      <FieldWrap label="Diagnóstico nutricional">
        <Input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Evolución">
        <Input value={evolucion} onChange={(e) => setEvolucion(e.target.value)} />
      </FieldWrap>

      {saveError && <p className="rounded-md bg-danger-light px-3 py-2 text-xs text-danger">⚠ {saveError}</p>}
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
  const consultaDirtyRef = useRef(false)

  const { data: glim } = useQuery({
    queryKey: ['glim-assessment', patientId, consultations?.length],
    queryFn: () => getGlimAssessment(patientId),
    enabled: Boolean(consultations && consultations.length > 0),
    retry: false,
  })

  async function handleCloseConsultaModal() {
    if (consultaDirtyRef.current) {
      const discard = await confirmAction({
        title: 'Descartar consulta',
        message: 'Tienes datos sin guardar en esta consulta. Si cierras ahora, se perderán y no quedarán registrados en el historial.',
        confirmLabel: 'Sí, descartar',
        cancelLabel: 'Seguir editando',
      })
      if (!discard) return
      consultaDirtyRef.current = false
    }
    setModalOpen(false)
  }

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

      {glim && (
        <Card className={glim.diagnosed ? (glim.severity === 'severa' ? 'border-danger/40' : 'border-warn/40') : undefined}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-2">Criba de desnutrición (GLIM)</h3>
            {glim.diagnosed ? (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${glim.severity === 'severa' ? 'bg-danger-light text-danger' : 'bg-warn-light text-warn'}`}>
                Desnutrición {glim.severity}
              </span>
            ) : (
              <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                Sin criterios GLIM presentes
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-2">
            {glim.bmi != null && <span>IMC: {glim.bmi}</span>}
            {glim.weight_loss_pct != null && (
              <span>
                Cambio de peso: {glim.weight_loss_pct > 0 ? '-' : '+'}
                {Math.abs(glim.weight_loss_pct)}% en {glim.weight_loss_period_months} meses
              </span>
            )}
          </div>
          {(glim.phenotypic_criteria.length > 0 || glim.etiologic_criteria.length > 0) && (
            <ul className="mt-2 list-disc pl-4 text-xs text-text-2">
              {[...glim.phenotypic_criteria, ...glim.etiologic_criteria].map((c) => (
                <li key={c.code}>{c.detail}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-text-3">{glim.note}</p>
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
                    {c.grasa_corporal_pct != null && ` · ${c.grasa_corporal_pct}% grasa`}
                  </p>
                  <p className="text-xs text-text-2">{c.motivo_consulta || 'Sin motivo registrado'}</p>
                  {c.diagnostico_nutricional && <p className="text-xs text-text-3">Dx: {c.diagnostico_nutricional}</p>}
                  {c.bioquimicos && c.bioquimicos.length > 0 && (
                    <p className="mt-1 text-xs text-text-3">
                      {c.bioquimicos.map((l) => `${l.nombre}: ${l.valor}${l.unidad}`).join(' · ')}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger shrink-0"
                  onClick={async () => {
                    if (await confirmAction({ message: '¿Deseas eliminar esta consulta? Esta acción no se puede deshacer.', confirmLabel: 'Sí, eliminar' }))
                      deleteMut.mutate(c.id)
                  }}
                >
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={handleCloseConsultaModal} title="Nueva consulta" width={560}>
        <NewConsultationForm
          patientId={patientId}
          previousConsultations={consultations ?? []}
          dirtyRef={consultaDirtyRef}
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
