import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import {
  deletePatient,
  getPatientInsights,
  getPatientPlans,
  sendPatientMessage,
  updatePatient,
} from '../../api/patients'
import type { PatientStatus } from '../../types'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { FieldWrap, Input } from '../../components/Field'
import { confirmAction } from '../../store/confirmStore'
import { ClinicalRecordTab } from './tabs/ClinicalRecordTab'
import { ConsultationsTab } from './tabs/ConsultationsTab'
import { RenalTab } from './tabs/RenalTab'
import { FoodLogTab } from './tabs/FoodLogTab'
import { useTourStore } from '../../store/tourStore'
import { PATIENT_DETAIL_TOUR_ID, patientDetailTourSteps } from '../../tours/patientDetailTour'

const GOAL_LABEL: Record<string, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

const TABS = ['Planes', 'Ficha clínica', 'Consultas', 'Módulo renal', 'Diario alimentario'] as const
const TAB_TOUR_IDS = ['patient-tab-planes', 'patient-tab-clinica', 'patient-tab-consultas', 'patient-tab-renal', 'patient-tab-diario']
type Tab = (typeof TABS)[number]

interface PatientPlansResponse {
  patient: {
    id: number
    name: string
    email: string
    phone: string
    status: PatientStatus
    notas_generales: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    emergency_contact_relation: string | null
    blood_type: string | null
    activity_type: string | null
    activity_category: string | null
    etiquetas: string[]
    timezone: string | null
    country: string | null
    phone_country_code: string | null
    address: string | null
    residence_place: string | null
    education_level: string | null
    marital_status: string | null
    children_count: number | null
  }
  plans: { id: number; created_at: string; goal: string; weight: number; height: number | null; get: number; tmb: number }[]
}

function imcClass(imc: number): { label: string; tone: string } {
  if (imc < 18.5) return { label: 'Bajo peso', tone: 'text-warn' }
  if (imc < 25) return { label: 'Normal', tone: 'text-accent-2' }
  if (imc < 30) return { label: 'Sobrepeso', tone: 'text-warn' }
  return { label: 'Obesidad', tone: 'text-danger' }
}

export function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialTab = TABS.find((t) => t === searchParams.get('tab')) ?? 'Planes'
  const [tab, setTab] = useState<Tab>(initialTab)
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<PatientPlansResponse>({
    queryKey: ['patient', id],
    queryFn: () => getPatientPlans(Number(id)),
    enabled: !!id,
  })

  const [messageOpen, setMessageOpen] = useState(false)
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [insight, setInsight] = useState<string | null>(null)

  const messageMut = useMutation({
    mutationFn: () => sendPatientMessage(Number(id), { subject: messageSubject, body: messageBody }),
    onSuccess: () => {
      setMessageOpen(false)
      setMessageSubject('')
      setMessageBody('')
    },
  })

  const insightsMut = useMutation({
    mutationFn: () => getPatientInsights(Number(id)),
    onSuccess: (res) => setInsight(res.insight),
  })

  const statusMut = useMutation({
    mutationFn: (status: PatientStatus) => {
      if (!data) throw new Error('no patient')
      const { patient } = data
      return updatePatient(patient.id, {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        status,
        notas_generales: patient.notas_generales ?? '',
        emergency_contact_name: patient.emergency_contact_name ?? '',
        emergency_contact_phone: patient.emergency_contact_phone ?? '',
        emergency_contact_relation: patient.emergency_contact_relation ?? '',
        blood_type: patient.blood_type ?? '',
        activity_type: patient.activity_type ?? '',
        activity_category: patient.activity_category ?? '',
        etiquetas: patient.etiquetas,
        timezone: patient.timezone ?? '',
        country: patient.country ?? '',
        phone_country_code: patient.phone_country_code ?? '',
        address: patient.address ?? '',
        residence_place: patient.residence_place ?? '',
        education_level: patient.education_level ?? '',
        marital_status: patient.marital_status ?? '',
        children_count: patient.children_count,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient', id] }),
  })

  const deleteMut = useMutation({
    mutationFn: () => deletePatient(Number(id)),
    onSuccess: () => navigate('/pacientes'),
  })

  async function handleDelete() {
    if (!data) return
    if (
      await confirmAction({
        message: `¿Deseas eliminar a ${data.patient.name}? Esta acción no se puede deshacer.`,
        confirmLabel: 'Sí, eliminar',
      })
    ) {
      deleteMut.mutate()
    }
  }

  if (isLoading) return <p className="text-sm text-text-3">Cargando…</p>
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-danger">No se pudo cargar el paciente.</p>
        <Button size="sm" variant="secondary" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (!data) return <p className="text-sm text-text-3">Paciente no encontrado.</p>

  const patientId = data.patient.id

  const sortedPlans = [...data.plans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const latestPlan = sortedPlans[0]
  const firstPlan = sortedPlans[sortedPlans.length - 1]
  const weightDelta = latestPlan && firstPlan && latestPlan.id !== firstPlan.id ? latestPlan.weight - firstPlan.weight : null
  const daysSinceLast = latestPlan ? Math.floor((Date.now() - new Date(latestPlan.created_at).getTime()) / 86400000) : null
  const imc = latestPlan?.height ? latestPlan.weight / (latestPlan.height / 100) ** 2 : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/pacientes" className="text-xs font-medium text-accent-2 hover:underline">
            ← Pacientes
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-text">{data.patient.name}</h1>
          <p className="text-sm text-text-2">
            {data.patient.email || 'Sin email'} {data.patient.phone && `· ${data.patient.phone}`}
          </p>
          <button
            onClick={() => useTourStore.getState().start(PATIENT_DETAIL_TOUR_ID, patientDetailTourSteps)}
            className="mt-1 text-xs font-medium text-accent hover:underline"
          >
            Ver tutorial del expediente
          </button>
        </div>
        <Button
          onClick={() =>
            navigate(
              `/plan/nuevo?patientId=${patientId}&name=${encodeURIComponent(data.patient.name)}&email=${encodeURIComponent(
                data.patient.email || ''
              )}&phone=${encodeURIComponent(data.patient.phone || '')}`
            )
          }
        >
          + Nuevo plan para {data.patient.name.split(' ')[0]}
        </Button>
      </div>

      {latestPlan && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">Último peso</span>
            <span className="font-display text-xl font-semibold text-accent">{latestPlan.weight} kg</span>
          </Card>
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">Variación</span>
            <span className={clsx('font-display text-xl font-semibold', weightDelta === null ? 'text-text-3' : weightDelta > 0 ? 'text-warn' : weightDelta < 0 ? 'text-accent-2' : 'text-text-3')}>
              {weightDelta === null ? '—' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
            </span>
          </Card>
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">IMC</span>
            <span className={clsx('font-display text-xl font-semibold', imc ? imcClass(imc).tone : 'text-text-3')}>
              {imc ? imc.toFixed(1) : '—'}
              {imc && <span className="ml-1 text-xs font-medium">{imcClass(imc).label}</span>}
            </span>
          </Card>
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">GEB actual</span>
            <span className="font-display text-xl font-semibold text-accent-2">{Math.round(latestPlan.tmb)} kcal</span>
          </Card>
          <Card className="flex flex-col gap-0.5 py-3">
            <span className="text-[11px] font-medium text-text-2">Última actividad</span>
            <span className="font-display text-xl font-semibold text-accent">
              {daysSinceLast === 0 ? 'Hoy' : `${daysSinceLast}d`}
            </span>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-border bg-surface p-1.5">
            {TABS.map((t, i) => (
              <button
                key={t}
                data-tour={TAB_TOUR_IDS[i]}
                onClick={() => setTab(t)}
                className={clsx(
                  'flex-1 basis-0 rounded-md px-3 py-2.5 text-center text-sm font-medium transition-colors',
                  tab === t ? 'bg-accent-light text-accent' : 'text-text-2 hover:bg-bg'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Planes' && (
            <Card className="p-0 overflow-hidden">
              <div className="border-b border-border px-5 py-3">
                <h2 className="text-sm font-semibold text-text">Historial de planes ({data.plans.length})</h2>
              </div>
              {data.plans.length === 0 ? (
                <p className="p-8 text-center text-sm text-text-3">Este paciente aún no tiene planes.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.plans.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-text">
                          {GOAL_LABEL[p.goal] || p.goal} · {Math.round(p.get)} kcal
                        </p>
                        <p className="text-xs text-text-3">
                          {new Date(p.created_at).toLocaleDateString()} · GEB {Math.round(p.tmb)} kcal · {p.weight} kg
                        </p>
                      </div>
                      <Link to={`/plan/${p.id}`}>
                        <Button size="sm" variant="secondary">Abrir</Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === 'Ficha clínica' && <ClinicalRecordTab patientId={patientId} />}
          {tab === 'Consultas' && <ConsultationsTab patientId={patientId} />}
          {tab === 'Módulo renal' && <RenalTab patientId={patientId} />}
          {tab === 'Diario alimentario' && <FoodLogTab patientId={patientId} />}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-text">✨ AI Insights</h3>
            {insight ? (
              <p className="text-xs leading-relaxed text-text-2">{insight}</p>
            ) : (
              <p className="text-xs text-text-3">Genera una nota rápida sobre la evolución de este paciente.</p>
            )}
            <Button
              size="sm"
              variant="secondary"
              loading={insightsMut.isPending}
              onClick={() => insightsMut.mutate()}
              className="mt-3 w-full"
            >
              {insight ? '↺ Regenerar' : 'Generar insight'}
            </Button>
            {insightsMut.isError && (
              <p className="mt-2 text-[11px] font-medium text-danger">No se pudo generar el insight. Intenta de nuevo.</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-text">Acciones</h3>
            <div className="flex flex-col gap-1.5">
              {latestPlan && (
                <Link to={`/plan/${latestPlan.id}`}>
                  <Button size="sm" variant="ghost" className="w-full justify-start">📄 Ver resumen</Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start"
                disabled={!data.patient.email}
                onClick={() => setMessageOpen(true)}
              >
                ✉️ Enviar mensaje
              </Button>
              <Link to="/agenda">
                <Button size="sm" variant="ghost" className="w-full justify-start">📅 Ver calendario</Button>
              </Link>
              {data.patient.status !== 'activo' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  loading={statusMut.isPending}
                  onClick={() => statusMut.mutate('activo')}
                >
                  ✅ Activar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  loading={statusMut.isPending}
                  onClick={() => statusMut.mutate('pausado')}
                >
                  ⏸️ Pausar
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start text-danger"
                loading={deleteMut.isPending}
                onClick={handleDelete}
              >
                🗑️ Eliminar
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={messageOpen} onClose={() => setMessageOpen(false)} title={`Enviar mensaje a ${data.patient.name}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            messageMut.mutate()
          }}
          className="flex flex-col gap-4"
        >
          <FieldWrap label="Asunto">
            <Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} required autoFocus />
          </FieldWrap>
          <FieldWrap label="Mensaje">
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={5}
              required
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 outline-none transition-colors focus:border-accent"
            />
          </FieldWrap>
          {messageMut.isError && (
            <p className="text-xs font-medium text-danger">No se pudo enviar el mensaje — intenta de nuevo.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setMessageOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={messageMut.isPending}>
              Enviar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
