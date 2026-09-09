import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { FieldWrap, Input } from '../../components/Field'
import { Button } from '../../components/Button'
import { resetPassword } from '../../api/auth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || params.get('reset') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      navigate('/login')
    } catch {
      setError('El enlace expiró o no es válido. Solicita uno nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Enlace inválido" subtitle="No encontramos un token de recuperación.">
        <Link to="/olvide-password" className="text-sm font-medium text-accent hover:underline">
          Solicitar nuevo enlace
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña segura para tu cuenta.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldWrap label="Nueva contraseña">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoFocus />
        </FieldWrap>
        <FieldWrap label="Confirmar contraseña">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
        </FieldWrap>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Restablecer contraseña
        </Button>
      </form>
    </AuthLayout>
  )
}
