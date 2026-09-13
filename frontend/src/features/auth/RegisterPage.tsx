import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { FieldWrap, Input } from '../../components/Field'
import { Button } from '../../components/Button'
import { register, login, me } from '../../api/auth'
import { useAuthStore, type UserRole } from '../../store/authStore'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('professional')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const setProfile = useAuthStore((s) => s.setProfile)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(username, password, email, role)
      const { access_token } = await login(username, password)
      setSession(access_token, username)
      try {
        const profile = await me()
        setProfile(profile.is_pro, profile.first_login, profile.role)
      } catch {
        // ignora falha em /me, sessão já é válida
      }
      navigate('/')
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail === 'User already exists' ? 'Este usuario ya existe.' : 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Empieza a generar planes clínicos en minutos.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldWrap label="Usuario">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </FieldWrap>
        <FieldWrap label="Email" hint="Para recuperación de contraseña">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FieldWrap>
        <FieldWrap label="Contraseña">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </FieldWrap>
        <FieldWrap label="Tipo de cuenta">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('professional')}
              className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${role === 'professional' ? 'border-accent bg-accent-light text-accent' : 'border-border text-text-2'}`}
            >
              Nutricionista
            </button>
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${role === 'student' ? 'border-accent bg-accent-light text-accent' : 'border-border text-text-2'}`}
            >
              Estudiante
            </button>
          </div>
          {role === 'student' && (
            <p className="mt-1.5 text-[11px] text-text-3">
              Empiezas con 3 pacientes de práctica ficticios para aprender a calcular planes sin riesgo clínico.
            </p>
          )}
        </FieldWrap>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Crear cuenta
        </Button>
        <p className="text-center text-[11px] text-text-3">
          Al crear una cuenta aceptas el{' '}
          <Link to="/legal" className="font-medium text-accent hover:underline">
            Aviso de Privacidad y los Términos de Uso
          </Link>
          .
        </p>
      </form>
      <p className="mt-6 text-center text-xs text-text-2">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
