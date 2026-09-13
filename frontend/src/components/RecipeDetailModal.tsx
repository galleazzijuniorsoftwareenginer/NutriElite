import { useMutation, useQueryClient } from '@tanstack/react-query'
import { favoriteRecipe, unfavoriteRecipe, type Recipe } from '../api/recipes'
import { Button } from './Button'
import { CategoryTile } from './CategoryTile'
import { RecipeMicrosPanel } from './RecipeMicrosPanel'

const CATEGORY_GRADIENT: Record<string, string> = {
  Navidad: 'linear-gradient(135deg,#14122b,#1f1a44)',
  Nuevas: 'linear-gradient(135deg,#6d5bff,#4a37d1)',
  'Bajo en grasa': 'linear-gradient(135deg,#14b8a6,#0e9c92)',
  'Alto en proteína': 'linear-gradient(135deg,#6d5bff,#4a37d1)',
  Keto: 'linear-gradient(135deg,#b7791f,#8a5c15)',
  Ensaladas: 'linear-gradient(135deg,#29e0ce,#0e9c92)',
}
const DEFAULT_GRADIENT = 'linear-gradient(135deg,#6d5bff,#4a37d1)'

const CATEGORY_ICON: Record<string, string> = {
  Navidad: '🌲',
  Nuevas: '⭐',
  'Bajo en grasa': '🥗',
  'Alto en proteína': '🍳',
  Keto: '🥑',
  Ensaladas: '🥬',
}

const CATEGORY_IMAGE: Record<string, string> = {
  Navidad: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  Nuevas: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Bajo en grasa': 'https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  'Alto en proteína': 'https://images.unsplash.com/photo-1670398564097-0762e1b30b3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  Keto: 'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
  Ensaladas: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600',
}

export function recipeVisuals(recipe: Recipe) {
  const tag = recipe.categoria_tags?.[0]
  const gradient = (tag && CATEGORY_GRADIENT[tag]) || DEFAULT_GRADIENT
  const image = recipe.imagen_url || (tag && CATEGORY_IMAGE[tag])
  const icon = tag ? CATEGORY_ICON[tag] ?? '🍽' : '🍽'
  return { tag, gradient, image, icon }
}

export function RecipeDetailModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toggleFav = useMutation({
    mutationFn: () => (recipe.favorito ? unfavoriteRecipe(recipe.id) : favoriteRecipe(recipe.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  })
  const { gradient, image, icon } = recipeVisuals(recipe)

  return (
    <div className="grid max-h-[75vh] grid-cols-1 gap-4 overflow-y-auto scrollbar-thin sm:grid-cols-[1fr_200px]">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
            <CategoryTile imageUrl={image} gradient={gradient} icon={icon} alt={recipe.nombre} height={96} iconSize="text-2xl" />
          </div>
          <div>
            <span className="inline-flex w-fit items-center rounded-full bg-bg px-2 py-0.5 text-[10px] font-semibold text-text-2">
              {recipe.tiempo_comida}
            </span>
            <h3 className="mt-1 font-display text-lg font-bold text-text">{recipe.nombre}</h3>
            <p className="mt-1 text-xs text-text-3">{recipe.kcal_aprox ? `${Math.round(recipe.kcal_aprox)} kcal` : ''}</p>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold text-text">Ingredientes</h4>
          <ul className="flex flex-col gap-1">
            {recipe.ingredientes.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between text-sm text-text-2">
                <span>{i.alimento}</span>
                <span className="text-text-3">{i.cantidad_g} g</span>
              </li>
            ))}
          </ul>
        </div>

        {recipe.instrucciones && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-text">Preparación</h4>
            <p className="text-sm text-text-2 leading-relaxed">{recipe.instrucciones}</p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <button
            onClick={() => toggleFav.mutate()}
            className={`flex items-center gap-1 text-sm font-semibold ${recipe.favorito ? 'text-accent' : 'text-text-3 hover:text-accent'}`}
          >
            {recipe.favorito ? '★ Guardada' : '☆ Guardar'}
          </button>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
      </div>

      <div className="rounded-lg bg-bg p-3 sm:border sm:border-border">
        <RecipeMicrosPanel recipeId={recipe.id} />
      </div>
    </div>
  )
}
