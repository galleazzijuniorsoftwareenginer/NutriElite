import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { changePassword, exportData, deleteAccount, me, updateAccountSettings, type AccountSettings } from '../../api/auth'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { FieldWrap, Input, Select } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { useAuthStore } from '../../store/authStore'

const TIMEZONES = [
  ['America/Mexico_City', 'Ciudad de México (GMT-6)'],
  ['America/Bogota', 'Bogotá (GMT-5)'],
  ['America/Lima', 'Lima (GMT-5)'],
  ['America/Santiago', 'Santiago (GMT-4/-3)'],
  ['America/Argentina/Buenos_Aires', 'Buenos Aires (GMT-3)'],
  ['America/Sao_Paulo', 'São Paulo (GMT-3)'],
  ['Europe/Madrid', 'Madrid (GMT+1/+2)'],
  ['America/New_York', 'Nueva York (GMT-5/-4)'],
  ['America/Los_Angeles', 'Los Ángeles (GMT-8/-7)'],
] as const

function AccountPreferencesCard() {
  const queryClient = useQueryClient()
  const { data: profile } = useQuery({ queryKey: ['me'], queryFn: me })
  const [form, setForm] = useState<AccountSettings>({ email_reminders_enabled: true, locale: 'es', timezone: 'America/Mexico_City' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        email_reminders_enabled: profile.email_reminders_enabled,
        locale: profile.locale,
        timezone: profile.timezone,
      })
    }
  }, [profile])

  const saveMut = useMutation({
    mutationFn: (payload: Partial<AccountSettings>) => updateAccountSettings(payload),
    onSuccess: (res) => {
      queryClient.setQueryData(['me'], (prev: typeof profile) => (prev ? { ...prev, ...res } : prev))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  function update<K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    saveMut.mutate({ [key]: value })
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-text">Preferencias de la cuenta</h2>
      <p className="mb-4 text-xs text-text-2">Notificaciones, idioma y zona horaria — se aplican en toda la plataforma.</p>
      <div className="flex flex-col gap-4 max-w-sm">
        <label className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-text-2">
            Recordatorios de citas por email
            <span className="block text-[11px] font-normal text-text-3">Se envían a tus pacientes al agendar una cita.</span>
          </span>
          <input
            type="checkbox"
            checked={form.email_reminders_enabled}
            onChange={(e) => update('email_reminders_enabled', e.target.checked)}
            className="h-4 w-8 shrink-0 accent-accent"
          />
        </label>
        <FieldWrap label="Idioma">
          <Select value={form.locale} onChange={(e) => update('locale', e.target.value)}>
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </Select>
        </FieldWrap>
        <FieldWrap label="Zona horaria" hint="Se usa para mostrar y programar tus citas en la Agenda.">
          <Select value={form.timezone} onChange={(e) => update('timezone', e.target.value)}>
            {TIMEZONES.map(([tz, label]) => (
              <option key={tz} value={tz}>{label}</option>
            ))}
          </Select>
        </FieldWrap>
        {saved && <span className="text-[11px] font-medium text-accent">✓ Guardado</span>}
      </div>
    </Card>
  )
}

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
      <AccountPreferencesCard />
      <ChangePasswordCard />
      <ExportDataCard />
      <DangerZoneCard />
    </div>
  )
}
