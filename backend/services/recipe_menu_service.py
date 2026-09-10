import random

from backend.models import Recipe

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

DEFAULT_MEAL_DISTRIBUTION = [
    {"tiempo": "Desayuno", "pct": 25, "horario": "08:00"},
    {"tiempo": "Colación matutina", "pct": 10, "horario": "11:00"},
    {"tiempo": "Comida", "pct": 30, "horario": "14:00"},
    {"tiempo": "Colación vespertina", "pct": 10, "horario": "17:00"},
    {"tiempo": "Cena", "pct": 20, "horario": "20:00"},
    {"tiempo": "Colación nocturna", "pct": 5, "horario": "22:00"},
]

RECIPE_TIEMPOS = ("Desayuno", "Colación", "Comida", "Cena")


def _normalize_tiempo(slot_tiempo: str) -> str:
    """Mapea el nombre de un tiempo de comida del wizard (que puede tener
    variantes como 'Colación matutina') a una de las categorías fijas que
    usa el acervo de recetas (Recipe.tiempo_comida)."""
    lower = slot_tiempo.lower()
    for tiempo in RECIPE_TIEMPOS:
        if tiempo.lower() in lower:
            return tiempo
    return "Colación"


def _fetch_recipe_pool(db, user_id: int | None) -> dict:
    """Recetas del banco del sistema (created_by=null) más las privadas del
    nutricionista actual, agrupadas por tiempo_comida."""
    pool: dict[str, list[Recipe]] = {t: [] for t in RECIPE_TIEMPOS}
    query = db.query(Recipe)
    if user_id is not None:
        from sqlalchemy import or_
        query = query.filter(or_(Recipe.created_by.is_(None), Recipe.created_by == user_id))
    else:
        query = query.filter(Recipe.created_by.is_(None))
    for recipe in query.all():
        if recipe.tiempo_comida in pool:
            pool[recipe.tiempo_comida].append(recipe)
    return pool


def _pick_recipe(candidates: list[Recipe], target_kcal: float, goal: str, used_ids: set[int]) -> Recipe | None:
    """Elige la receta cuyo kcal_aprox está más cerca del objetivo del
    tiempo de comida, priorizando las que calzan con el objetivo (cut/bulk/
    maintenance) y evitando repetir una receta ya usada en la semana mientras
    haya alternativas disponibles."""
    if not candidates:
        return None

    def score(r: Recipe) -> tuple:
        tags = r.goal_tags or []
        goal_match = 0 if goal in tags else 1
        already_used = 1 if r.id in used_ids else 0
        kcal_diff = abs((r.kcal_aprox or 0) - target_kcal)
        return (already_used, goal_match, kcal_diff)

    return min(candidates, key=score)


def _split_kcal_by_grams(ingredientes: list[dict], total_kcal: float) -> list[dict]:
    """Reparte el kcal_aprox total de la receta entre sus ingredientes de
    forma proporcional a los gramos — el acervo solo guarda el kcal total del
    platillo, no un desglose por ingrediente (eso requiere datos de micros
    tipo USDA, pendiente en un bloque futuro)."""
    total_g = sum(max(0, ing.get("cantidad_g", 0)) for ing in ingredientes) or 1
    items = []
    assigned = 0
    for i, ing in enumerate(ingredientes):
        grams = max(0, ing.get("cantidad_g", 0))
        if i == len(ingredientes) - 1:
            kcal = max(1, round(total_kcal) - assigned)
        else:
            kcal = max(1, round(total_kcal * grams / total_g))
            assigned += kcal
        items.append({"alimento": ing.get("alimento", ""), "quantidade_g": grams, "kcal": kcal})
    return items


def generate_acervo_menu(plan_data: dict, audit_data: dict, db, user_id: int | None = None) -> dict:
    """Arma el menú semanal seleccionando recetas reales del acervo en vez de
    llamar a la IA — usa los platillos y gramajes tal cual están guardados en
    Recipe (ingredientes, kcal_aprox), sin inventar nada. Es el método
    primario para generar el menú; el generador con IA queda como opción
    secundaria para cuando el nutricionista quiera variar más allá del
    acervo disponible."""
    goal = (plan_data.get("goal") or "maintenance").lower()
    get = audit_data["energy_validation"]["get_planned"]
    distribution = plan_data.get("meal_distribution") or DEFAULT_MEAL_DISTRIBUTION
    protein_target = audit_data["totals"]["protein_g"]
    carbs_target = audit_data["totals"]["carbs_g"]
    fats_target = audit_data["totals"]["fats_g"]

    pool = _fetch_recipe_pool(db, user_id)
    used_ids: set[int] = set()
    semana = []

    for dia in DIAS_SEMANA:
        comidas = []
        day_kcal = 0.0
        for slot in distribution:
            tiempo_key = _normalize_tiempo(slot["tiempo"])
            target_kcal = get * slot["pct"] / 100
            candidates = pool.get(tiempo_key, [])
            recipe = _pick_recipe(candidates, target_kcal, goal, used_ids)

            if not recipe:
                comidas.append({
                    "tiempo": slot["tiempo"],
                    "kcal": round(target_kcal),
                    "itens": [],
                    "error": f"Sin recetas disponibles en el acervo para {tiempo_key}",
                })
                continue

            used_ids.add(recipe.id)
            recipe_kcal = recipe.kcal_aprox or target_kcal
            itens = _split_kcal_by_grams(recipe.ingredientes or [], recipe_kcal)
            day_kcal += recipe_kcal
            comidas.append({
                "tiempo": slot["tiempo"],
                "kcal": round(recipe_kcal),
                "itens": itens,
                "receta": recipe.nombre,
                "imagen_url": recipe.imagen_url,
            })

        scale = (day_kcal / get) if get else 1
        semana.append({
            "dia": dia,
            "comidas": comidas,
            "macros": {
                "proteina_g": round(protein_target * scale, 1),
                "carb_g": round(carbs_target * scale, 1),
                "gordura_g": round(fats_target * scale, 1),
                "kcal_total": round(day_kcal),
            },
        })

    return {"semana": semana}
