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

    # Macros por % das kcal (padrão SMAE: 25% prot, 20% lip, 55% cho)
    protein_pct = getattr(data, 'protein_pct', 25) or 25
    fats_pct    = getattr(data, 'fats_pct',    20) or 20
    carbs_pct   = getattr(data, 'carbs_pct',   55) or 55

    protein = round((total_calories * protein_pct / 100) / 4, 1)
    fats    = round((total_calories * fats_pct    / 100) / 9, 1)
    carbs   = round((total_calories * carbs_pct   / 100) / 4, 1)

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
        user_id=user_id,
        patient_id=data.patient_id if hasattr(data, "patient_id") else None
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
    import math

    portions = []
    goal = plan.goal.lower()
    get = plan.get

    # Macros em gramas vindos do plan (já calculados pelo frontend com os % do nutricionista)
    protein_target = round(float(plan.protein or 0), 1)
    fats_target    = round(float(plan.fats    or 0), 1)
    carbs_target   = round(float(plan.carbs   or 0), 1)

    foods = db.query(FoodGroup).all()
    foods_map = {f.group_name + "|" + (f.subgroup_name or ""): f for f in foods}

    def get_food(group, subgroup=None):
        key = group + "|" + (subgroup or "")
        return foods_map.get(key)

    def to_int(val):
        return max(1, math.ceil(val))

    # 1. Leche — 2 porções fixas
    leche_sub = {"cut": "Descremada", "bulk": "Entera", "maintenance": "Semidescremada"}.get(goal, "Descremada")
    leche = get_food("Leche", leche_sub)
    if leche:
        leche_portions = 2
        portions.append({"group": "Leche", "subgroup": leche_sub, "portions": leche_portions})
        protein_target -= leche_portions * leche.protein
        carbs_target   -= leche_portions * leche.carbs
        fats_target    -= leche_portions * leche.fats

    # 2. AOA — 70% da proteína restante
    protein_aoa = protein_target * 0.7
    protein_leg = protein_target * 0.3

    aoa_sub = {"cut": "Muy bajo aporte grasa", "bulk": "Moderado aporte grasa", "maintenance": "Bajo aporte grasa"}.get(goal, "Muy bajo aporte grasa")
    aoa = get_food("Alimentos de origen animal", aoa_sub)
    if aoa and aoa.protein > 0:
        portion = min(to_int(protein_aoa / aoa.protein), 8)
        portions.append({"group": aoa.group_name, "subgroup": aoa.subgroup_name, "portions": portion})
        fats_target    -= portion * aoa.fats
        protein_target -= portion * aoa.protein

    # 3. Leguminosas — 30% da proteína restante
    leg = get_food("Leguminosas")
    if leg and leg.protein > 0:
        portion = to_int(protein_leg / leg.protein)
        portions.append({"group": leg.group_name, "subgroup": None, "portions": portion})
        carbs_target -= portion * leg.carbs
        fats_target  -= portion * leg.fats

    # 4. Verduras — 4 porções fixas
    verd = get_food("Verduras")
    if verd:
        portions.append({"group": "Verduras", "subgroup": None, "portions": 4})
        carbs_target -= 4 * verd.carbs

    # 5. Azucares — 1 porção fixa
    azuc_sub = {"cut": "Sin grasa", "bulk": "Con grasa", "maintenance": "Sin grasa"}.get(goal, "Sin grasa")
    azuc = get_food("Azucares", azuc_sub)
    if azuc:
        portions.append({"group": "Azucares", "subgroup": azuc_sub, "portions": 1})
        carbs_target -= 1 * azuc.carbs

    # 6. Aceites — com gordura restante
    ac_sub = {"cut": "Sin proteinas", "bulk": "Con proteinas", "maintenance": "Sin proteinas"}.get(goal, "Sin proteinas")
    ac = get_food("Aceites y Grasas", ac_sub)
    if ac and ac.fats > 0:
        fats_target = max(fats_target, 0)
        portion = to_int(fats_target / ac.fats)
        portions.append({"group": ac.group_name, "subgroup": ac.subgroup_name, "portions": portion})
        if ac.carbs > 0:
            carbs_target -= portion * ac.carbs

    # 7. Cereales — 80% dos carbs restantes
    carbs_target = max(carbs_target, 0)
    carbs_cereal = carbs_target * 0.8
    carbs_fruit  = carbs_target * 0.2

    cer_sub = {"cut": "Sin grasa", "bulk": "Con grasa", "maintenance": "Sin grasa"}.get(goal, "Sin grasa")
    cer = get_food("Cereales y tuberculos", cer_sub)
    if cer and cer.carbs > 0:
        portion = to_int(carbs_cereal / cer.carbs)
        portions.append({"group": cer.group_name, "subgroup": cer.subgroup_name, "portions": portion})

    # 8. Frutas — 20% dos carbs restantes
    frut = get_food("Frutas")
    if frut and frut.carbs > 0:
        portion = to_int(carbs_fruit / frut.carbs)
        portions.append({"group": frut.group_name, "subgroup": None, "portions": portion})

    return portions
