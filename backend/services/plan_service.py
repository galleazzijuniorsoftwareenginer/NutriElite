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

    protein_target = plan.protein
    fats_target = plan.fats
    carbs_target = plan.carbs

    foods = db.query(FoodGroup).all()

    # =========================
    # PROTEÍNA (70% AOA / 30% Leguminosas)
    # =========================

    protein_aoa = protein_target * 0.7
    protein_leg = protein_target * 0.3

    for food in foods:

        if food.group_name == "Alimentos de origen animal":

            if goal == "cut" and food.subgroup_name == "Muy bajo aporte grasa":
                portion = max(round(protein_aoa / food.protein, 1), 0)
                portions.append({
                    "group": food.group_name,
                    "subgroup": food.subgroup_name,
                    "portions": portion
                })
                fats_target -= portion * food.fats

            elif goal == "bulk" and food.subgroup_name == "Moderado aporte grasa":
                portion = max(round(protein_aoa / food.protein, 1), 0)
                portions.append({
                    "group": food.group_name,
                    "subgroup": food.subgroup_name,
                    "portions": portion
                })
                fats_target -= portion * food.fats

        if food.group_name == "Leguminosas":
            if food.protein > 0:
                portion = max(round(protein_leg / food.protein, 1), 0)
                portions.append({
                    "group": food.group_name,
                    "subgroup": None,
                    "portions": portion
                })
                carbs_target -= portion * food.carbs
                fats_target -= portion * food.fats

    # =========================
    # GORDURA (restante via Aceites)
    # =========================

    for food in foods:
        if food.group_name == "Aceites y Grasas":

            if goal == "cut" and food.subgroup_name == "Sin proteinas":
                if food.fats > 0:
                    portion = max(round(fats_target / food.fats, 1), 0)
                    portions.append({
                        "group": food.group_name,
                        "subgroup": food.subgroup_name,
                        "portions": max(portion, 0)
                    })

            elif goal == "bulk" and food.subgroup_name == "Con proteinas":
                if food.fats > 0:
                    portion = max(round(fats_target / food.fats, 1), 0)
                    portions.append({
                        "group": food.group_name,
                        "subgroup": food.subgroup_name,
                        "portions": max(portion, 0)
                    })
                    carbs_target -= portion * food.carbs

    # =========================
    # CARBO (80% Cereales / 20% Frutas)
    # =========================

    carbs_cereal = carbs_target * 0.8
    carbs_fruit = carbs_target * 0.2

    for food in foods:

        if food.group_name == "Cereales y tuberculos":

            if goal == "cut" and food.subgroup_name == "Sin grasa":
                if food.carbs > 0:
                    portion = max(round(carbs_cereal / food.carbs, 1), 0)
                    portions.append({
                        "group": food.group_name,
                        "subgroup": food.subgroup_name,
                        "portions": portion
                    })

            elif goal == "bulk" and food.subgroup_name == "Con grasa":
                if food.carbs > 0:
                    portion = max(round(carbs_cereal / food.carbs, 1), 0)
                    portions.append({
                        "group": food.group_name,
                        "subgroup": food.subgroup_name,
                        "portions": portion
                    })

        if food.group_name == "Frutas":
            if food.carbs > 0:
                portion = max(round(carbs_fruit / food.carbs, 1), 0)
                portions.append({
                    "group": food.group_name,
                    "subgroup": None,
                    "portions": portion
                })

    # =========================
    # VERDURAS FIJO
    # =========================

    for food in foods:
        if food.group_name == "Verduras":
            portions.append({
                "group": food.group_name,
                "subgroup": None,
                "portions": 4
            })

    return portions
