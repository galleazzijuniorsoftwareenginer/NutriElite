from backend.database import SessionLocal, engine
from backend.models import Base, Recipe

RECIPES = [
    # ---------- DESAYUNO ----------
    {
        "nombre": "Huevos a la mexicana con tortilla de maíz",
        "tiempo_comida": "Desayuno",
        "goal_tags": ["bulk", "maintenance"],
        "ingredientes": [
            {"alimento": "Huevo entero", "cantidad_g": 120},
            {"alimento": "Jitomate picado", "cantidad_g": 60},
            {"alimento": "Cebolla picada", "cantidad_g": 20},
            {"alimento": "Chile serrano picado", "cantidad_g": 10},
            {"alimento": "Tortilla de maíz", "cantidad_g": 60},
        ],
        "instrucciones": "Sofríe cebolla y chile, agrega jitomate hasta que suelte jugo, incorpora el huevo batido y cocina revolviendo. Sirve con tortillas calientes.",
        "kcal_aprox": 320,
    },
    {
        "nombre": "Claras revueltas con espinaca y avena",
        "tiempo_comida": "Desayuno",
        "goal_tags": ["cut"],
        "ingredientes": [
            {"alimento": "Clara de huevo", "cantidad_g": 200},
            {"alimento": "Espinaca fresca", "cantidad_g": 60},
            {"alimento": "Avena en hojuelas", "cantidad_g": 40},
            {"alimento": "Leche descremada", "cantidad_g": 150},
        ],
        "instrucciones": "Cocina las claras con la espinaca salteada. Aparte, prepara la avena con la leche descremada a fuego bajo por 5 minutos.",
        "kcal_aprox": 280,
    },
    {
        "nombre": "Chilaquiles verdes con pollo deshebrado",
        "tiempo_comida": "Desayuno",
        "goal_tags": ["maintenance", "bulk"],
        "ingredientes": [
            {"alimento": "Tostadas horneadas", "cantidad_g": 60},
            {"alimento": "Salsa verde", "cantidad_g": 100},
            {"alimento": "Pechuga de pollo deshebrada", "cantidad_g": 100},
            {"alimento": "Queso panela", "cantidad_g": 30},
            {"alimento": "Crema light", "cantidad_g": 15},
        ],
        "instrucciones": "Calienta la salsa verde, agrega las tostadas y mezcla rápido para que no se remojen de más. Sirve con pollo, queso y crema.",
        "kcal_aprox": 420,
    },
    {
        "nombre": "Licuado de avena, plátano y proteína",
        "tiempo_comida": "Desayuno",
        "goal_tags": ["bulk"],
        "ingredientes": [
            {"alimento": "Avena en hojuelas", "cantidad_g": 50},
            {"alimento": "Plátano", "cantidad_g": 120},
            {"alimento": "Leche entera", "cantidad_g": 250},
            {"alimento": "Crema de cacahuate", "cantidad_g": 20},
        ],
        "instrucciones": "Licúa todos los ingredientes hasta obtener una mezcla homogénea. Sirve frío.",
        "kcal_aprox": 520,
    },
    # ---------- COLACIÓN ----------
    {
        "nombre": "Yogur griego con fresas y nuez",
        "tiempo_comida": "Colación",
        "goal_tags": ["cut", "maintenance"],
        "ingredientes": [
            {"alimento": "Yogur griego descremado", "cantidad_g": 150},
            {"alimento": "Fresa", "cantidad_g": 80},
            {"alimento": "Nuez", "cantidad_g": 10},
        ],
        "instrucciones": "Mezcla el yogur con las fresas picadas y agrega la nuez encima.",
        "kcal_aprox": 150,
    },
    {
        "nombre": "Jícama y pepino con limón y chile piquín",
        "tiempo_comida": "Colación",
        "goal_tags": ["cut"],
        "ingredientes": [
            {"alimento": "Jícama", "cantidad_g": 100},
            {"alimento": "Pepino", "cantidad_g": 100},
            {"alimento": "Limón", "cantidad_g": 15},
            {"alimento": "Chile piquín", "cantidad_g": 2},
        ],
        "instrucciones": "Corta la jícama y el pepino en bastones, rocía con limón y chile piquín al gusto.",
        "kcal_aprox": 60,
    },
    {
        "nombre": "Malteada de proteína con almendras",
        "tiempo_comida": "Colación",
        "goal_tags": ["bulk"],
        "ingredientes": [
            {"alimento": "Proteína en polvo", "cantidad_g": 30},
            {"alimento": "Leche entera", "cantidad_g": 250},
            {"alimento": "Almendra", "cantidad_g": 15},
        ],
        "instrucciones": "Licúa la proteína con la leche y las almendras hasta integrar bien.",
        "kcal_aprox": 300,
    },
    # ---------- COMIDA ----------
    {
        "nombre": "Pechuga a la plancha con arroz integral y verduras al vapor",
        "tiempo_comida": "Comida",
        "goal_tags": ["cut", "maintenance"],
        "ingredientes": [
            {"alimento": "Pechuga de pollo", "cantidad_g": 150},
            {"alimento": "Arroz integral cocido", "cantidad_g": 100},
            {"alimento": "Brócoli", "cantidad_g": 100},
            {"alimento": "Zanahoria", "cantidad_g": 60},
            {"alimento": "Aceite de oliva", "cantidad_g": 8},
        ],
        "instrucciones": "Sazona y cocina la pechuga a la plancha. Cuece el brócoli y la zanahoria al vapor. Sirve con arroz integral y un hilo de aceite de oliva.",
        "kcal_aprox": 480,
    },
    {
        "nombre": "Caldo de res con verduras y elote",
        "tiempo_comida": "Comida",
        "goal_tags": ["maintenance"],
        "ingredientes": [
            {"alimento": "Chambarete de res", "cantidad_g": 130},
            {"alimento": "Elote", "cantidad_g": 100},
            {"alimento": "Calabacita", "cantidad_g": 80},
            {"alimento": "Zanahoria", "cantidad_g": 60},
            {"alimento": "Papa", "cantidad_g": 80},
        ],
        "instrucciones": "Cuece la carne en agua con sal hasta suavizar, agrega las verduras y cocina hasta que estén tiernas.",
        "kcal_aprox": 450,
    },
    {
        "nombre": "Bistec de res con papa al horno y ensalada",
        "tiempo_comida": "Comida",
        "goal_tags": ["bulk"],
        "ingredientes": [
            {"alimento": "Bistec de res", "cantidad_g": 180},
            {"alimento": "Papa", "cantidad_g": 150},
            {"alimento": "Lechuga", "cantidad_g": 60},
            {"alimento": "Jitomate", "cantidad_g": 60},
            {"alimento": "Aceite de oliva", "cantidad_g": 10},
        ],
        "instrucciones": "Cocina el bistec a la plancha al término deseado. Hornea la papa hasta suavizar. Sirve con ensalada aderezada con aceite de oliva.",
        "kcal_aprox": 620,
    },
    {
        "nombre": "Pescado a la veracruzana con arroz blanco",
        "tiempo_comida": "Comida",
        "goal_tags": ["cut", "maintenance"],
        "ingredientes": [
            {"alimento": "Filete de pescado blanco", "cantidad_g": 150},
            {"alimento": "Jitomate", "cantidad_g": 100},
            {"alimento": "Aceitunas", "cantidad_g": 15},
            {"alimento": "Cebolla", "cantidad_g": 30},
            {"alimento": "Arroz blanco cocido", "cantidad_g": 80},
        ],
        "instrucciones": "Prepara un sofrito de jitomate, cebolla y aceitunas; cocina el pescado dentro de la salsa a fuego medio hasta que esté cocido. Sirve con arroz.",
        "kcal_aprox": 420,
    },
    {
        "nombre": "Frijoles de la olla con queso y tortilla",
        "tiempo_comida": "Comida",
        "goal_tags": ["maintenance", "bulk"],
        "ingredientes": [
            {"alimento": "Frijol negro cocido", "cantidad_g": 150},
            {"alimento": "Queso panela", "cantidad_g": 40},
            {"alimento": "Tortilla de maíz", "cantidad_g": 60},
            {"alimento": "Cilantro", "cantidad_g": 5},
        ],
        "instrucciones": "Calienta los frijoles, sirve con queso panela desmoronado, cilantro picado y tortillas.",
        "kcal_aprox": 400,
    },
    # ---------- CENA ----------
    {
        "nombre": "Ensalada de atún con verduras frescas",
        "tiempo_comida": "Cena",
        "goal_tags": ["cut"],
        "ingredientes": [
            {"alimento": "Atún en agua", "cantidad_g": 100},
            {"alimento": "Lechuga", "cantidad_g": 80},
            {"alimento": "Jitomate", "cantidad_g": 60},
            {"alimento": "Pepino", "cantidad_g": 60},
            {"alimento": "Aceite de oliva", "cantidad_g": 8},
        ],
        "instrucciones": "Mezcla todos los vegetales picados con el atún escurrido y adereza con aceite de oliva y limón al gusto.",
        "kcal_aprox": 250,
    },
    {
        "nombre": "Quesadillas de flor de calabaza",
        "tiempo_comida": "Cena",
        "goal_tags": ["maintenance"],
        "ingredientes": [
            {"alimento": "Tortilla de maíz", "cantidad_g": 90},
            {"alimento": "Flor de calabaza", "cantidad_g": 60},
            {"alimento": "Queso Oaxaca", "cantidad_g": 50},
            {"alimento": "Epazote", "cantidad_g": 5},
        ],
        "instrucciones": "Rellena las tortillas con flor de calabaza salteada, queso y epazote; cocina en comal hasta que el queso funda.",
        "kcal_aprox": 380,
    },
    {
        "nombre": "Sopa de fideo con pechuga desmenuzada",
        "tiempo_comida": "Cena",
        "goal_tags": ["bulk", "maintenance"],
        "ingredientes": [
            {"alimento": "Fideo", "cantidad_g": 60},
            {"alimento": "Pechuga de pollo deshebrada", "cantidad_g": 80},
            {"alimento": "Jitomate", "cantidad_g": 60},
            {"alimento": "Zanahoria", "cantidad_g": 40},
        ],
        "instrucciones": "Fríe ligeramente el fideo, agrega caldo con jitomate licuado y zanahoria, cocina hasta suavizar y añade el pollo.",
        "kcal_aprox": 350,
    },
    {
        "nombre": "Tacos de nopal con queso panela",
        "tiempo_comida": "Cena",
        "goal_tags": ["cut"],
        "ingredientes": [
            {"alimento": "Nopal cocido", "cantidad_g": 120},
            {"alimento": "Queso panela", "cantidad_g": 40},
            {"alimento": "Tortilla de maíz", "cantidad_g": 60},
            {"alimento": "Salsa roja", "cantidad_g": 30},
        ],
        "instrucciones": "Calienta el nopal cocido, sirve en tortillas con queso panela y salsa al gusto.",
        "kcal_aprox": 280,
    },
]


def seed_recipes():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    existing = db.query(Recipe).filter(Recipe.created_by.is_(None)).count()
    if existing > 0:
        print(f"Recetas ya sembradas — {existing} encontradas. Saltando.")
        db.close()
        return
    for item in RECIPES:
        db.add(Recipe(created_by=None, **item))
    db.commit()
    db.close()
    print(f"Semilla de recetas completa — {len(RECIPES)} recetas insertadas.")


if __name__ == "__main__":
    seed_recipes()
