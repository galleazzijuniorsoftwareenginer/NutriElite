import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicPlan } from '../../api/public'
import { Logo } from '../../components/Logo'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'

export function PublicPlanPage() {
  const { token } = useParams()
  const [activeDay, setActiveDay] = useState(0)
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

  const dias = data.weekly_menu?.semana ?? []
  const activeMenuDay = dias[activeDay]

  return (
    <div className="min-h-screen bg-bg pb-16">
      <header className="border-b border-border bg-surface px-4 py-4 sm:px-8">
        <Logo size={26} />
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 sm:px-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Hola, {data.patient_first_name} 👋</h1>
          <p className="text-sm text-text-2">
            {data.goal_label} {data.get ? `· Meta: ${data.get.toFixed(0)} kcal/día` : ''}
          </p>
        </div>

        {dias.length === 0 ? (
          <Card className="py-10 text-center text-sm text-text-3">
            Tu nutricionista aún no generó el cardápio de esta semana.
          </Card>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto">
              {dias.map((d, i) => (
                <button
                  key={d.dia}
                  onClick={() => setActiveDay(i)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    activeDay === i ? 'border-accent bg-accent-light text-accent' : 'border-border text-text-2'
                  }`}
                >
                  {d.dia.slice(0, 3)}
                </button>
              ))}
            </div>

            {activeMenuDay && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-text">{activeMenuDay.dia}</h2>
                <div className="flex flex-col gap-3">
                  {activeMenuDay.comidas.map((meal, mi) => (
                    <div key={mi} className="rounded-md border border-border p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-text">{meal.tiempo}</span>
                        <span className="text-text-3">{meal.kcal} kcal</span>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {meal.itens.map((item, ii) => (
                          <li key={ii} className="flex items-center justify-between text-xs text-text-2">
                            <span>{item.alimento}</span>
                            <span className="text-text-3">{item.quantidade_g}g</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-text">🛒 Lista de compras de la semana</h2>
              {data.shopping_list.length === 0 ? (
                <p className="text-sm text-text-3">Sin datos suficientes para generar la lista.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {data.shopping_list.map((item) => (
                    <li key={item.alimento} className="flex items-center justify-between rounded-md bg-bg px-3 py-2 text-xs">
                      <span className="capitalize text-text">{item.alimento}</span>
                      <span className="font-medium text-text-2">{item.cantidad_g_total}g</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
