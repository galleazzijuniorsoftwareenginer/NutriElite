import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { deleteTemplate, listTemplates } from '../../api/plans'
import { listPatients } from '../../api/patients'
import { assignPathologyTemplate, getPathologyTemplate, listPathologyTemplates, type PathologyTemplateSummary } from '../../api/pathologyTemplates'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { Select } from '../../components/Field'

const GOAL_LABEL: Record<string, string> = {
  cut: 'Pérdida de peso',
  bulk: 'Ganancia de masa',
  maintenance: 'Mantenimiento',
}

const CATEGORY_STYLE: Record<string, { gradient: string; icon: string }> = {
  'Pérdida de peso': { gradient: 'linear-gradient(135deg,#6d5bff,#4a37d1)', icon: '↓' },
  Vegano: { gradient: 'linear-gradient(135deg,#14b8a6,#0e9c92)', icon: '🌿' },
  Diabetes: { gradient: 'linear-gradient(135deg,#f2a93b,#b7791f)', icon: '💧' },
  'DASH · Hipertensión': { gradient: 'linear-gradient(135deg,#9f8bff,#6d5bff)', icon: '♥' },
  Keto: { gradient: 'linear-gradient(135deg,#4a37d1,#14122b)', icon: '🥑' },
  Mediterránea: { gradient: 'linear-gradient(135deg,#29e0ce,#0e9c92)', icon: '☀' },
  Hiperproteica: { gradient: 'linear-gradient(135deg,#6d5bff,#b7791f)', icon: '💪' },
  Antiinflamatoria: { gradient: 'linear-gradient(135deg,#29e0ce,#4a37d1)', icon: '✳' },
}
const DEFAULT_STYLE = { gradient: 'linear-gradient(135deg,#6d5bff,#4a37d1)', icon: '🍽' }

function AssignForm({ template, onAssigned }: { template: PathologyTemplateSummary; onAssigned: () => void }) {
  const { data: patients } = useQuery({ queryKey: ['patients'], queryFn: listPatients })
  const [patientId, setPatientId] = useState('')
  const mut = useMutation({
    mutationFn: () => assignPathologyTemplate(template.id, Number(patientId)),
    onSuccess: onAssigned,
  })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-2">
        Se creará un plan nuevo para el paciente elegido con el menú semanal de <b>{template.nombre}</b> ya cargado.
      </p>
      <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
        <option value="">Selecciona un paciente…</option>
        {(patients ?? []).map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
      <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!patientId} className="w-full">
        Asignar y crear plan
      </Button>
    </div>
  )
}

function DetailModal({ templateId, onClose }: { templateId: number; onClose: () => void }) {
  const { data: detail } = useQuery({ queryKey: ['pathology-template', templateId], queryFn: () => getPathologyTemplate(templateId) })
  if (!detail) return <p className="text-sm text-text-3">Cargando…</p>
  const dias = detail.weekly_menu?.semana as Array<{ dia: string; comidas: Array<{ tiempo: string; kcal: number; itens: Array<{ alimento: string; quantidade_g: number }> }> }> | undefined
  return (
    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
      <p className="text-sm text-text-2">{detail.descripcion}</p>
      {(dias ?? []).map((d) => (
        <div key={d.dia}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-accent mb-1.5">{d.dia}</h4>
          <ul className="flex flex-col gap-1">
            {d.comidas.map((c) => (
              <li key={c.tiempo} className="text-xs text-text-2">
                <span className="font-medium text-text">{c.tiempo}</span> ({c.kcal} kcal) — {c.itens.map((i) => i.alimento).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Button variant="ghost" onClick={onClose} className="self-end">Cerrar</Button>
    </div>
  )
}

function ClinicalLibrary() {
  const [categoria, setCategoria] = useState<string>('')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [assignTarget, setAssignTarget] = useState<PathologyTemplateSummary | null>(null)
  const [assigned, setAssigned] = useState(false)
  const navigate = useNavigate()

  const { data: templates, isLoading } = useQuery({
    queryKey: ['pathology-templates', categoria],
    queryFn: () => listPathologyTemplates(categoria ? { categoria } : undefined),
  })

  const categorias = useMemo(() => Array.from(new Set((templates ?? []).map((t) => t.categoria))), [templates])

  return (
    <div className="flex flex-col gap-4">
      <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoria('')}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            categoria === '' ? 'border-transparent bg-accent-light text-accent font-semibold' : 'border-border bg-surface text-text-2 hover:text-text'
          }`}
        >
          Todas
        </button>
        {categorias.map((c) => (
          <button
            key={c}
            onClick={() => setCategoria(c)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              categoria === c ? 'border-transparent bg-accent-light text-accent font-semibold' : 'border-border bg-surface text-text-2 hover:text-text'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-3">Cargando…</p>
      ) : !templates || templates.length === 0 ? (
        <Card className="py-16 text-center text-sm text-text-3">No hay plantillas en esta categoría.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const style = CATEGORY_STYLE[t.categoria] ?? DEFAULT_STYLE
            return (
              <Card key={t.id} className="flex flex-col gap-0 p-0 overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-float">
                <div className="relative flex h-[120px] items-center justify-center text-4xl" style={{ background: style.gradient }}>
                  <span>{style.icon}</span>
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text">
                    {t.categoria}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text">{t.nombre}</h3>
                    <span className="font-display text-lg font-bold text-accent whitespace-nowrap">{Math.round(t.kcal_objetivo)} kcal</span>
                  </div>
                  <p className="text-xs text-text-3">{t.total_recetas} platillos · {t.tiempos_por_dia} tiempos</p>
                  <p className="text-xs text-text-2 line-clamp-2">{t.descripcion}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setDetailId(t.id)}>Ver detalle</Button>
                    <Button size="sm" className="flex-1" onClick={() => setAssignTarget(t)}>Asignar</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title="Detalle de la plantilla" width={560}>
        {detailId !== null && <DetailModal templateId={detailId} onClose={() => setDetailId(null)} />}
      </Modal>

      <Modal open={assignTarget !== null} onClose={() => setAssignTarget(null)} title="Asignar a paciente" width={420}>
        {assignTarget && !assigned && (
          <AssignForm
            template={assignTarget}
            onAssigned={() => {
              setAssigned(true)
            }}
          />
        )}
        {assigned && assignTarget && (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-sm text-text">Plan creado correctamente.</p>
            <Button
              onClick={() => {
                setAssignTarget(null)
                setAssigned(false)
                navigate('/pacientes')
              }}
            >
              Ver pacientes
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function MyTemplates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: templates, isLoading } = useQuery({ queryKey: ['templates'], queryFn: listTemplates })

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  if (isLoading) return <p className="text-sm text-text-3">Cargando…</p>
  if (!templates || templates.length === 0) {
    return (
      <Card className="py-16 text-center text-sm text-text-3">
        Aún no tienes plantillas. Guarda un plan como plantilla desde la pantalla de auditoría.
      </Card>
    )
  }

  return (
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
  )
}

export function TemplatesPage() {
  const [tab, setTab] = useState<'mias' | 'biblioteca'>('biblioteca')

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Plantillas</h1>
        <p className="text-sm text-text-2">Planes guardados o prediseñados, listos para reutilizar con nuevos pacientes.</p>
      </div>

      <div className="inline-flex self-start gap-0.5 rounded-full border border-border bg-bg p-1">
        <button
          onClick={() => setTab('mias')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            tab === 'mias' ? 'bg-surface text-accent shadow-card' : 'text-text-2'
          }`}
        >
          Mis plantillas
        </button>
        <button
          onClick={() => setTab('biblioteca')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            tab === 'biblioteca' ? 'bg-surface text-accent shadow-card' : 'text-text-2'
          }`}
        >
          Biblioteca clínica
        </button>
      </div>

      {tab === 'mias' ? <MyTemplates /> : <ClinicalLibrary />}
    </div>
  )
}
