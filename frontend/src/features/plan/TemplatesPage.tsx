import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { deleteTemplate, listTemplates } from '../../api/plans'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'

const GOAL_LABEL: Record<string, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: templates, isLoading } = useQuery({ queryKey: ['templates'], queryFn: listTemplates })

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Plantillas</h1>
        <p className="text-sm text-text-2">Planes guardados como base para reutilizar con nuevos pacientes.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-3">Cargando…</p>
      ) : !templates || templates.length === 0 ? (
        <Card className="py-16 text-center text-sm text-text-3">
          Aún no tienes plantillas. Guarda un plan como plantilla desde la pantalla de auditoría.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold text-text">{t.template_name}</h3>
                <p className="text-xs text-text-3">{GOAL_LABEL[t.goal] || t.goal}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="font-semibold text-prot">{t.protein}g</p>
                  <p className="text-text-3">Prot</p>
                </div>
                <div>
                  <p className="font-semibold text-carb">{t.carbs}g</p>
                  <p className="text-text-3">Carb</p>
                </div>
                <div>
                  <p className="font-semibold text-fat">{t.fats}g</p>
                  <p className="text-text-3">Grasa</p>
                </div>
              </div>
              <p className="text-xs text-text-2">{Math.round(t.get)} kcal totales</p>
              <div className="mt-auto flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => navigate(`/plan/nuevo?templateId=${t.id}`)}>
                  Usar
                </Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => deleteMut.mutate(t.id)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
