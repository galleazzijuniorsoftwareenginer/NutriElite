import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { FieldWrap, Input } from '../../components/Field'
import { Button } from '../../components/Button'
import { register, login, me } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
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
      await register(username, password, email)
      const { access_token } = await login(username, password)
      setSession(access_token, username)
      try {
        const profile = await me()
        setProfile(profile.is_pro, profile.first_login)
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
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Crear cuenta
        </Button>
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
