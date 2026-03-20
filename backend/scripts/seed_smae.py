from backend.database import SessionLocal, engine
from backend.models import Base, FoodGroup

SMAE_DATA = [
    {
        "group_name": "Verduras",
        "subgroup_name": None,
        "kcal": 25, "protein": 2, "fats": 0, "carbs": 4,
        "fiber": 2.5, "calcium": 40, "iron": 2.6, "sodium": 16.8, "cholesterol": 0.1
    },
    {
        "group_name": "Frutas",
        "subgroup_name": None,
        "kcal": 60, "protein": 0, "fats": 0, "carbs": 15,
        "fiber": 2.5, "calcium": 40, "iron": 2.6, "sodium": 16.8, "cholesterol": 0
    },
    {
        "group_name": "Cereales y tuberculos",
        "subgroup_name": "Sin grasa",
        "kcal": 70, "protein": 2, "fats": 0, "carbs": 15,
        "fiber": 2.5, "calcium": 0, "iron": 2.6, "sodium": 250.0, "cholesterol": 0
    },
    {
        "group_name": "Cereales y tuberculos",
        "subgroup_name": "Con grasa",
        "kcal": 115, "protein": 2, "fats": 5, "carbs": 15,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 100.0, "cholesterol": 0
    },
    {
        "group_name": "Leguminosas",
        "subgroup_name": None,
        "kcal": 120, "protein": 8, "fats": 1, "carbs": 20,
        "fiber": 2.5, "calcium": 0, "iron": 2.6, "sodium": 250.0, "cholesterol": 0
    },
    {
        "group_name": "Alimentos de origen animal",
        "subgroup_name": "Muy bajo aporte grasa",
        "kcal": 40, "protein": 7, "fats": 1, "carbs": 0,
        "fiber": 0.0, "calcium": 180, "iron": 2.6, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Alimentos de origen animal",
        "subgroup_name": "Bajo aporte grasa",
        "kcal": 55, "protein": 7, "fats": 3, "carbs": 0,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Alimentos de origen animal",
        "subgroup_name": "Moderado aporte grasa",
        "kcal": 75, "protein": 7, "fats": 5, "carbs": 0,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Alimentos de origen animal",
        "subgroup_name": "Alto aporte grasa",
        "kcal": 100, "protein": 7, "fats": 8, "carbs": 0,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Leche",
        "subgroup_name": "Descremada",
        "kcal": 95, "protein": 9, "fats": 2, "carbs": 12,
        "fiber": 0.0, "calcium": 180, "iron": 0.0, "sodium": 250.0, "cholesterol": 100
    },
    {
        "group_name": "Leche",
        "subgroup_name": "Semidescremada",
        "kcal": 110, "protein": 9, "fats": 4, "carbs": 12,
        "fiber": 0.0, "calcium": 180, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Leche",
        "subgroup_name": "Entera",
        "kcal": 150, "protein": 9, "fats": 8, "carbs": 12,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Leche",
        "subgroup_name": "Con azucar",
        "kcal": 200, "protein": 8, "fats": 5, "carbs": 30,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Aceites y Grasas",
        "subgroup_name": "Sin proteinas",
        "kcal": 45, "protein": 0, "fats": 5, "carbs": 0,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 250.0, "cholesterol": 100
    },
    {
        "group_name": "Aceites y Grasas",
        "subgroup_name": "Con proteinas",
        "kcal": 70, "protein": 3, "fats": 5, "carbs": 3,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
    {
        "group_name": "Azucares",
        "subgroup_name": "Sin grasa",
        "kcal": 40, "protein": 0, "fats": 0, "carbs": 10,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 250.0, "cholesterol": 0
    },
    {
        "group_name": "Azucares",
        "subgroup_name": "Con grasa",
        "kcal": 85, "protein": 25, "fats": 5, "carbs": 10,
        "fiber": 0.0, "calcium": 0, "iron": 0.0, "sodium": 0.0, "cholesterol": 0
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = db.query(FoodGroup).count()
    if existing > 0:
        print(f"Seed já executado — {existing} grupos encontrados. Pulando.")
        db.close()
        return

    for item in SMAE_DATA:
        food = FoodGroup(**item)
        db.add(food)

    db.commit()
    db.close()
    print(f"Seed concluído — {len(SMAE_DATA)} grupos alimentares inseridos.")


if __name__ == "__main__":
    seed()


def seed_default_user():
    from backend.models import User
    from backend.routes.auth import hash_password
    db = SessionLocal()
    existing = db.query(User).filter(User.username == "admin").first()
    if existing:
        print("Usuário admin já existe. Pulando.")
        db.close()
        return
    user = User(username="admin", password=hash_password("nutrielite2024"))
    db.add(user)
    db.commit()
    db.close()
    print("Usuário padrão criado: admin / nutrielite2024")

if __name__ == "__main__":
    seed()
    seed_default_user()
