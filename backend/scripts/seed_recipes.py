from backend.database import SessionLocal, engine
from backend.models import Base, Recipe

RECIPES = [
    # ---------- DESAYUNO ----------
    {
        "nombre": "Huevos a la mexicana con tortilla de maíz",
        "imagen_url": "https://images.unsplash.com/photo-1583552336796-531290f1fe2a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Desayuno",
        "goal_tags": ["bulk", "maintenance"],
        "categoria_tags": ["Alto en proteína"],
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
        "imagen_url": "https://images.unsplash.com/photo-1787761460248-672823a370dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Desayuno",
        "goal_tags": ["cut"],
        "categoria_tags": ["Bajo en grasa", "Alto en proteína"],
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
        "imagen_url": "https://images.unsplash.com/photo-1633372363856-f2fe2669a26e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1712056407284-c1eda76e7bcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1641494587136-eec74f1944ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1579636859960-06732cdccdf3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Colación",
        "goal_tags": ["bulk"],
        "categoria_tags": ["Alto en proteína", "Nuevas"],
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
        "imagen_url": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Comida",
        "goal_tags": ["cut", "maintenance"],
        "categoria_tags": ["Bajo en grasa", "Alto en proteína"],
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
        "imagen_url": "https://images.unsplash.com/photo-1665593998976-d957f2827fe7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1785695691259-3f09db710535?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1665332195309-9d75071138f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1617990590988-895fe6cbabda?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1578687388049-079580e6eb2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Cena",
        "goal_tags": ["cut"],
        "categoria_tags": ["Bajo en grasa", "Ensaladas"],
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
        "imagen_url": "https://images.unsplash.com/photo-1618040996337-56904b7850b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1695088223408-cd5ae3b2b7fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
        "imagen_url": "https://images.unsplash.com/photo-1564767655658-4e6b365884ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
    # ---------- ENSALADAS ----------
    {
        "nombre": "Ensalada mediterránea con queso feta",
        "imagen_url": "https://images.unsplash.com/photo-1670237735381-ac5c7fa72c51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Comida",
        "goal_tags": ["cut", "maintenance"],
        "categoria_tags": ["Ensaladas", "Bajo en grasa"],
        "ingredientes": [
            {"alimento": "Lechuga romana", "cantidad_g": 100},
            {"alimento": "Jitomate cherry", "cantidad_g": 80},
            {"alimento": "Pepino", "cantidad_g": 60},
            {"alimento": "Aceitunas negras", "cantidad_g": 20},
            {"alimento": "Queso feta", "cantidad_g": 30},
            {"alimento": "Aceite de oliva", "cantidad_g": 8},
        ],
        "instrucciones": "Mezcla las verduras picadas, agrega el queso feta desmoronado y las aceitunas, adereza con aceite de oliva y orégano.",
        "kcal_aprox": 290,
    },
    {
        "nombre": "Ensalada de nopales con queso panela",
        "imagen_url": "https://images.unsplash.com/photo-1628961915037-a829e926e26e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Comida",
        "goal_tags": ["cut"],
        "categoria_tags": ["Ensaladas", "Bajo en grasa"],
        "ingredientes": [
            {"alimento": "Nopal cocido", "cantidad_g": 150},
            {"alimento": "Jitomate", "cantidad_g": 60},
            {"alimento": "Cebolla morada", "cantidad_g": 20},
            {"alimento": "Cilantro", "cantidad_g": 5},
            {"alimento": "Queso panela", "cantidad_g": 40},
        ],
        "instrucciones": "Mezcla el nopal cocido con jitomate, cebolla y cilantro picados; agrega el queso panela en cubos y sazona con limón.",
        "kcal_aprox": 210,
    },
    {
        "nombre": "Ensalada de quinoa con pollo y aguacate",
        "imagen_url": "https://images.unsplash.com/photo-1712594534008-b1f94349f969?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Comida",
        "goal_tags": ["maintenance", "bulk"],
        "categoria_tags": ["Ensaladas", "Alto en proteína"],
        "ingredientes": [
            {"alimento": "Quinoa cocida", "cantidad_g": 100},
            {"alimento": "Pechuga de pollo a la plancha", "cantidad_g": 120},
            {"alimento": "Aguacate", "cantidad_g": 50},
            {"alimento": "Jitomate cherry", "cantidad_g": 60},
        ],
        "instrucciones": "Combina la quinoa con el pollo desmenuzado, aguacate en cubos y jitomate cherry; adereza con limón y sal al gusto.",
        "kcal_aprox": 420,
    },
    {
        "nombre": "Ensalada César ligera con pollo",
        "imagen_url": "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Comida",
        "goal_tags": ["cut", "maintenance"],
        "categoria_tags": ["Ensaladas"],
        "ingredientes": [
            {"alimento": "Lechuga romana", "cantidad_g": 120},
            {"alimento": "Pechuga de pollo a la plancha", "cantidad_g": 120},
            {"alimento": "Queso parmesano", "cantidad_g": 15},
            {"alimento": "Crutones integrales", "cantidad_g": 20},
            {"alimento": "Aderezo César light", "cantidad_g": 20},
        ],
        "instrucciones": "Corta la lechuga y mezcla con el pollo desmenuzado, queso parmesano y crutones; agrega el aderezo al final.",
        "kcal_aprox": 340,
    },
    # ---------- KETO ----------
    {
        "nombre": "Aguacate relleno de atún con mayonesa",
        "imagen_url": "https://images.unsplash.com/photo-1715611935696-a59ebf388252?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Comida",
        "goal_tags": ["cut"],
        "categoria_tags": ["Keto", "Bajo en grasa"],
        "ingredientes": [
            {"alimento": "Aguacate", "cantidad_g": 150},
            {"alimento": "Atún en agua", "cantidad_g": 100},
            {"alimento": "Mayonesa", "cantidad_g": 15},
            {"alimento": "Apio picado", "cantidad_g": 20},
        ],
        "instrucciones": "Corta el aguacate a la mitad y retira un poco de pulpa; mezcla con atún, mayonesa y apio, y rellena las mitades.",
        "kcal_aprox": 380,
    },
    # ---------- NAVIDAD ----------
    {
        "nombre": "Pavo navideño con vegetales asados",
        "imagen_url": "https://images.unsplash.com/photo-1574672281194-db420378032d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Cena",
        "goal_tags": ["maintenance", "bulk"],
        "categoria_tags": ["Navidad", "Alto en proteína"],
        "ingredientes": [
            {"alimento": "Pechuga de pavo horneada", "cantidad_g": 150},
            {"alimento": "Ejotes", "cantidad_g": 80},
            {"alimento": "Zanahoria baby", "cantidad_g": 80},
            {"alimento": "Arándano deshidratado", "cantidad_g": 15},
        ],
        "instrucciones": "Hornea la pechuga de pavo sazonada con hierbas. Asa los vegetales con un poco de aceite de oliva y decora con arándanos.",
        "kcal_aprox": 410,
    },
    {
        "nombre": "Ponche de frutas sin azúcar añadida",
        "imagen_url": "https://images.unsplash.com/photo-1669632851802-9d4672f4c55d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
        "tiempo_comida": "Colación",
        "goal_tags": ["cut", "maintenance"],
        "categoria_tags": ["Navidad", "Bajo en grasa"],
        "ingredientes": [
            {"alimento": "Guayaba", "cantidad_g": 100},
            {"alimento": "Manzana", "cantidad_g": 100},
            {"alimento": "Caña", "cantidad_g": 60},
            {"alimento": "Canela en raja", "cantidad_g": 3},
            {"alimento": "Tejocote", "cantidad_g": 60},
        ],
        "instrucciones": "Hierve todas las frutas con la canela por 20 minutos. Sirve caliente sin azúcar añadida.",
        "kcal_aprox": 120,
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
