from backend.models import FoodGroup
from backend.services.plan_service import calculate_smae_portions


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
