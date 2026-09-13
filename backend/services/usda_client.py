"""Thin client for the USDA FoodData Central (FDC) public API.

FDC is the US government's free, public-domain food composition database
(https://fdc.nal.usda.gov/). We only use it to look up per-100g nutrient
values for a food name — no personal data is ever sent to it.

Requires USDA_FDC_API_KEY (free, instant signup at
https://fdc.nal.usda.gov/api-key-signup). Without it, lookups are skipped
and callers get an "unmatched" result instead of a fabricated one.
"""
import os
import requests

FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
REQUEST_TIMEOUT_S = 8

# Prefer well-vetted, non-branded data (per-100g, lab-analyzed) over Branded
# Foods (which are per-serving and label-derived, noisier for this use case).
PREFERRED_DATA_TYPES = "Foundation,SR Legacy"

# Map our field name -> the exact USDA nutrientName string(s) that identify
# it. Matched by exact case-insensitive equality against foodNutrients[].nutrientName,
# never by numeric nutrientId (those aren't worth trusting from memory).
NUTRIENT_NAME_MAP: dict[str, list[str]] = {
    "kcal": ["Energy"],
    "protein_g": ["Protein"],
    "carbs_g": ["Carbohydrate, by difference"],
    "fat_g": ["Total lipid (fat)"],
    "fiber_g": ["Fiber, total dietary"],
    "sugar_g": ["Sugars, total including NLEA", "Sugars, total"],
    "saturated_fat_g": ["Fatty acids, total saturated"],
    "monounsaturated_fat_g": ["Fatty acids, total monounsaturated"],
    "polyunsaturated_fat_g": ["Fatty acids, total polyunsaturated"],
    "cholesterol_mg": ["Cholesterol"],
    "calcium_mg": ["Calcium, Ca"],
    "iron_mg": ["Iron, Fe"],
    "magnesium_mg": ["Magnesium, Mg"],
    "phosphorus_mg": ["Phosphorus, P"],
    "potassium_mg": ["Potassium, K"],
    "sodium_mg": ["Sodium, Na"],
    "zinc_mg": ["Zinc, Zn"],
    "copper_mg": ["Copper, Cu"],
    "selenium_mcg": ["Selenium, Se"],
    "vitamin_c_mg": ["Vitamin C, total ascorbic acid"],
    "thiamin_mg": ["Thiamin"],
    "riboflavin_mg": ["Riboflavin"],
    "niacin_mg": ["Niacin"],
    "vitamin_b6_mg": ["Vitamin B-6"],
    "folate_mcg": ["Folate, total"],
    "vitamin_b12_mcg": ["Vitamin B-12"],
    "vitamin_a_mcg": ["Vitamin A, RAE"],
}

class USDALookupError(Exception):
    """Raised when the USDA request itself failed (network, timeout, rate
    limit, 5xx) — as opposed to the request succeeding with zero results.
    Callers must NOT cache this as "no match": a transient failure is not
    evidence the food doesn't exist in USDA, and caching it as such would
    permanently blacklist a perfectly common ingredient just because one
    request happened to time out or get rate-limited."""


def get_api_key() -> str:
    return os.environ.get("USDA_FDC_API_KEY", "")


def search_food(query: str) -> dict | None:
    """Looks up `query` in FDC and returns the best-match food's raw JSON
    (with its foodNutrients list), or None if the request succeeded but
    found nothing (or no API key is configured — same as "nothing to look
    up"). Raises USDALookupError if the request itself failed, so callers
    can tell "confirmed absent" apart from "couldn't check right now"."""
    if not query.strip():
        return None
    api_key = get_api_key()
    if not api_key:
        # Not configured is not the same as "confirmed absent from USDA" —
        # raise so callers don't cache this as a permanent non-match. Without
        # this, an ingredient looked up before USDA_FDC_API_KEY was set would
        # stay incorrectly blacklisted forever, even after the key is added.
        raise USDALookupError("USDA_FDC_API_KEY no configurada")
    try:
        resp = requests.get(
            FDC_SEARCH_URL,
            params={
                "api_key": api_key,
                "query": query,
                "dataType": PREFERRED_DATA_TYPES,
                "pageSize": 1,
            },
            timeout=REQUEST_TIMEOUT_S,
        )
        resp.raise_for_status()
        data = resp.json()
        foods = data.get("foods") or []
        return foods[0] if foods else None
    except (requests.RequestException, ValueError) as e:
        raise USDALookupError(str(e)) from e


def extract_nutrients_per_100g(food: dict) -> dict:
    """Pulls the fields in NUTRIENT_NAME_MAP out of a raw FDC food JSON.
    Missing nutrients are simply absent from the result (never zero-filled —
    a recipe missing folate data should show as missing, not as 0mcg)."""
    by_name: dict[str, tuple[float, str]] = {}
    for n in food.get("foodNutrients", []):
        name = (n.get("nutrientName") or "").strip()
        value = n.get("value")
        unit = (n.get("unitName") or "").strip().upper()
        if name and value is not None:
            by_name[name.lower()] = (float(value), unit)

    result: dict = {}
    for field, candidates in NUTRIENT_NAME_MAP.items():
        for candidate in candidates:
            hit = by_name.get(candidate.lower())
            if hit is not None:
                result[field] = hit[0]
                break
    return result
