import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { FieldWrap, Input } from '../../components/Field'
import { Button } from '../../components/Button'
import { login, me } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-6.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username" />
        </FieldWrap>
        <FieldWrap label="Contraseña">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-text-3 transition-colors hover:text-text-2"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </FieldWrap>
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger-light px-3 py-2 text-xs font-medium text-danger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
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
