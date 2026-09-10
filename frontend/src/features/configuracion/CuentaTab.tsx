import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { changePassword, exportData, deleteAccount } from '../../api/auth'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { FieldWrap, Input } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { useAuthStore } from '../../store/authStore'

function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const mut = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
      setError('')
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || 'No se pudo cambiar la contraseña.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccess(false)
    if (next.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    setError('')
    mut.mutate()
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-text">Cambiar contraseña</h2>
      <p className="mb-4 text-xs text-text-2">Usa una contraseña que no utilices en otros servicios.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
        <FieldWrap label="Contraseña actual">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </FieldWrap>
        <FieldWrap label="Nueva contraseña">
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </FieldWrap>
        <FieldWrap label="Confirmar nueva contraseña">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </FieldWrap>
        {error && <p className="text-xs text-danger">{error}</p>}
        {success && <p className="text-xs text-accent-2">Contraseña actualizada correctamente.</p>}
        <Button type="submit" loading={mut.isPending} className="self-start">
          Actualizar contraseña
        </Button>
      </form>
    </Card>
  )
}

function ExportDataCard() {
  const [downloading, setDownloading] = useState(false)

  async function handleExport() {
    setDownloading(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutrielite-datos-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-text">Exportar mis datos</h2>
      <p className="mb-4 text-xs text-text-2">
        Descarga un archivo JSON con todos tus pacientes, planes, citas y fichas clínicas.
      </p>
      <Button variant="secondary" loading={downloading} onClick={handleExport}>
        ⬇ Descargar mis datos
      </Button>
    </Card>
  )
}

function DangerZoneCard() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const mut = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      logout()
      navigate('/login')
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || 'No se pudo eliminar la cuenta.')
    },
  })

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-danger">Zona de peligro</h2>
      <p className="mb-4 text-xs text-text-2">
        Eliminar tu cuenta borra permanentemente todos tus pacientes, planes, citas y fichas clínicas. Esta acción no se puede deshacer.
      </p>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Eliminar mi cuenta
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Eliminar cuenta" width={380}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            Esta acción es permanente. Escribe tu contraseña para confirmar que quieres eliminar tu cuenta y todos tus datos.
          </p>
          <FieldWrap label="Contraseña">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </FieldWrap>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button
            variant="danger"
            className="w-full"
            loading={mut.isPending}
            onClick={() => {
              setError('')
              mut.mutate()
            }}
          >
            Sí, eliminar permanentemente
          </Button>
        </div>
      </Modal>
    </Card>
  )
}

export function CuentaTab() {
  return (
    <div className="flex flex-col gap-4">
      <ChangePasswordCard />
      <ExportDataCard />
      <DangerZoneCard />
    </div>
  )
}
