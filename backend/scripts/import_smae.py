import pandas as pd
from backend.database import SessionLocal
from backend.models import FoodGroup

FILE_NAME = "Mi formulario.xlsx"

df = pd.read_excel(FILE_NAME, sheet_name="smae_clean", header=1)

db = SessionLocal()

for _, row in df.iterrows():

    food = FoodGroup(
        group_name=row["group_name"],
        subgroup_name=row["subgroup_name"],
        kcal=row["kcal"],
        protein=row["protein"],
        fats=row["fats"],
        carbs=row["carbs"],
        fiber=row["fiber"],
        calcium=row["calcium"],
        iron=row["iron"],
        sodium=row["sodium"],
        cholesterol=row["cholesterol"],
    )

    db.add(food)

db.commit()
db.close()

print("Importação concluída com sucesso.")
