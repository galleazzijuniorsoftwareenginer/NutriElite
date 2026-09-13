from unittest.mock import patch

from backend.models import Recipe
from backend.services import recipe_match_service as rms


def _recipe(id_, nombre, tiempo_comida, ingredientes, imagen_url=None, created_by=None):
    """Transient (unsaved) Recipe — enough for find_recipe_matches, which only
    reads attributes off the pool it's given. Never persisted, so tests never
    touch (or need to clean up) the real seeded 500-recipe bank."""
    r = Recipe(nombre=nombre, tiempo_comida=tiempo_comida, ingredientes=ingredientes, imagen_url=imagen_url, created_by=created_by)
    r.id = id_
    return r


def test_acervo_menu_matches_by_embedded_receta_name(db):
    pool = [_recipe(1, "Aguacate relleno de atún", "Comida",
                     [{"alimento": "Aguacate", "cantidad_g": 150}, {"alimento": "Atún", "cantidad_g": 100}],
                     imagen_url="https://example.com/aguacate.jpg")]
    weekly_menu = {
        "semana": [{
            "dia": "Lunes",
            "comidas": [{
                "tiempo": "Comida",
                "receta": "Aguacate relleno de atún",
                "itens": [{"alimento": "Aguacate", "quantidade_g": 150}],
            }],
        }]
    }

    with patch.object(rms, "_fetch_recipe_pool", return_value=pool):
        result = rms.find_recipe_matches(db, weekly_menu)

    assert result["Lunes"]["Comida"]["recipe_id"] == 1
    assert result["Lunes"]["Comida"]["score"] == 1.0


def test_ai_menu_matches_by_ingredient_overlap_when_confident(db):
    pool = [_recipe(2, "Ensalada de pollo con verduras", "Comida", [
        {"alimento": "Pechuga de pollo", "cantidad_g": 120},
        {"alimento": "Lechuga", "cantidad_g": 80},
        {"alimento": "Jitomate", "cantidad_g": 50},
    ])]
    weekly_menu = {
        "semana": [{
            "dia": "Martes",
            "comidas": [{
                "tiempo": "Comida",
                "itens": [
                    {"alimento": "Pechuga de pollo", "quantidade_g": 120},
                    {"alimento": "Lechuga", "quantidade_g": 80},
                ],
            }],
        }]
    }

    with patch.object(rms, "_fetch_recipe_pool", return_value=pool):
        result = rms.find_recipe_matches(db, weekly_menu)

    assert result["Martes"]["Comida"]["recipe_id"] == 2
    assert result["Martes"]["Comida"]["score"] >= rms.MIN_SCORE


def test_no_suggestion_when_no_recipe_is_close_enough(db):
    pool = [_recipe(3, "Sopa de lentejas", "Comida",
                     [{"alimento": "Lentejas", "cantidad_g": 100}, {"alimento": "Zanahoria", "cantidad_g": 50}])]
    weekly_menu = {
        "semana": [{
            "dia": "Miércoles",
            "comidas": [{
                "tiempo": "Comida",
                "itens": [{"alimento": "Salmón a la plancha", "quantidade_g": 150}],
            }],
        }]
    }

    with patch.object(rms, "_fetch_recipe_pool", return_value=pool):
        result = rms.find_recipe_matches(db, weekly_menu)

    assert result == {}


def test_day_with_error_is_skipped(db):
    weekly_menu = {"semana": [{"dia": "Jueves", "comidas": [], "error": "No generado"}]}

    with patch.object(rms, "_fetch_recipe_pool", return_value=[]):
        result = rms.find_recipe_matches(db, weekly_menu)

    assert result == {}


def test_fetch_recipe_pool_includes_private_recipe_only_for_its_owner(db):
    """Exercises the real DB filter (not mocked) — creates one private recipe
    without touching/deleting any other row, so the shared seeded recipe
    bank used by other tests is left intact."""
    private = Recipe(
        nombre="Receta privada de prueba únsafdlkj",
        tiempo_comida="Desayuno",
        ingredientes=[{"alimento": "Avena", "cantidad_g": 60}],
        created_by=999999,
    )
    db.add(private)
    db.commit()
    db.refresh(private)

    try:
        pool_owner = rms._fetch_recipe_pool(db, user_id=999999)
        pool_other_user = rms._fetch_recipe_pool(db, user_id=123456)
        pool_public = rms._fetch_recipe_pool(db, user_id=None)

        assert any(r.id == private.id for r in pool_owner)
        assert not any(r.id == private.id for r in pool_other_user)
        assert not any(r.id == private.id for r in pool_public)
    finally:
        db.delete(private)
        db.commit()
