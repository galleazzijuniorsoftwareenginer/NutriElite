import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createPatient, deletePatient, listPatients, updatePatient, type PatientPayload } from '../../api/patients'
import type { Patient, PatientStatus } from '../../types'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Badge } from '../../components/Badge'
import { FieldWrap, Input, Select } from '../../components/Field'
import { Modal } from '../../components/Modal'

const STATUS_LABEL: Record<PatientStatus, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  pausado: 'En pausa',
}
const STATUS_TONE: Record<PatientStatus, 'accent' | 'neutral' | 'warn'> = {
  activo: 'accent',
  inactivo: 'neutral',
  pausado: 'warn',
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function lastPlanLabel(dateStr: string | null): string {
  const days = daysSince(dateStr)
  if (days === null) return 'Sin plan aún'
  if (days === 0) return 'Último plan: hoy'
  if (days === 1) return 'Último plan: ayer'
  return `Último plan: hace ${days} días`
}

function PatientForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Patient
  onSubmit: (payload: PatientPayload) => void
  onCancel: () => void
  loading: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [status, setStatus] = useState<PatientStatus>(initial?.status ?? 'activo')
  const [notas, setNotas] = useState(initial?.notas_generales ?? '')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, email, phone, status, notas_generales: notas })
      }}
      className="flex flex-col gap-4"
    >
      <FieldWrap label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </FieldWrap>
      <FieldWrap label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FieldWrap>
      <FieldWrap label="Teléfono">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FieldWrap>
      {initial && (
        <FieldWrap label="Estado">
          <Select value={status} onChange={(e) => setStatus(e.target.value as PatientStatus)}>
            <option value="activo">Activo</option>
            <option value="pausado">En pausa</option>
            <option value="inactivo">Inactivo</option>
          </Select>
        </FieldWrap>
      )}
      <FieldWrap label="Notas generales" hint="Solo visible para ti, no aparece en el PDF.">
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-3 outline-none transition-colors focus:border-accent"
        />
      </FieldWrap>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Guardar
        </Button>
      </div>
    </form>
  )
}

export function PatientsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'todos'>('todos')
  const [sort, setSort] = useState<'recent' | 'name' | 'oldest' | 'last_plan'>('recent')
  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', statusFilter, sort],
    queryFn: () => listPatients({ status: statusFilter === 'todos' ? undefined : statusFilter, sort }),
  })
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | undefined>(undefined)

  const createMut = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setModalOpen(false)
    },
  })
  const updateMut = useMutation({
    mutationFn: (payload: PatientPayload) => updatePatient(editing!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setModalOpen(false)
      setEditing(undefined)
    },
  })
  const deleteMut = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  })

  const filtered = useMemo(() => {
    const list = patients ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
  }, [patients, search])

  function openNew() {
    setEditing(undefined)
    setModalOpen(true)
  }
  function openEdit(p: Patient) {
    setEditing(p)
    setModalOpen(true)
  }
  function handleDelete(p: Patient) {
    if (confirm(`¿Eliminar a ${p.name}? Esta acción no se puede deshacer.`)) {
      deleteMut.mutate(p.id)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Pacientes</h1>
          <p className="text-sm text-text-2">{patients?.length ?? 0} paciente(s) registrados</p>
        </div>
        <Button onClick={openNew}>+ Nuevo paciente</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-0.5 rounded-full border border-border bg-bg p-1">
          {([
            ['todos', 'Todos'],
            ['activo', 'Activos'],
            ['pausado', 'En pausa'],
            ['inactivo', 'Inactivos'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                statusFilter === key ? 'bg-surface text-accent shadow-card' : 'text-text-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto">
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name">Nombre A-Z</option>
            <option value="last_plan">Último plan</option>
          </Select>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-text-3">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-3">Ningún paciente encontrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-bg/60">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-light text-xs font-semibold text-accent">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text">{p.name}</p>
                      <Badge tone={STATUS_TONE[p.status ?? 'activo']}>{STATUS_LABEL[p.status ?? 'activo']}</Badge>
                      {p.status === 'activo' && (daysSince(p.last_plan) === null || (daysSince(p.last_plan) ?? 0) >= 30) && (
                        <Badge tone="warn">⏰ Seguimiento</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-text-3">
                      {p.email || 'Sin email'} {p.phone && `· ${p.phone}`} · {lastPlanLabel(p.last_plan)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="hidden text-xs text-text-3 sm:inline">{p.total_plans} plan(es)</span>
                  <Link to={`/pacientes/${p.id}`}>
                    <Button size="sm" variant="secondary">Ver</Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Editar</Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => handleDelete(p)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar paciente' : 'Nuevo paciente'}>
        <PatientForm
          initial={editing}
          loading={createMut.isPending || updateMut.isPending}
          onCancel={() => setModalOpen(false)}
          onSubmit={(payload) => (editing ? updateMut.mutate(payload) : createMut.mutate(payload))}
        />
      </Modal>
    </div>
  )
}
