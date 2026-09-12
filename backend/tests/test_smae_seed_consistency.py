"""Protege contra o exato tipo de bug que este projeto já teve em produção:
Azucares/Con grasa tinha protein=25 no seed, inconsistente com seu kcal=85
publicado (a regra 4-4-9 dava 185kcal, não 85). Um teste de poucas linhas
como este teria pego isso automaticamente antes de chegar a qualquer plano
de paciente."""
import pytest

from backend.models import FoodGroup


def test_every_food_group_row_matches_4_4_9_rule(db):
    rows = db.query(FoodGroup).all()
    assert len(rows) == 17, "El seed SMAE debe tener las 17 filas oficiales"

    for row in rows:
        expected_kcal = row.protein * 4 + row.fats * 9 + row.carbs * 4
        label = f"{row.group_name}/{row.subgroup_name}"
        # Tolerancia del 12%: la tabla oficial del SMAE (cross-validada en la
        # auditoría contra UNAM/FNS/heynutre) no es estrictamente 4-4-9 en
        # todas las filas — sobre todo en Leche, donde el kcal publicado es
        # hasta ~9% menor que protein*4+fats*9+carbs*4. Esto detecta un error
        # de captura grosero (como el de Azucares/Con grasa, que era un 118%
        # de desvío) sin romper por el redondeo real de la fuente oficial.
        assert row.kcal == pytest.approx(expected_kcal, rel=0.12), (
            f"{label}: kcal={row.kcal} pero protein*4+fats*9+carbs*4={expected_kcal:.1f}"
        )


def test_no_negative_macros(db):
    rows = db.query(FoodGroup).all()
    for row in rows:
        label = f"{row.group_name}/{row.subgroup_name}"
        assert row.kcal >= 0, label
        assert row.protein >= 0, label
        assert row.fats >= 0, label
        assert row.carbs >= 0, label


def test_azucares_con_grasa_protein_is_zero(db):
    row = (
        db.query(FoodGroup)
        .filter(FoodGroup.group_name == "Azucares", FoodGroup.subgroup_name == "Con grasa")
        .first()
    )
    assert row is not None
    assert row.protein == 0
    assert row.kcal == 85
