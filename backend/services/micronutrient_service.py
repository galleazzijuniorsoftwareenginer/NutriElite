"""Per-menu-item micronutrient lookup, backed by a cache-aside table of
USDA FoodData Central data (see usda_client.py and models.IngredientNutrient).

Works on the same `{alimento, quantidade_g}` item shape produced by both the
acervo menu engine (recipe_menu_service.py) and the AI menu engine
(ai_menu_service.py) — see CLAUDE.md's "AI Menu Response Shape" — so it
covers a plan's weekly_menu regardless of how it was generated, with no
dependency on the item being linked back to a Recipe row.

Ingredients with no USDA match are reported, never silently zeroed: a
missing folate value must look missing, not like "0mcg of folate".
"""
import re
import unicodedata
from sqlalchemy.orm import Session

from backend.models import IngredientNutrient
from backend.services import usda_client

# Best-effort Spanish -> English translation for the USDA search query only.
# This never affects the nutrient VALUES returned (those always come from
# USDA's own data for whatever food actually matches) — it just improves the
# odds of finding a match, since FDC is indexed in English. Ingredients not
# in this dict are searched with their original (Spanish) name as a
# fallback, which still works for many foods (e.g. "Tortilla", "Mango").
ES_EN_FOOD_TERMS = {
    "clara de huevo": "egg white", "huevo": "egg", "huevo entero": "whole egg",
    "yema de huevo": "egg yolk", "pechuga de pollo": "chicken breast",
    "pollo": "chicken", "muslo de pollo": "chicken thigh", "carne de res": "beef",
    "res molida": "ground beef", "cerdo": "pork", "lomo de cerdo": "pork loin",
    "pescado": "fish", "atun": "tuna", "salmon": "salmon", "camaron": "shrimp",
    "camarones": "shrimp", "tilapia": "tilapia", "pavo": "turkey",
    "jamon": "ham", "jamon de pavo": "turkey ham", "tocino": "bacon",
    "leche": "milk", "leche descremada": "skim milk", "leche entera": "whole milk",
    "yogur": "yogurt", "yogur griego": "greek yogurt", "queso": "cheese",
    "queso panela": "queso panela", "queso cottage": "cottage cheese",
    "queso oaxaca": "oaxaca cheese", "requeson": "ricotta cheese",
    "crema": "cream", "mantequilla": "butter",
    "frijol": "beans", "frijoles": "beans", "frijoles negros": "black beans",
    "lentejas": "lentils", "garbanzos": "chickpeas", "habas": "fava beans",
    "arroz": "rice", "arroz integral": "brown rice", "avena": "oats",
    "pan integral": "whole wheat bread", "pan blanco": "white bread",
    "tortilla": "tortilla", "tortilla de maiz": "corn tortilla",
    "tortilla de harina": "flour tortilla", "pasta": "pasta",
    "papa": "potato", "camote": "sweet potato", "elote": "corn",
    "maiz": "corn", "quinoa": "quinoa",
    "manzana": "apple", "platano": "banana", "fresas": "strawberries",
    "fresa": "strawberry", "naranja": "orange", "mango": "mango",
    "papaya": "papaya", "melon": "melon", "sandia": "watermelon",
    "uvas": "grapes", "pina": "pineapple", "kiwi": "kiwi",
    "aguacate": "avocado", "limon": "lime", "toronja": "grapefruit",
    "jitomate": "tomato", "tomate": "tomato", "cebolla": "onion",
    "lechuga": "lettuce", "espinaca": "spinach", "espinacas": "spinach",
    "brocoli": "broccoli", "zanahoria": "carrot", "pepino": "cucumber",
    "chile": "chili pepper", "pimiento": "bell pepper",
    "calabacita": "zucchini", "calabaza": "squash", "champinones": "mushrooms",
    "ajo": "garlic", "apio": "celery", "col": "cabbage",
    "aceite de oliva": "olive oil", "aceite vegetal": "vegetable oil",
    "aceite de coco": "coconut oil", "almendras": "almonds", "nueces": "walnuts",
    "cacahuate": "peanuts", "cacahuates": "peanuts",
    "crema de cacahuate": "peanut butter", "chia": "chia seeds",
    "linaza": "flaxseed", "ajonjoli": "sesame seeds",
    "azucar": "sugar", "miel": "honey", "sal": "salt",
    "salsa de soya": "soy sauce", "vinagre": "vinegar",
    "cafe": "coffee", "te": "tea", "canela": "cinnamon",
}


def normalize_ingredient(name: str) -> str:
    """Lowercase, strip accents/punctuation, collapse whitespace — used both
    as the cache key and (for entries not in ES_EN_FOOD_TERMS) as the USDA
    search term itself."""
    text = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _to_search_query(normalized: str) -> str:
    return ES_EN_FOOD_TERMS.get(normalized, normalized)


def get_or_fetch(db: Session, alimento: str) -> IngredientNutrient:
    """Cache-aside lookup: returns the cached row if present, otherwise
    queries USDA once, stores the result (matched or not) and returns it.
    A stored matched=False row means "we looked, no confident match" — it's
    cached too, so a genuinely-unmatched ingredient isn't re-queried on
    every single request."""
    normalized = normalize_ingredient(alimento)
    existing = db.query(IngredientNutrient).filter_by(alimento_normalizado=normalized).first()
    if existing:
        return existing

    food = usda_client.search_food(_to_search_query(normalized))
    if food is None:
        row = IngredientNutrient(
            alimento_normalizado=normalized,
            alimento_original=alimento,
            matched=False,
        )
    else:
        nutrients = usda_client.extract_nutrients_per_100g(food)
        row = IngredientNutrient(
            alimento_normalizado=normalized,
            alimento_original=alimento,
            matched=True,
            fdc_id=food.get("fdcId"),
            usda_food_name=food.get("description"),
            **nutrients,
        )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


NUTRIENT_FIELDS = [f for f in IngredientNutrient.__table__.columns.keys()
                    if f not in ("id", "alimento_normalizado", "alimento_original",
                                 "matched", "fdc_id", "usda_food_name", "created_at", "updated_at")]

# field -> (etiqueta en español, unidad) — usado tanto en la respuesta JSON
# como en la hoja de cálculo exportada, para no duplicar esto en el frontend.
NUTRIENT_LABELS: dict[str, tuple[str, str]] = {
    "kcal": ("Energía", "kcal"),
    "protein_g": ("Proteína", "g"),
    "carbs_g": ("Carbohidratos", "g"),
    "fat_g": ("Grasas totales", "g"),
    "fiber_g": ("Fibra", "g"),
    "sugar_g": ("Azúcares", "g"),
    "saturated_fat_g": ("AG saturados", "g"),
    "monounsaturated_fat_g": ("AG monoinsaturados", "g"),
    "polyunsaturated_fat_g": ("AG poliinsaturados", "g"),
    "cholesterol_mg": ("Colesterol", "mg"),
    "calcium_mg": ("Calcio", "mg"),
    "iron_mg": ("Hierro", "mg"),
    "magnesium_mg": ("Magnesio", "mg"),
    "phosphorus_mg": ("Fósforo", "mg"),
    "potassium_mg": ("Potasio", "mg"),
    "sodium_mg": ("Sodio", "mg"),
    "zinc_mg": ("Zinc", "mg"),
    "copper_mg": ("Cobre", "mg"),
    "selenium_mcg": ("Selenio", "mcg"),
    "vitamin_c_mg": ("Vitamina C", "mg"),
    "thiamin_mg": ("Tiamina (B1)", "mg"),
    "riboflavin_mg": ("Riboflavina (B2)", "mg"),
    "niacin_mg": ("Niacina (B3)", "mg"),
    "vitamin_b6_mg": ("Vitamina B6", "mg"),
    "folate_mcg": ("Folato", "mcg"),
    "vitamin_b12_mcg": ("Vitamina B12", "mcg"),
    "vitamin_a_mcg": ("Vitamina A", "mcg"),
}


def calculate_plan_micronutrients(db: Session, weekly_menu: dict) -> dict:
    """Walks a Plan.weekly_menu JSON blob (the `{"semana": [...]}` shape) and
    returns per-day + week-total micronutrient sums, scaled by each item's
    quantidade_g against the cached per-100g values. Ingredients without a
    USDA match are listed separately rather than treated as zero."""
    week_totals: dict = {f: 0.0 for f in NUTRIENT_FIELDS}
    days_out = []
    unmatched: set[str] = set()
    matched_count = 0
    total_count = 0

    for day in weekly_menu.get("semana", []):
        day_totals: dict = {f: 0.0 for f in NUTRIENT_FIELDS}
        if day.get("error"):
            days_out.append({"dia": day.get("dia"), "totales": day_totals, "error": day["error"]})
            continue
        for comida in day.get("comidas", []):
            for item in comida.get("itens", []):
                alimento = item.get("alimento") or ""
                grams = item.get("quantidade_g") or 0
                if not alimento or grams <= 0:
                    continue
                total_count += 1
                row = get_or_fetch(db, alimento)
                if not row.matched:
                    unmatched.add(alimento)
                    continue
                matched_count += 1
                factor = grams / 100.0
                for field in NUTRIENT_FIELDS:
                    value = getattr(row, field)
                    if value is not None:
                        day_totals[field] += value * factor
                        week_totals[field] += value * factor
        days_out.append({"dia": day.get("dia"), "totales": day_totals})

    return {
        "dias": days_out,
        "totales_semana": week_totals,
        "ingredientes_sin_datos": sorted(unmatched),
        "cobertura": {"con_datos": matched_count, "total": total_count},
        "usda_configurado": bool(usda_client.get_api_key()),
        "campos": {f: {"label": label, "unidad": unit} for f, (label, unit) in NUTRIENT_LABELS.items()},
    }
