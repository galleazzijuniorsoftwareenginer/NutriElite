import { useQuery } from '@tanstack/react-query'
import { getFoodLog } from '../../../api/clinical'
import { Card } from '../../../components/Card'

export function FoodLogTab({ patientId }: { patientId: number }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['food-log', patientId],
    queryFn: () => getFoodLog(patientId),
  })

  return (
    <Card className="p-0 overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-text">Diario alimentario</h2>
        <p className="text-xs text-text-2">Lo que el paciente registró que comió desde su portal — sin editar por el nutricionista.</p>
      </div>
      {isLoading ? (
        <p className="p-8 text-center text-sm text-text-3">Cargando…</p>
      ) : !entries || entries.length === 0 ? (
        <p className="p-8 text-center text-sm text-text-3">
          Este paciente aún no registró comidas en su diario alimentario.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="px-5 py-3">
              <p className="text-sm font-medium text-text">
                {e.tiempo_comida}
                <span className="ml-2 text-xs font-normal text-text-3">
                  {new Date(e.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
              <p className="text-xs text-text-2">{e.descripcion}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
