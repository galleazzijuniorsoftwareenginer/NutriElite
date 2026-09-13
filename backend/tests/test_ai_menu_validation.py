import pytest

from backend.services.ai_menu_service import _validate_day_json


def _day(comida_kcal, item_kcal, item_qty=100, kcal_total=None):
    return {
        "dia": "Lunes",
        "comidas": [
            {
                "tiempo": "Desayuno",
                "kcal": comida_kcal,
                "itens": [{"alimento": "Avena", "quantidade_g": item_qty, "kcal": item_kcal}],
            }
        ],
        "macros": {
            "proteina_g": 30,
            "carb_g": 70,
            "gordura_g": 15,
            "kcal_total": kcal_total if kcal_total is not None else comida_kcal,
        },
    }


def test_valid_day_passes():
    _validate_day_json(_day(300, 300, item_qty=80))


def test_missing_comidas_raises():
    with pytest.raises(ValueError):
        _validate_day_json({"dia": "Lunes", "comidas": []})


def test_missing_quantidade_g_raises():
    day = _day(300, 300)
    del day["comidas"][0]["itens"][0]["quantidade_g"]
    with pytest.raises(ValueError):
        _validate_day_json(day)


def test_missing_alimento_name_raises():
    day = _day(300, 300)
    day["comidas"][0]["itens"][0]["alimento"] = ""
    with pytest.raises(ValueError):
        _validate_day_json(day)


def test_impossible_calorie_density_raises():
    # 950kcal/100g supera la densidad del aceite puro (~900kcal/100g) — físicamente imposible.
    with pytest.raises(ValueError, match="[Dd]ensidad"):
        _validate_day_json(_day(950, 950, item_qty=100))


def test_item_sum_inconsistent_with_declared_tiempo_kcal_raises():
    with pytest.raises(ValueError, match="[Ii]tens"):
        _validate_day_json(_day(comida_kcal=900, item_kcal=100, item_qty=80))


def test_day_total_inconsistent_with_macros_kcal_total_raises():
    day = _day(comida_kcal=300, item_kcal=300, item_qty=80, kcal_total=1500)
    with pytest.raises(ValueError, match="del día"):
        _validate_day_json(day)


def test_restricted_ingredient_raises():
    day = _day(300, 300, item_qty=80)
    with pytest.raises(ValueError, match="restringido"):
        _validate_day_json(day, restricted_ingredients=["avena"])


def test_restricted_ingredient_matches_as_substring_case_insensitive():
    day = _day(300, 300, item_qty=80)
    day["comidas"][0]["itens"][0]["alimento"] = "Avena con frutas tropicales"
    with pytest.raises(ValueError, match="restringido"):
        _validate_day_json(day, restricted_ingredients=["AVENA"])


def test_unrelated_restriction_does_not_raise():
    _validate_day_json(_day(300, 300, item_qty=80), restricted_ingredients=["camarón"])
