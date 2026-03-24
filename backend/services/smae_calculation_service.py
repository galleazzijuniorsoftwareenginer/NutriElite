from sqlalchemy.orm import Session
from backend.models import Plan, FoodGroup, PlanFoodGroup

class SMAECalculationService:
    @staticmethod
    def calculate(plan_id: int, db: Session, override_plan=None):
        plan = override_plan or db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            raise Exception("Plan not found")

        # Se veio override, recalcula porções com novos macros
        if override_plan is not None:
            from backend.services.plan_service import calculate_smae_portions
            portions_list = calculate_smae_portions(db, override_plan)
            smae_table = []
            total_kcal = total_protein = total_fats = total_carbs = 0
            foods = db.query(FoodGroup).all()
            food_lookup = {f.group_name + "|" + (f.subgroup_name or ""): f for f in foods}
            for p in portions_list:
                key = p["group"] + "|" + (p["subgroup"] or "")
                food = food_lookup.get(key)
                if not food:
                    continue
                row_kcal = p["portions"] * food.kcal
                row_protein = p["portions"] * food.protein
                row_fats = p["portions"] * food.fats
                row_carbs = p["portions"] * food.carbs
                total_kcal += row_kcal
                total_protein += row_protein
                total_fats += row_fats
                total_carbs += row_carbs
                smae_table.append({
                    "group": food.group_name,
                    "subgroup": food.subgroup_name,
                    "portions": p["portions"],
                    "kcal": round(row_kcal, 2),
                    "protein": round(row_protein, 2),
                    "fats": round(row_fats, 2),
                    "carbs": round(row_carbs, 2),
                })
        else:
            entries = db.query(PlanFoodGroup).filter(PlanFoodGroup.plan_id == plan_id).all()
            smae_table = []
            total_kcal = total_protein = total_fats = total_carbs = 0
            for entry in entries:
                food = db.query(FoodGroup).filter(FoodGroup.id == entry.food_group_id).first()
                row_kcal = entry.portions * food.kcal
                row_protein = entry.portions * food.protein
                row_fats = entry.portions * food.fats
                row_carbs = entry.portions * food.carbs
                total_kcal += row_kcal
                total_protein += row_protein
                total_fats += row_fats
                total_carbs += row_carbs
                smae_table.append({
                    "group": food.group_name,
                    "subgroup": food.subgroup_name,
                    "portions": entry.portions,
                    "kcal": round(row_kcal, 2),
                    "protein": round(row_protein, 2),
                    "fats": round(row_fats, 2),
                    "carbs": round(row_carbs, 2),
                })

        kcal_from_protein = total_protein * 4
        kcal_from_carbs = total_carbs * 4
        kcal_from_fats = total_fats * 9
        return {
            "smae_table": smae_table,
            "totals": {
                "kcal_from_table": round(total_kcal, 2),
                "protein_g": round(total_protein, 2),
                "carbs_g": round(total_carbs, 2),
                "fats_g": round(total_fats, 2),
            },
            "energy_validation": {
                "kcal_from_macros": round(kcal_from_protein + kcal_from_carbs + kcal_from_fats, 2),
                "get_planned": round(plan.get, 2)
            }
        }
