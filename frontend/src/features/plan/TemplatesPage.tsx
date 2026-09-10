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
import { CategoryTile } from '../../components/CategoryTile'

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

interface MenuItem {
  alimento: string
  quantidade_g: number
  kcal: number
  imagen_url?: string | null
}
interface MenuComida {
  tiempo: string
  kcal: number
  itens: MenuItem[]
}
interface MenuDia {
  dia: string
  comidas: MenuComida[]
  macros: { proteina_g: number; carb_g: number; gordura_g: number; kcal_total: number }
}

function DetailModal({ templateId, onClose }: { templateId: number; onClose: () => void }) {
  const { data: detail } = useQuery({ queryKey: ['pathology-template', templateId], queryFn: () => getPathologyTemplate(templateId) })
  if (!detail) return <p className="text-sm text-text-3">Cargando…</p>
  const dias = (detail.weekly_menu?.semana as MenuDia[] | undefined) ?? []
  const style = CATEGORY_STYLE[detail.categoria] ?? DEFAULT_STYLE

  const avgMacros = dias.reduce(
    (acc, d) => ({
      proteina_g: acc.proteina_g + d.macros.proteina_g,
      carb_g: acc.carb_g + d.macros.carb_g,
      gordura_g: acc.gordura_g + d.macros.gordura_g,
      kcal_total: acc.kcal_total + d.macros.kcal_total,
    }),
    { proteina_g: 0, carb_g: 0, gordura_g: 0, kcal_total: 0 }
  )
  const n = dias.length || 1
  const kcalAvg = avgMacros.kcal_total / n
  const pctP = kcalAvg ? ((avgMacros.proteina_g / n) * 4 * 100) / kcalAvg : 0
  const pctC = kcalAvg ? ((avgMacros.carb_g / n) * 4 * 100) / kcalAvg : 0
  const pctF = kcalAvg ? ((avgMacros.gordura_g / n) * 9 * 100) / kcalAvg : 0

  const uniqueDishes = new Map<string, MenuItem>()
  dias.forEach((d) => d.comidas.forEach((c) => c.itens.forEach((it) => {
    if (!uniqueDishes.has(it.alimento)) uniqueDishes.set(it.alimento, it)
  })))

  return (
    <div className="flex flex-col gap-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
      <div className="flex gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
          <CategoryTile imageUrl={detail.imagen_url} gradient={style.gradient} icon={style.icon} alt={detail.categoria} height={96} iconSize="text-2xl" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-text">{detail.nombre}</h3>
          <p className="mt-1 text-xs text-text-3">{uniqueDishes.size} recetas · {detail.tiempos_por_dia} tiempos</p>
        </div>
      </div>

      <p className="text-sm text-text-2">{detail.descripcion}</p>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-2">🔥 Calorías: {Math.round(kcalAvg)} kcal</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-2">🍞 HCO: {pctC.toFixed(1)}%</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-2">🥑 Lípidos: {pctF.toFixed(1)}%</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-xs font-medium text-text-2">🍗 Proteína: {pctP.toFixed(1)}%</span>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-text">Recetas</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from(uniqueDishes.values()).map((it) => (
            <div key={it.alimento} className="overflow-hidden rounded-lg border border-border">
              <CategoryTile imageUrl={it.imagen_url} gradient={style.gradient} icon="🍽" alt={it.alimento} height={80} iconSize="text-xl" />
              <div className="p-2">
                <p className="text-[11px] font-medium text-text leading-snug">{it.alimento}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <div className="relative">
                  <CategoryTile imageUrl={t.imagen_url} gradient={style.gradient} icon={style.icon} alt={t.categoria} />
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

      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title="Detalle de la plantilla" width={720}>
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
