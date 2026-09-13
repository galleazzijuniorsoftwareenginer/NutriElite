import pytest
from fastapi import HTTPException

from backend.models import FoodGroup, Patient, User
from backend.routes.auth import hash_password
from backend.schemas.plan import PlanRequest
from backend.services.metabolic_service import calculate_tmb
from backend.services.plan_service import _resolve_patient_id, calculate_smae_portions, create_plan


class _FakePlan:
    def __init__(self, goal, get, protein, fats, carbs):
        self.goal = goal
        self.get = get
        self.protein = protein
        self.fats = fats
        self.carbs = carbs


SCENARIOS = [
    _FakePlan("cut", 1800, 150, 50, 150),
    _FakePlan("bulk", 3200, 180, 90, 420),
    _FakePlan("maintenance", 2200, 100, 70, 280),
    _FakePlan("cut", 2000, 200, 60, 150),
]


def _total_kcal(db, portions):
    foods = {f.group_name + "|" + (f.subgroup_name or ""): f for f in db.query(FoodGroup).all()}
    total = 0.0
    for row in portions:
        food = foods.get(row["group"] + "|" + (row["subgroup"] or ""))
        if food:
            total += row["portions"] * food.kcal
    return total


def test_all_portions_are_non_negative(db):
    for plan in SCENARIOS:
        portions = calculate_smae_portions(db, plan)
        for row in portions:
            assert row["portions"] >= 0, f"{plan.goal}/{plan.get}kcal: {row}"


def test_energy_closure_within_reasonable_tolerance(db):
    # El cierre energético (cereales/frutas) debe acercar el total real al GET
    # objetivo — antes de esta corrección, la función terminaba sin ningún
    # ajuste y el gap podía ser arbitrariamente grande.
    for plan in SCENARIOS:
        portions = calculate_smae_portions(db, plan)
        total_kcal = _total_kcal(db, portions)
        gap_pct = abs(total_kcal - plan.get) / plan.get * 100
        assert gap_pct < 10, f"{plan.goal}/{plan.get}kcal: gap={gap_pct:.1f}% (total={total_kcal})"


def _make_user(db, username):
    user = User(username=username, password=hash_password("x"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_resolve_patient_id_rejects_patient_owned_by_another_user(db):
    # Regresión: _resolve_patient_id devolvía explicit_patient_id sin
    # verificar que el paciente fuera del usuario autenticado — un
    # nutricionista podía vincular su plan al paciente de otro (ids
    # secuenciales, adivinables) y luego leer su historial clínico vía
    # /plans/{id}/pdf. Debe rechazar con 404 en vez de aceptarlo.
    owner = _make_user(db, "owner_a")
    attacker = _make_user(db, "attacker_b")
    victim_patient = Patient(name="Paciente de owner_a", user_id=owner.id)
    db.add(victim_patient)
    db.commit()
    db.refresh(victim_patient)

    with pytest.raises(HTTPException) as exc_info:
        _resolve_patient_id(db, attacker.id, victim_patient.id, "x", "x@x.com", "555")
    assert exc_info.value.status_code == 404


def test_resolve_patient_id_accepts_own_patient(db):
    owner = _make_user(db, "owner_c")
    patient = Patient(name="Paciente propio", user_id=owner.id)
    db.add(patient)
    db.commit()
    db.refresh(patient)

    resolved = _resolve_patient_id(db, owner.id, patient.id, "x", "x@x.com", "555")
    assert resolved == patient.id


def test_get_includes_thermic_effect_of_food(db):
    # GET debe incluir el ETA (efecto térmico de los alimentos, +10% fijo)
    # aplicado sobre GEB×AF, antes del ajuste por objetivo — regresión de
    # las planillas clínicas de referencia del proyecto, que siempre lo
    # incluyen y antes no se aplicaba en absoluto.
    user = _make_user(db, "eta_user")
    data = PlanRequest(
        patient_name="Paciente ETA",
        patient_email="",
        patient_phone="",
        weight=65,
        height=165,
        age=28,
        gender="female",
        activity_level=1.55,
        goal="maintenance",
        formula="mifflin",
    )
    plan = create_plan(data, db, user.id)

    geb = calculate_tmb(65, 165, 28, "female", "mifflin")
    expected_get = geb * 1.55 * 1.10
    assert plan.get == pytest.approx(expected_get, abs=0.5)
    assert plan.use_eta is True


def test_use_eta_false_excludes_thermic_effect_of_food(db):
    # El ETA es opcional — algunas nutricionistas no lo aplican en su
    # cálculo, así que con use_eta=False el GET debe quedar como GEB×AF
    # sin el +10%.
    user = _make_user(db, "no_eta_user")
    data = PlanRequest(
        patient_name="Paciente sin ETA",
        patient_email="",
        patient_phone="",
        weight=65,
        height=165,
        age=28,
        gender="female",
        activity_level=1.55,
        goal="maintenance",
        formula="mifflin",
        use_eta=False,
    )
    plan = create_plan(data, db, user.id)

    geb = calculate_tmb(65, 165, 28, "female", "mifflin")
    expected_get = geb * 1.55
    assert plan.get == pytest.approx(expected_get, abs=0.5)
    assert plan.use_eta is False


def test_returns_all_eight_base_groups(db):
    expected_groups = {
        "Leche",
        "Alimentos de origen animal",
        "Leguminosas",
        "Verduras",
        "Azucares",
        "Aceites y Grasas",
        "Cereales y tuberculos",
        "Frutas",
    }
    for plan in SCENARIOS:
        portions = calculate_smae_portions(db, plan)
        groups = {row["group"] for row in portions}
        assert groups == expected_groups, f"{plan.goal}/{plan.get}kcal: {groups}"
