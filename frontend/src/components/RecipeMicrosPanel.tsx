import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRecipeMicronutrients } from '../api/recipes'

// Compact key micronutrients shown by default (mirrors the "Micros" sidebar
// competitors show alongside a recipe) — the full list stays one click away
// so the panel doesn't overwhelm a small sidebar.
const HIGHLIGHT_FIELDS = [
  'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sodium_mg',
  'potassium_mg', 'calcium_mg', 'iron_mg', 'vitamin_c_mg',
]

export function RecipeMicrosPanel({ recipeId }: { recipeId: number }) {
  const [showAll, setShowAll] = useState(true)
  const { data: micros, isLoading, isError } = useQuery({
    queryKey: ['recipe-micronutrients', recipeId],
    queryFn: () => getRecipeMicronutrients(recipeId),
  })

  if (isLoading) return <p className="text-xs text-text-3">Calculando micros…</p>
  if (isError || !micros) return <p className="text-xs text-danger">No se pudieron calcular los micros.</p>

  if (!micros.usda_configurado) {
    return (
      <p className="rounded-md bg-warn-light px-3 py-2 text-xs text-warn">
        Esta función necesita una clave de USDA FoodData Central configurada en el servidor.
      </p>
    )
  }

  const fields = Object.keys(micros.campos)
  const visible = showAll ? fields : fields.filter((f) => HIGHLIGHT_FIELDS.includes(f))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text">Micros</h4>
        <span className="text-[10px] text-text-3">
          {micros.cobertura.con_datos}/{micros.cobertura.total} ingredientes
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {visible.map((field) => {
          const info = micros.campos[field]
          return (
            <li key={field} className="flex items-center justify-between text-xs">
              <span className="text-text-2">{info.label}</span>
              <span className="font-medium text-text">
                {(micros.totales[field] ?? 0).toFixed(1)} {info.unidad}
              </span>
            </li>
          )
        })}
      </ul>
      {fields.length > HIGHLIGHT_FIELDS.length && (
        <button onClick={() => setShowAll((v) => !v)} className="text-left text-[11px] font-medium text-accent hover:underline">
          {showAll ? 'Ver menos' : 'Ver todos los micronutrientes'}
        </button>
      )}
      {micros.ingredientes_sin_datos.length > 0 && (
        <p className="text-[10px] text-text-3">
          Sin dato USDA: {micros.ingredientes_sin_datos.join(', ')}
        </p>
      )}
    </div>
  )
}
