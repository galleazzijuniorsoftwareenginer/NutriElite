import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { FieldWrap, Input } from '../../components/Field'
import { Button } from '../../components/Button'
import { login, me } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      const { access_token } = await login(username, password)
      setSession(access_token, username)
      try {
        const profile = await me()
        setProfile(profile.is_pro, profile.first_login, profile.role)
      } catch {
        // segue mesmo se /me falhar — sessão já está válida
      }
      navigate('/')
    } catch {
      setError('Usuario o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Bienvenido de nuevo" subtitle="Inicia sesión para continuar con tus pacientes.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FieldWrap label="Usuario">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </FieldWrap>
        <FieldWrap label="Contraseña">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FieldWrap>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex items-center justify-end">
          <Link to="/olvide-password" className="text-xs font-medium text-accent hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Iniciar sesión
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-text-2">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-medium text-accent hover:underline">
          Crear cuenta
        </Link>
      </p>
    </AuthLayout>
  )
}
