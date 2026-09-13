import { useQuery } from '@tanstack/react-query'
import { getReferenceGuide } from '../../api/reference'
import { Card } from '../../components/Card'
import { Spinner } from '../../components/Spinner'
import { Button } from '../../components/Button'

export function ReferencePage() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['reference-guide'], queryFn: getReferenceGuide })

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-danger">No se pudo cargar la central de referencia.</p>
        <Button size="sm" variant="secondary" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Central de referencia</h1>
        <p className="text-sm text-text-2">Fórmulas, guías SMAE y KDOQI para consulta rápida — útil para estudiar o repasar en consulta.</p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-text">Fórmulas de TMB</h2>
        <div className="flex flex-col gap-4">
          {data.bmr_formulas.map((f) => (
            <div key={f.nombre} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium text-text">{f.nombre}</p>
              <p className="mb-2 text-xs text-text-2">{f.cuando_usar}</p>
              <p className="text-xs text-text-3">
                <span className="font-medium text-text-2">Hombre:</span> {f.formula_hombre}
              </p>
              <p className="text-xs text-text-3">
                <span className="font-medium text-text-2">Mujer:</span> {f.formula_mujer}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-text">Factores de actividad</h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-text-3">
              <th className="py-1.5 font-medium">Nivel</th>
              <th className="font-medium">Factor</th>
              <th className="font-medium">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {data.activity_multipliers.map((a) => (
              <tr key={a.nivel} className="border-b border-border/60">
                <td className="py-1.5 font-medium text-text">{a.nivel}</td>
                <td>{a.factor}</td>
                <td className="text-text-2">{a.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-text">Grupos SMAE — rol en el plan</h2>
        <ul className="flex flex-col gap-2">
          {data.smae_groups_guide.map((g) => (
            <li key={g.grupo} className="text-xs">
              <span className="font-medium text-text">{g.grupo}:</span> <span className="text-text-2">{g.rol}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-text">Resumen KDOQI 2020 — proteína por etapa de ERC</h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-text-3">
              <th className="py-1.5 font-medium">Etapa</th>
              <th className="font-medium">TFG</th>
              <th className="font-medium">Proteína g/kg</th>
              <th className="font-medium">Nota</th>
            </tr>
          </thead>
          <tbody>
            {data.kdoqi_summary.map((k) => (
              <tr key={k.etapa} className="border-b border-border/60">
                <td className="py-1.5 font-medium text-text">{k.etapa}</td>
                <td>{k.tfg}</td>
                <td>{k.proteina_g_kg}</td>
                <td className="text-text-2">{k.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
