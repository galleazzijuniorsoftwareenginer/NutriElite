from backend.models import Plan, FoodGroup
from backend.services.metabolic_service import calculate_tmb
from backend.models import Plan, FoodGroup, PlanFoodGroup

def create_plan(data, db, user_id):

    tmb = calculate_tmb(
        data.weight,
        data.height,
        data.age,
        data.gender,
        data.formula
    )

    total_calories = tmb * data.activity_level

    if data.goal.lower() == "cut":
        total_calories -= 300
    elif data.goal.lower() == "bulk":
        total_calories += 300

    protein = data.weight * 2
    fats = data.weight * 1
    carbs = (total_calories - (protein * 4 + fats * 9)) / 4

    new_plan = Plan(
        patient_name=data.patient_name,
        patient_email=data.patient_email,
        patient_phone=data.patient_phone,
        weight=data.weight,
        height=data.height,
        age=data.age,
        gender=data.gender,
        activity_level=data.activity_level,
        goal=data.goal,
        tmb=tmb,
        get=total_calories,
        protein=protein,
        carbs=carbs,
        fats=fats,
        user_id=user_id
    )

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    smae_portions = calculate_smae_portions(db, new_plan)

    for item in smae_portions:

        food_query = db.query(FoodGroup).filter(
            FoodGroup.group_name == item["group"]
        )

        if item["subgroup"] is None:
            food_query = food_query.filter(
                FoodGroup.subgroup_name.is_(None)
            )
        else:
            food_query = food_query.filter(
                FoodGroup.subgroup_name == item["subgroup"]
            )

        food = food_query.first()

        if food:
            plan_food = PlanFoodGroup(
                plan_id=new_plan.id,
                food_group_id=food.id,
                portions=item["portions"]
            )
            db.add(plan_food)

    db.commit()
    return new_plan


def calculate_smae_portions(db, plan):

    portions = []
    goal = plan.goal.lower()
    get = plan.get

    protein_target = plan.protein
    fats_target = plan.fats
    carbs_target = plan.carbs

    foods = db.query(FoodGroup).all()
    foods_map = {f.group_name + "|" + (f.subgroup_name or ""): f for f in foods}

    def get_food(group, subgroup=None):
        key = group + "|" + (subgroup or "")
        return foods_map.get(key)

    leche_sub = {"cut": "Descremada", "bulk": "Entera", "maintenance": "Semidescremada"}.get(goal, "Descremada")
    leche = get_food("Leche", leche_sub)
    if leche:
        leche_portions = 2.0
        portions.append({"group": "Leche", "subgroup": leche_sub, "portions": leche_portions})
        protein_target -= leche_portions * leche.protein
        carbs_target   -= leche_portions * leche.carbs
        fats_target    -= leche_portions * leche.fats

    protein_aoa = protein_target * 0.7
    protein_leg = protein_target * 0.3

    aoa_sub = {"cut": "Muy bajo aporte grasa", "bulk": "Moderado aporte grasa", "maintenance": "Bajo aporte grasa"}.get(goal, "Muy bajo aporte grasa")
    aoa = get_food("Alimentos de origen animal", aoa_sub)
    if aoa and aoa.protein > 0:
        portion = max(round(protein_aoa / aoa.protein, 1), 0)
        portions.append({"group": aoa.group_name, "subgroup": aoa.subgroup_name, "portions": portion})
        fats_target -= portion * aoa.fats

    leg = get_food("Leguminosas")
    if leg and leg.protein > 0:
        portion = max(round(protein_leg / leg.protein, 1), 0)
        portions.append({"group": leg.group_name, "subgroup": None, "portions": portion})
        carbs_target -= portion * leg.carbs
        fats_target  -= portion * leg.fats

    verd = get_food("Verduras")
    if verd:
        portions.append({"group": "Verduras", "subgroup": None, "portions": 4})
        carbs_target -= 4 * verd.carbs

    azuc_sub = {"cut": "Sin grasa", "bulk": "Con grasa", "maintenance": "Sin grasa"}.get(goal, "Sin grasa")
    azuc = get_food("Azucares", azuc_sub)
    if azuc:
        portions.append({"group": "Azucares", "subgroup": azuc_sub, "portions": 1.0})
        carbs_target -= 1.0 * azuc.carbs

    ac_sub = {"cut": "Sin proteinas", "bulk": "Con proteinas", "maintenance": "Sin proteinas"}.get(goal, "Sin proteinas")
    ac = get_food("Aceites y Grasas", ac_sub)
    if ac and ac.fats > 0:
        portion = max(round(fats_target / ac.fats, 1), 0)
        portions.append({"group": ac.group_name, "subgroup": ac.subgroup_name, "portions": portion})
        if ac.carbs > 0:
            carbs_target -= portion * ac.carbs

    carbs_target = max(carbs_target, 0)
    carbs_cereal = carbs_target * 0.8
    carbs_fruit  = carbs_target * 0.2

    cer_sub = {"cut": "Sin grasa", "bulk": "Con grasa", "maintenance": "Sin grasa"}.get(goal, "Sin grasa")
    cer = get_food("Cereales y tuberculos", cer_sub)
    if cer and cer.carbs > 0:
        portion = max(round(carbs_cereal / cer.carbs, 1), 0)
        portions.append({"group": cer.group_name, "subgroup": cer.subgroup_name, "portions": portion})

    frut = get_food("Frutas")
    if frut and frut.carbs > 0:
        portion = max(round(carbs_fruit / frut.carbs, 1), 0)
        portions.append({"group": frut.group_name, "subgroup": None, "portions": portion})

    food_lookup = {f.group_name + "|" + (f.subgroup_name or ""): f for f in foods}

    def calc_kcal(parts):
        total = 0
        for p in parts:
            key = p["group"] + "|" + (p["subgroup"] or "")
            f = food_lookup.get(key)
            if f:
                total += p["portions"] * f.kcal
        return total

    total_kcal = calc_kcal(portions)
    diff_pct = abs(total_kcal - get) / get if get > 0 else 0

    if diff_pct > 0.03:
        fixed_kcal = 0
        variable_idx = []
        for i, p in enumerate(portions):
            if p["group"] in ("Cereales y tuberculos", "Frutas"):
                variable_idx.append(i)
            else:
                key = p["group"] + "|" + (p["subgroup"] or "")
                f = food_lookup.get(key)
                if f:
                    fixed_kcal += p["portions"] * f.kcal

        target_variable_kcal = get - fixed_kcal
        current_variable_kcal = 0
        for i in variable_idx:
            key = portions[i]["group"] + "|" + (portions[i]["subgroup"] or "")
            f = food_lookup.get(key)
            if f:
                current_variable_kcal += portions[i]["portions"] * f.kcal

        if current_variable_kcal > 0 and target_variable_kcal > 0:
            scale = target_variable_kcal / current_variable_kcal
            for i in variable_idx:
                portions[i]["portions"] = max(round(portions[i]["portions"] * scale, 1), 0)

    return portions
