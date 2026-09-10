import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicPlan } from '../../api/public'
import { Logo } from '../../components/Logo'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { BookingSection } from './PublicPlanPage'

export function PublicBookingOnlyPage() {
  const { token } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-plan', token],
    queryFn: () => getPublicPlan(token!),
    enabled: !!token,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <Logo size={28} />
        <p className="mt-4 text-sm text-text-2">Este enlace no es válido o ya expiró. Consulta con tu nutricionista.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-16">
      <header className="border-b border-border bg-surface px-4 py-4 sm:px-8">
        <Logo size={26} />
      </header>

      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 pt-6 sm:px-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Hola, {data.patient_first_name} 👋</h1>
          <p className="text-sm text-text-2">Agenda tu próxima cita con tu nutricionista.</p>
        </div>

        {data.can_book && token ? (
          <BookingSection token={token} />
        ) : (
          <Card className="py-6 text-center text-xs text-text-3">
            El agendamiento no está disponible para este plan todavía — tu nutricionista debe vincularlo a tu ficha de paciente.
          </Card>
        )}
      </main>
    </div>
  )
}
