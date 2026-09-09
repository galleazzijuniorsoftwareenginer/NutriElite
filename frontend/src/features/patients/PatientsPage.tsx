import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createPatient, deletePatient, listPatients, updatePatient, type PatientPayload } from '../../api/patients'
import type { Patient } from '../../types'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { FieldWrap, Input } from '../../components/Field'
import { Modal } from '../../components/Modal'

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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, email, phone })
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
  const { data: patients, isLoading } = useQuery({ queryKey: ['patients'], queryFn: listPatients })
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

      <Input
        placeholder="Buscar por nombre o email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

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
                    <p className="truncate text-sm font-medium text-text">{p.name}</p>
                    <p className="truncate text-xs text-text-3">{p.email || 'Sin email'} {p.phone && `· ${p.phone}`}</p>
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
