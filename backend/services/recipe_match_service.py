"""Matches each comida (day + tiempo) of a plan's weekly_menu against the
recipe bank, so the frontend can show "receta similar en tu acervo" next to
menu items — see CLAUDE.md's Bloco 5 (2026-09).

Acervo-generated menus (recipe_menu_service.generate_acervo_menu) already
used a real Recipe 1:1, and embed its name/photo on the comida dict — those
match at score 1.0 by name lookup, no guessing involved. AI-generated menus
(ai_menu_service.py) invent free-form dishes with no recipe reference at
all, so for those we score candidate recipes of the same tiempo_comida by
ingredient-set overlap (reusing micronutrient_service's normalization) and
only surface a match confident enough to be useful — never a weak guess.
"""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.models import Recipe
from backend.services.micronutrient_service import normalize_ingredient
from backend.services.recipe_menu_service import RECIPE_TIEMPOS, normalize_tiempo

# Jaccard overlap between a comida's ingredient names and a recipe's —
# below this, two dishes are more likely coincidentally sharing one
# ingredient (e.g. both have "sal") than actually being the same dish.
MIN_SCORE = 0.5


def _recipe_ingredient_set(recipe: Recipe) -> set[str]:
    return {
        normalize_ingredient(ing.get("alimento", ""))
        for ing in (recipe.ingredientes or [])
        if ing.get("alimento")
    }


def _comida_ingredient_set(comida: dict) -> set[str]:
    itens = comida.get("itens") or comida.get("items") or []
    return {
        normalize_ingredient(item.get("alimento", ""))
        for item in itens
        if item.get("alimento")
    }


def _overlap_score(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _fetch_recipe_pool(db: Session, user_id: int | None) -> list[Recipe]:
    query = db.query(Recipe)
    if user_id is not None:
        query = query.filter(or_(Recipe.created_by.is_(None), Recipe.created_by == user_id))
    else:
        query = query.filter(Recipe.created_by.is_(None))
    return query.all()


def find_recipe_matches(db: Session, weekly_menu: dict, user_id: int | None = None) -> dict:
    """Returns {dia: {tiempo: {recipe_id, nombre, imagen_url, score}}} —
    only for day+tiempo pairs with a confident match. A day/tiempo absent
    from the result simply has no recipe suggestion, never a fabricated one."""
    recipes = _fetch_recipe_pool(db, user_id)
    by_nombre = {r.nombre.strip().lower(): r for r in recipes if r.nombre}
    by_tiempo: dict[str, list[Recipe]] = {t: [] for t in RECIPE_TIEMPOS}
    for r in recipes:
        if r.tiempo_comida in by_tiempo:
            by_tiempo[r.tiempo_comida].append(r)

    result: dict = {}
    for day in weekly_menu.get("semana", []):
        dia = day.get("dia")
        if not dia or day.get("error"):
            continue

        tiempos_out: dict = {}
        for comida in day.get("comidas", []):
            tiempo = comida.get("tiempo")
            if not tiempo:
                continue

            # Acervo menus already know exactly which recipe they used.
            receta_nombre = (comida.get("receta") or "").strip().lower()
            recipe = by_nombre.get(receta_nombre) if receta_nombre else None
            if recipe:
                tiempos_out[tiempo] = {
                    "recipe_id": recipe.id,
                    "nombre": recipe.nombre,
                    "imagen_url": recipe.imagen_url,
                    "score": 1.0,
                }
                continue

            comida_set = _comida_ingredient_set(comida)
            if not comida_set:
                continue
            candidates = by_tiempo.get(normalize_tiempo(tiempo), [])
            best_recipe, best_score = None, 0.0
            for candidate in candidates:
                score = _overlap_score(comida_set, _recipe_ingredient_set(candidate))
                if score > best_score:
                    best_recipe, best_score = candidate, score
            if best_recipe and best_score >= MIN_SCORE:
                tiempos_out[tiempo] = {
                    "recipe_id": best_recipe.id,
                    "nombre": best_recipe.nombre,
                    "imagen_url": best_recipe.imagen_url,
                    "score": round(best_score, 2),
                }

        if tiempos_out:
            result[dia] = tiempos_out

    return result
