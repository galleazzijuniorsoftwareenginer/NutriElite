import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { FieldWrap, Input } from '../../components/Field'
import { Button } from '../../components/Button'
import { forgotPassword } from '../../api/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword(email)
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <AuthLayout title="Recuperar contraseña" subtitle="Te enviaremos un enlace para restablecerla.">
      {sent ? (
        <div className="rounded-md border border-accent-light bg-accent-light p-4 text-sm text-accent">
          Si el email existe en nuestro sistema, recibirás un enlace en breve.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldWrap label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </FieldWrap>
          <Button type="submit" loading={loading} className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-text-2">
        <Link to="/login" className="font-medium text-accent hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
