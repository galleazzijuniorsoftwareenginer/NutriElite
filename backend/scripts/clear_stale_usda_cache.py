"""One-off cleanup: deletes IngredientNutrient rows cached as matched=False.

Needed once, for any deployment where ingredients were looked up before
USDA_FDC_API_KEY was configured — those lookups got permanently cached as
"no match" even though USDA was simply never queried. Safe to run anytime:
matched=False rows are pure cache, so deleting them just makes the next
access re-check USDA instead of trusting a stale/incorrect negative result.

Usage: python -m backend.scripts.clear_stale_usda_cache
"""
from backend.database import SessionLocal
from backend.models import IngredientNutrient


def clear_stale_usda_cache() -> int:
    db = SessionLocal()
    try:
        deleted = db.query(IngredientNutrient).filter_by(matched=False).delete()
        db.commit()
        return deleted
    finally:
        db.close()


if __name__ == "__main__":
    count = clear_stale_usda_cache()
    print(f"Eliminados {count} registros de caché negativa de USDA.")
