import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { favoriteRecipe, listRecipes, unfavoriteRecipe, type Recipe } from '../../api/recipes'
import { Card } from '../../components/Card'
import { Input } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { CategoryTile } from '../../components/CategoryTile'
import { RecipeDetailModal, recipeVisuals } from '../../components/RecipeDetailModal'
import { useTourStore } from '../../store/tourStore'
import { RECIPES_TOUR_ID, recipesTourSteps } from '../../tours/recipesTour'

const CATEGORY_ICON: Record<string, string> = {
  Navidad: '🌲',
  Nuevas: '⭐',
  'Bajo en grasa': '🥗',
  'Alto en proteína': '🍳',
  Keto: '🥑',
  Ensaladas: '🥬',
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  const queryClient = useQueryClient()
  const toggleFav = useMutation({
    mutationFn: () => (recipe.favorito ? unfavoriteRecipe(recipe.id) : favoriteRecipe(recipe.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  })
  const { gradient, image, icon } = recipeVisuals(recipe)

  return (
    <Card
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`flex flex-col gap-0 p-0 overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-float cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none ${
        recipe.favorito ? 'border-accent shadow-[0_0_0_1px_var(--color-accent-light)]' : ''
      }`}
    >
      <CategoryTile imageUrl={image} gradient={gradient} icon={icon} alt={recipe.categoria_tags?.[0] ?? recipe.nombre} height={100} iconSize="text-3xl" />
      <div className="flex flex-col gap-1.5 p-3.5">
        <span className="inline-flex w-fit items-center rounded-full bg-bg px-2 py-0.5 text-[10px] font-semibold text-text-2">
          {recipe.tiempo_comida}
        </span>
        <h3 className="text-[13px] font-semibold text-text leading-snug">{recipe.nombre}</h3>
        <p className="text-xs text-text-3">{recipe.kcal_aprox ? `${Math.round(recipe.kcal_aprox)} kcal` : ''}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="text-[11px] text-text-3">{recipe.ingredientes.length} ingredientes</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFav.mutate()
            }}
            className={`flex items-center gap-1 text-xs font-semibold ${recipe.favorito ? 'text-accent' : 'text-text-3 hover:text-accent'}`}
          >
            {recipe.favorito ? '★ Guardada' : '☆ Guardar'}
          </button>
        </div>
      </div>
    </Card>
  )
}

export function RecipesPage() {
  const [tab, setTab] = useState<'todas' | 'favoritas'>('todas')
  const [categoria, setCategoria] = useState('')
  const [search, setSearch] = useState('')
  const [openRecipeId, setOpenRecipeId] = useState<number | null>(null)

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', categoria, tab, search],
    queryFn: () => listRecipes({ categoria: categoria || undefined, favoritos: tab === 'favoritas' || undefined, search: search || undefined }),
  })

  const categorias = useMemo(() => {
    const set = new Set<string>()
    ;(recipes ?? []).forEach((r) => r.categoria_tags?.forEach((t) => set.add(t)))
    return Array.from(set)
  }, [recipes])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Recetas</h1>
        <p className="text-sm text-text-2">Guarda tus recetas favoritas y úsalas en el próximo menú de un paciente.</p>
        <button
          onClick={() => useTourStore.getState().start(RECIPES_TOUR_ID, recipesTourSteps)}
          className="mt-1 text-xs font-medium text-accent hover:underline"
        >
          Ver tutorial de recetas
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex gap-0.5 rounded-full border border-border bg-bg p-1" data-tour="recipes-tabs">
          <button
            onClick={() => setTab('todas')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              tab === 'todas' ? 'bg-surface text-accent shadow-card' : 'text-text-2'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setTab('favoritas')}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              tab === 'favoritas' ? 'bg-surface text-accent shadow-card' : 'text-text-2'
            }`}
          >
            ★ Mis favoritas
          </button>
        </div>
        <Input
          data-tour="recipes-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar receta…"
          className="w-full sm:w-72"
        />
      </div>

      {categorias.length > 0 && (
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
              {CATEGORY_ICON[c] ?? ''} {c}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-text-3">Cargando…</p>
      ) : !recipes || recipes.length === 0 ? (
        <Card className="py-16 text-center text-sm text-text-3">
          {tab === 'favoritas' ? 'Aún no guardaste ninguna receta favorita.' : 'No hay recetas para este filtro.'}
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpen={() => setOpenRecipeId(r.id)} />
          ))}
        </div>
      )}

      <Modal open={openRecipeId !== null} onClose={() => setOpenRecipeId(null)} title="Detalle de la receta" width={700}>
        {(() => {
          const openRecipe = recipes?.find((r) => r.id === openRecipeId)
          return openRecipe ? <RecipeDetailModal recipe={openRecipe} onClose={() => setOpenRecipeId(null)} /> : null
        })()}
      </Modal>
    </div>
  )
}
