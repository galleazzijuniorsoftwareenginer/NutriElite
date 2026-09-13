from unittest.mock import patch

from backend.models import IngredientNutrient
from backend.services import micronutrient_service as ms


def _fake_usda_food(fdc_id=123, description="Egg, white, raw"):
    return {
        "fdcId": fdc_id,
        "description": description,
        "foodNutrients": [
            {"nutrientName": "Energy", "unitName": "KCAL", "value": 52.0},
            {"nutrientName": "Protein", "unitName": "G", "value": 10.9},
            {"nutrientName": "Sodium, Na", "unitName": "MG", "value": 166.0},
            {"nutrientName": "Folate, total", "unitName": "UG", "value": 4.0},
        ],
    }


def test_normalize_ingredient_strips_accents_and_case():
    assert ms.normalize_ingredient("Clara de Huevo") == "clara de huevo"
    assert ms.normalize_ingredient("Jitomate  saladette!") == "jitomate saladette"
    assert ms.normalize_ingredient("Frijoles Negros") == ms.normalize_ingredient("frijoles   negros")


def test_get_or_fetch_matched_caches_result(db):
    db.query(IngredientNutrient).delete()
    db.commit()

    with patch.object(ms.usda_client, "search_food", return_value=_fake_usda_food()) as mock_search:
        row1 = ms.get_or_fetch(db, "Clara de huevo")
        assert row1.matched is True
        assert row1.kcal == 52.0
        assert row1.protein_g == 10.9
        assert row1.sodium_mg == 166.0
        assert row1.folate_mcg == 4.0
        assert mock_search.call_count == 1

        # Second lookup for the same (normalized) ingredient must hit the
        # cache, not call USDA again.
        row2 = ms.get_or_fetch(db, "CLARA DE HUEVO")
        assert row2.id == row1.id
        assert mock_search.call_count == 1


def test_get_or_fetch_unmatched_is_cached_as_such(db):
    db.query(IngredientNutrient).delete()
    db.commit()

    with patch.object(ms.usda_client, "search_food", return_value=None) as mock_search:
        row1 = ms.get_or_fetch(db, "Alimento inexistente xyz")
        assert row1.matched is False
        assert row1.kcal is None

        row2 = ms.get_or_fetch(db, "Alimento inexistente xyz")
        assert row2.id == row1.id
        assert mock_search.call_count == 1


def test_get_or_fetch_transient_failure_is_not_cached(db):
    from backend.services.usda_client import USDALookupError

    db.query(IngredientNutrient).delete()
    db.commit()

    with patch.object(ms.usda_client, "search_food", side_effect=USDALookupError("timeout")) as mock_search:
        row1 = ms.get_or_fetch(db, "Aceite de oliva")
        assert row1.matched is False
        assert row1.id is None  # never persisted

    # A later, successful lookup for the same ingredient must actually hit
    # USDA again — proving the transient failure did not poison the cache.
    with patch.object(ms.usda_client, "search_food", return_value=_fake_usda_food(description="Olive oil")) as mock_search:
        row2 = ms.get_or_fetch(db, "Aceite de oliva")
        assert row2.matched is True
        assert mock_search.call_count == 1


def test_calculate_recipe_micronutrients_scales_by_grams(db):
    db.query(IngredientNutrient).delete()
    db.commit()

    class FakeRecipe:
        ingredientes = [
            {"alimento": "Clara de huevo", "cantidad_g": 200},
            {"alimento": "Ingrediente sin dato", "cantidad_g": 50},
        ]

    def fake_search(query):
        return _fake_usda_food() if "egg" in query else None

    with patch.object(ms.usda_client, "search_food", side_effect=fake_search):
        result = ms.calculate_recipe_micronutrients(db, FakeRecipe())

    assert result["totales"]["kcal"] == 104.0
    assert result["totales"]["sodium_mg"] == 332.0
    assert "Ingrediente sin dato" in result["ingredientes_sin_datos"]
    assert result["cobertura"] == {"con_datos": 1, "total": 2}
    assert "campos" in result


def test_descriptor_suffixes_are_stripped_before_translation():
    assert ms._to_search_query(ms.normalize_ingredient("Pechuga de pollo a la plancha")) == "chicken breast"
    assert ms._to_search_query(ms.normalize_ingredient("Zanahoria cruda")) == "carrot"
    assert ms._to_search_query(ms.normalize_ingredient("Arroz integral cocido")) == "brown rice"


def test_calculate_plan_micronutrients_scales_by_grams_and_reports_gaps(db):
    db.query(IngredientNutrient).delete()
    db.commit()

    weekly_menu = {
        "semana": [
            {
                "dia": "Lunes",
                "comidas": [
                    {
                        "tiempo": "Desayuno",
                        "itens": [
                            {"alimento": "Clara de huevo", "quantidade_g": 200, "kcal": 104},
                            {"alimento": "Ingrediente sin dato", "quantidade_g": 50, "kcal": 50},
                        ],
                    }
                ],
            },
            {"dia": "Martes", "comidas": [], "error": "No generado"},
        ]
    }

    def fake_search(query):
        return _fake_usda_food() if "egg" in query else None

    with patch.object(ms.usda_client, "search_food", side_effect=fake_search):
        result = ms.calculate_plan_micronutrients(db, weekly_menu)

    lunes = next(d for d in result["dias"] if d["dia"] == "Lunes")
    # 200g -> 2x the per-100g value
    assert lunes["totales"]["kcal"] == 104.0
    assert lunes["totales"]["sodium_mg"] == 332.0

    martes = next(d for d in result["dias"] if d["dia"] == "Martes")
    assert martes["error"] == "No generado"

    assert result["totales_semana"]["kcal"] == 104.0
    assert "Ingrediente sin dato" in result["ingredientes_sin_datos"]
    assert result["cobertura"] == {"con_datos": 1, "total": 2}
    assert "kcal" in result["campos"]
    assert result["campos"]["sodium_mg"]["unidad"] == "mg"
