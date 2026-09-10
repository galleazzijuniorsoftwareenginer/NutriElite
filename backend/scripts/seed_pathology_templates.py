"""Siembra la biblioteca clínica de planes prediseñados por patología/objetivo.

Cada plantilla tiene un weekly_menu con la misma forma que Plan.weekly_menu
(generado normalmente por ai_menu_service): {"semana": [{"dia","comidas","macros"}, ...]}.
Para mantener el contenido manejable, cada tiempo de comida rota entre 3
variantes reales a lo largo de la semana en vez de 7 platillos únicos por
tiempo — sigue siendo un menú semanal genuino, solo con repetición controlada.
"""
from backend.database import SessionLocal, engine
from backend.models import Base, PathologyTemplate
from backend.scripts.dish_images import DISH_IMAGES

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


def _dish_image_url(alimento: str) -> str | None:
    photo_id = DISH_IMAGES.get(alimento)
    if not photo_id:
        return None
    return f"https://images.unsplash.com/photo-{photo_id}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=500"

# % del kcal_objetivo diario asignado a cada tiempo de comida
DISTRIBUCION_TIEMPOS = {
    "Desayuno": 0.25,
    "Colación AM": 0.10,
    "Comida": 0.35,
    "Colación PM": 0.10,
    "Cena": 0.20,
}


def _build_semana(kcal_objetivo: float, split: dict, tiempos: dict) -> dict:
    """tiempos: {"Desayuno": [variant1, variant2, variant3], ...} donde cada
    variant es una lista de {"alimento","quantidade_g","kcal"}."""
    semana = []
    for i, dia in enumerate(DIAS_SEMANA):
        comidas = []
        for tiempo, variantes in tiempos.items():
            itens = [
                {**it, "imagen_url": _dish_image_url(it["alimento"])}
                for it in variantes[i % len(variantes)]
            ]
            kcal_tiempo = round(sum(it["kcal"] for it in itens))
            comidas.append({"tiempo": tiempo, "kcal": kcal_tiempo, "itens": itens})
        kcal_total = sum(c["kcal"] for c in comidas)
        semana.append({
            "dia": dia,
            "comidas": comidas,
            "macros": {
                "proteina_g": round((kcal_total * split["p"] / 100) / 4),
                "carb_g": round((kcal_total * split["c"] / 100) / 4),
                "gordura_g": round((kcal_total * split["f"] / 100) / 9),
                "kcal_total": kcal_total,
            },
        })
    return {"semana": semana}


TEMPLATES = [
    dict(
        nombre="Control de peso balanceado",
        categoria="Pérdida de peso",
        kcal_objetivo=1500,
        imagen_url="https://images.unsplash.com/photo-1490645935967-10de6ba17061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Déficit calórico moderado con alta densidad de nutrientes y proteína elevada para saciedad sostenida.",
        split={"p": 30, "f": 25, "c": 45},
        tiempos={
            "Desayuno": [
                [{"alimento": "Claras revueltas con espinaca", "quantidade_g": 180, "kcal": 160}, {"alimento": "Tortilla de maíz", "quantidade_g": 30, "kcal": 65}],
                [{"alimento": "Yogur griego natural", "quantidade_g": 200, "kcal": 130}, {"alimento": "Fresas", "quantidade_g": 100, "kcal": 35}, {"alimento": "Avena en hojuelas", "quantidade_g": 20, "kcal": 75}],
                [{"alimento": "Omelette de claras con champiñones", "quantidade_g": 200, "kcal": 150}, {"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
            ],
            "Colación AM": [
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
                [{"alimento": "Almendras", "quantidade_g": 15, "kcal": 87}],
                [{"alimento": "Jícama con limón y chile", "quantidade_g": 150, "kcal": 45}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo a la plancha", "quantidade_g": 150, "kcal": 250}, {"alimento": "Ensalada verde mixta", "quantidade_g": 150, "kcal": 40}, {"alimento": "Arroz integral", "quantidade_g": 80, "kcal": 90}],
                [{"alimento": "Filete de pescado al vapor", "quantidade_g": 150, "kcal": 190}, {"alimento": "Verduras al vapor", "quantidade_g": 200, "kcal": 70}, {"alimento": "Frijoles de la olla", "quantidade_g": 80, "kcal": 90}],
                [{"alimento": "Ensalada de atún con verduras", "quantidade_g": 250, "kcal": 260}, {"alimento": "Tostada horneada", "quantidade_g": 30, "kcal": 60}],
            ],
            "Colación PM": [
                [{"alimento": "Zanahoria y pepino con limón", "quantidade_g": 150, "kcal": 40}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 125, "kcal": 60}],
                [{"alimento": "Nueces", "quantidade_g": 12, "kcal": 80}],
            ],
            "Cena": [
                [{"alimento": "Sopa de verduras con pollo deshebrado", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Ensalada de nopales con queso panela", "quantidade_g": 250, "kcal": 200}],
                [{"alimento": "Tazón de vegetales salteados con tofu", "quantidade_g": 250, "kcal": 210}],
            ],
        },
    ),
    dict(
        nombre="Plan basado en plantas",
        categoria="Vegano",
        kcal_objetivo=1800,
        imagen_url="https://images.unsplash.com/photo-1649925548772-3dbd70852613?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Legumbres, granos enteros y vegetales cubriendo el 100% de la proteína de fuente vegetal.",
        split={"p": 20, "f": 30, "c": 50},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con leche de almendra y plátano", "quantidade_g": 250, "kcal": 320}],
                [{"alimento": "Tofu revuelto con jitomate y cebolla", "quantidade_g": 200, "kcal": 260}, {"alimento": "Tortilla de maíz", "quantidade_g": 30, "kcal": 65}],
                [{"alimento": "Licuado verde de espinaca, plátano y chía", "quantidade_g": 350, "kcal": 300}],
            ],
            "Colación AM": [
                [{"alimento": "Mix de nueces y semillas", "quantidade_g": 25, "kcal": 150}],
                [{"alimento": "Plátano", "quantidade_g": 120, "kcal": 105}],
                [{"alimento": "Hummus con zanahoria", "quantidade_g": 120, "kcal": 130}],
            ],
            "Comida": [
                [{"alimento": "Lentejas guisadas con verduras", "quantidade_g": 300, "kcal": 380}, {"alimento": "Arroz integral", "quantidade_g": 100, "kcal": 110}],
                [{"alimento": "Tazón de quinoa con garbanzos y vegetales", "quantidade_g": 350, "kcal": 420}],
                [{"alimento": "Tacos de frijol con nopal y aguacate", "quantidade_g": 300, "kcal": 400}],
            ],
            "Colación PM": [
                [{"alimento": "Barra de amaranto casera", "quantidade_g": 40, "kcal": 160}],
                [{"alimento": "Edamame al vapor", "quantidade_g": 120, "kcal": 120}],
                [{"alimento": "Manzana con crema de cacahuate", "quantidade_g": 150, "kcal": 180}],
            ],
            "Cena": [
                [{"alimento": "Crema de calabaza con semillas", "quantidade_g": 300, "kcal": 230}],
                [{"alimento": "Ensalada de garbanzo con vegetales asados", "quantidade_g": 300, "kcal": 280}],
                [{"alimento": "Tofu al horno con verduras", "quantidade_g": 280, "kcal": 260}],
            ],
        },
    ),
    dict(
        nombre="Bajo índice glucémico",
        categoria="Diabetes",
        kcal_objetivo=1800,
        imagen_url="https://images.unsplash.com/photo-1682342287771-ba352ea7e315?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Carbohidratos complejos y proteína magra distribuidos en 5 tiempos para glucemia estable durante el día.",
        split={"p": 25, "f": 30, "c": 45},
        tiempos={
            "Desayuno": [
                [{"alimento": "Omelette de claras con champiñones", "quantidade_g": 200, "kcal": 180}, {"alimento": "Tortilla de nopal", "quantidade_g": 60, "kcal": 40}],
                [{"alimento": "Avena integral con canela", "quantidade_g": 200, "kcal": 220}],
                [{"alimento": "Yogur natural con nuez y linaza", "quantidade_g": 200, "kcal": 210}],
            ],
            "Colación AM": [
                [{"alimento": "Toronja", "quantidade_g": 150, "kcal": 60}],
                [{"alimento": "Almendras", "quantidade_g": 15, "kcal": 87}],
                [{"alimento": "Pepino con limón y chile piquín", "quantidade_g": 150, "kcal": 25}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo con verduras salteadas", "quantidade_g": 250, "kcal": 320}, {"alimento": "Arroz integral", "quantidade_g": 70, "kcal": 80}],
                [{"alimento": "Filete de pescado con ejotes", "quantidade_g": 250, "kcal": 280}, {"alimento": "Frijoles de la olla", "quantidade_g": 80, "kcal": 90}],
                [{"alimento": "Milanesa de res al horno con ensalada", "quantidade_g": 250, "kcal": 350}],
            ],
            "Colación PM": [
                [{"alimento": "Jícama con limón", "quantidade_g": 150, "kcal": 45}],
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
                [{"alimento": "Ciruela", "quantidade_g": 100, "kcal": 46}],
            ],
            "Cena": [
                [{"alimento": "Sopa de verduras con pechuga deshebrada", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Ensalada de atún con vegetales", "quantidade_g": 280, "kcal": 240}],
                [{"alimento": "Tortilla de claras con champiñones y queso panela", "quantidade_g": 250, "kcal": 230}],
            ],
        },
    ),
    dict(
        nombre="Control de presión arterial",
        categoria="DASH · Hipertensión",
        kcal_objetivo=2000,
        imagen_url="https://images.unsplash.com/photo-1518843875459-f738682238a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Rico en potasio, calcio y magnesio; sodio limitado en cada preparación según la meta DASH.",
        split={"p": 20, "f": 30, "c": 50},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con plátano y nuez, sin sal añadida", "quantidade_g": 250, "kcal": 340}],
                [{"alimento": "Yogur natural con fresas y linaza", "quantidade_g": 220, "kcal": 260}],
                [{"alimento": "Huevo pochado con espinaca y jitomate", "quantidade_g": 200, "kcal": 240}],
            ],
            "Colación AM": [
                [{"alimento": "Plátano", "quantidade_g": 120, "kcal": 105}],
                [{"alimento": "Almendras sin sal", "quantidade_g": 20, "kcal": 116}],
                [{"alimento": "Naranja", "quantidade_g": 150, "kcal": 70}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo al horno con hierbas", "quantidade_g": 200, "kcal": 300}, {"alimento": "Quinoa", "quantidade_g": 80, "kcal": 95}, {"alimento": "Brócoli al vapor", "quantidade_g": 150, "kcal": 50}],
                [{"alimento": "Salmón al horno", "quantidade_g": 180, "kcal": 320}, {"alimento": "Camote horneado", "quantidade_g": 150, "kcal": 130}],
                [{"alimento": "Lentejas guisadas sin sal con vegetales", "quantidade_g": 300, "kcal": 380}],
            ],
            "Colación PM": [
                [{"alimento": "Yogur natural bajo en sodio", "quantidade_g": 150, "kcal": 90}],
                [{"alimento": "Apio con hummus casero", "quantidade_g": 150, "kcal": 110}],
                [{"alimento": "Uvas", "quantidade_g": 120, "kcal": 83}],
            ],
            "Cena": [
                [{"alimento": "Crema de espinaca sin sal con pechuga", "quantidade_g": 300, "kcal": 260}],
                [{"alimento": "Ensalada de garbanzo, pepino y jitomate", "quantidade_g": 300, "kcal": 280}],
                [{"alimento": "Pescado blanco al vapor con verduras", "quantidade_g": 280, "kcal": 250}],
            ],
        },
    ),
    dict(
        nombre="Cetogénico clásico",
        categoria="Keto",
        kcal_objetivo=1800,
        imagen_url="https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Grasas saludables predominantes, carbohidratos por debajo del 10% del total energético.",
        split={"p": 25, "f": 70, "c": 5},
        tiempos={
            "Desayuno": [
                [{"alimento": "Huevos revueltos con aguacate y queso", "quantidade_g": 220, "kcal": 420}],
                [{"alimento": "Omelette de tocino y espinaca con queso crema", "quantidade_g": 220, "kcal": 450}],
                [{"alimento": "Yogur griego entero con nuez de la india", "quantidade_g": 200, "kcal": 400}],
            ],
            "Colación AM": [
                [{"alimento": "Nueces mixtas", "quantidade_g": 30, "kcal": 200}],
                [{"alimento": "Queso manchego en cubos", "quantidade_g": 40, "kcal": 160}],
                [{"alimento": "Aceitunas con aceite de oliva", "quantidade_g": 40, "kcal": 150}],
            ],
            "Comida": [
                [{"alimento": "Salmón a la mantequilla con espárragos", "quantidade_g": 250, "kcal": 520}],
                [{"alimento": "Milanesa de pollo con ensalada y aguacate", "quantidade_g": 280, "kcal": 550}],
                [{"alimento": "Arrachera con verduras salteadas en aceite de oliva", "quantidade_g": 250, "kcal": 540}],
            ],
            "Colación PM": [
                [{"alimento": "Aguacate con sal y limón", "quantidade_g": 100, "kcal": 160}],
                [{"alimento": "Chicharrón de cerdo horneado", "quantidade_g": 30, "kcal": 170}],
                [{"alimento": "Queso oaxaca en tiras", "quantidade_g": 40, "kcal": 150}],
            ],
            "Cena": [
                [{"alimento": "Ensalada César con pollo y aderezo completo", "quantidade_g": 280, "kcal": 420}],
                [{"alimento": "Tortilla de huevo con champiñones al ajillo", "quantidade_g": 250, "kcal": 400}],
                [{"alimento": "Filete de pescado con mantequilla de hierbas", "quantidade_g": 250, "kcal": 410}],
            ],
        },
    ),
    dict(
        nombre="Estilo mediterráneo",
        categoria="Mediterránea",
        kcal_objetivo=1500,
        imagen_url="https://images.unsplash.com/photo-1653611540493-b3a896319fbf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Aceite de oliva, pescado y vegetales frescos como base — soporte cardiovascular de fondo.",
        split={"p": 18, "f": 35, "c": 47},
        tiempos={
            "Desayuno": [
                [{"alimento": "Pan integral con aceite de oliva y jitomate", "quantidade_g": 150, "kcal": 260}],
                [{"alimento": "Yogur griego con nuez y miel", "quantidade_g": 200, "kcal": 280}],
                [{"alimento": "Huevo cocido con aguacate y aceitunas", "quantidade_g": 180, "kcal": 270}],
            ],
            "Colación AM": [
                [{"alimento": "Puñado de almendras", "quantidade_g": 20, "kcal": 116}],
                [{"alimento": "Uvas", "quantidade_g": 120, "kcal": 83}],
                [{"alimento": "Aceitunas verdes", "quantidade_g": 30, "kcal": 90}],
            ],
            "Comida": [
                [{"alimento": "Pescado al horno con aceite de oliva y limón", "quantidade_g": 200, "kcal": 300}, {"alimento": "Ensalada griega", "quantidade_g": 150, "kcal": 120}],
                [{"alimento": "Pasta integral con jitomate, ajo y albahaca", "quantidade_g": 250, "kcal": 380}],
                [{"alimento": "Garbanzos guisados con espinaca y aceite de oliva", "quantidade_g": 280, "kcal": 360}],
            ],
            "Colación PM": [
                [{"alimento": "Queso feta con jitomate cherry", "quantidade_g": 80, "kcal": 140}],
                [{"alimento": "Hummus con pepino", "quantidade_g": 120, "kcal": 130}],
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
            ],
            "Cena": [
                [{"alimento": "Ensalada de atún, aceitunas y aceite de oliva", "quantidade_g": 250, "kcal": 280}],
                [{"alimento": "Sopa de lentejas al estilo mediterráneo", "quantidade_g": 280, "kcal": 260}],
                [{"alimento": "Verduras asadas con queso feta", "quantidade_g": 250, "kcal": 250}],
            ],
        },
    ),
    dict(
        nombre="Alto rendimiento deportivo",
        categoria="Hiperproteica",
        kcal_objetivo=2300,
        imagen_url="https://images.unsplash.com/photo-1543352632-5a4b24e4d2a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Desayuno ligero y cena fuerte con alta carga proteica para recuperación muscular tras el entrenamiento.",
        split={"p": 35, "f": 25, "c": 40},
        tiempos={
            "Desayuno": [
                [{"alimento": "Licuado de avena, plátano y proteína en polvo", "quantidade_g": 350, "kcal": 400}],
                [{"alimento": "Claras revueltas con avena y frutos rojos", "quantidade_g": 300, "kcal": 380}],
                [{"alimento": "Yogur griego con granola y proteína", "quantidade_g": 300, "kcal": 420}],
            ],
            "Colación AM": [
                [{"alimento": "Batido de proteína con leche", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Plátano con crema de cacahuate", "quantidade_g": 150, "kcal": 250}],
                [{"alimento": "Barra de proteína", "quantidade_g": 60, "kcal": 220}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo con arroz y vegetales", "quantidade_g": 350, "kcal": 550}],
                [{"alimento": "Salmón con camote y espárragos", "quantidade_g": 320, "kcal": 560}],
                [{"alimento": "Bistec de res con arroz integral y ensalada", "quantidade_g": 350, "kcal": 580}],
            ],
            "Colación PM": [
                [{"alimento": "Requesón con fruta", "quantidade_g": 200, "kcal": 200}],
                [{"alimento": "Atún en agua con galletas integrales", "quantidade_g": 150, "kcal": 220}],
                [{"alimento": "Yogur griego con nuez", "quantidade_g": 200, "kcal": 230}],
            ],
            "Cena": [
                [{"alimento": "Tazón de pavo molido con vegetales y quinoa", "quantidade_g": 350, "kcal": 480}],
                [{"alimento": "Pechuga a la plancha con puré de camote", "quantidade_g": 330, "kcal": 460}],
                [{"alimento": "Pescado al horno con verduras y arroz", "quantidade_g": 350, "kcal": 470}],
            ],
        },
    ),
    dict(
        nombre="Menú antiinflamatorio",
        categoria="Antiinflamatoria",
        kcal_objetivo=1700,
        imagen_url="https://images.unsplash.com/photo-1583949885751-23b7d1909378?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Ácidos grasos omega-3, antioxidantes y especias antiinflamatorias como eje del menú semanal.",
        split={"p": 20, "f": 35, "c": 45},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con moras azules y linaza", "quantidade_g": 250, "kcal": 300}],
                [{"alimento": "Yogur natural con nuez, cúrcuma y miel", "quantidade_g": 220, "kcal": 280}],
                [{"alimento": "Huevo pochado con espinaca y aguacate", "quantidade_g": 220, "kcal": 290}],
            ],
            "Colación AM": [
                [{"alimento": "Nueces de castilla", "quantidade_g": 20, "kcal": 130}],
                [{"alimento": "Piña con jengibre", "quantidade_g": 150, "kcal": 80}],
                [{"alimento": "Té verde con almendras", "quantidade_g": 20, "kcal": 116}],
            ],
            "Comida": [
                [{"alimento": "Salmón al horno con cúrcuma y brócoli", "quantidade_g": 250, "kcal": 380}],
                [{"alimento": "Ensalada de garbanzo, espinaca y aceite de oliva", "quantidade_g": 300, "kcal": 360}],
                [{"alimento": "Pechuga con jengibre, ajo y verduras salteadas", "quantidade_g": 280, "kcal": 350}],
            ],
            "Colación PM": [
                [{"alimento": "Mango con chía", "quantidade_g": 150, "kcal": 110}],
                [{"alimento": "Aguacate en rebanadas con limón", "quantidade_g": 100, "kcal": 160}],
                [{"alimento": "Yogur con cúrcuma y canela", "quantidade_g": 150, "kcal": 100}],
            ],
            "Cena": [
                [{"alimento": "Crema de brócoli con jengibre", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Sardinas con ensalada verde y aceite de oliva", "quantidade_g": 250, "kcal": 260}],
                [{"alimento": "Tazón de vegetales al vapor con tofu y ajonjolí", "quantidade_g": 280, "kcal": 240}],
            ],
        },
    ),
    dict(
        nombre="Manejo nutricional del SOP",
        categoria="SOP",
        kcal_objetivo=1600,
        imagen_url="https://images.unsplash.com/photo-1547592180-85f173990554?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Bajo índice glucémico con proteína y grasas saludables elevadas para mejorar la sensibilidad a la insulina — pilar del manejo nutricional del síndrome de ovario poliquístico.",
        split={"p": 30, "f": 32, "c": 38},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con canela y chía", "quantidade_g": 220, "kcal": 300}],
                [{"alimento": "Yogur griego natural", "quantidade_g": 200, "kcal": 130}, {"alimento": "Fresas", "quantidade_g": 100, "kcal": 35}, {"alimento": "Nueces", "quantidade_g": 15, "kcal": 100}],
                [{"alimento": "Omelette de claras con champiñones", "quantidade_g": 200, "kcal": 180}, {"alimento": "Aguacate con sal y limón", "quantidade_g": 60, "kcal": 95}],
            ],
            "Colación AM": [
                [{"alimento": "Almendras", "quantidade_g": 20, "kcal": 116}],
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
                [{"alimento": "Té verde con almendras", "quantidade_g": 20, "kcal": 116}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo a la plancha", "quantidade_g": 180, "kcal": 280}, {"alimento": "Ensalada de quinoa con nuez y aguacate", "quantidade_g": 200, "kcal": 260}],
                [{"alimento": "Salmón al horno", "quantidade_g": 180, "kcal": 320}, {"alimento": "Brócoli al vapor", "quantidade_g": 150, "kcal": 50}],
                [{"alimento": "Lentejas guisadas con verduras", "quantidade_g": 280, "kcal": 340}],
            ],
            "Colación PM": [
                [{"alimento": "Yogur natural con nuez y linaza", "quantidade_g": 180, "kcal": 190}],
                [{"alimento": "Zanahoria y pepino con limón", "quantidade_g": 150, "kcal": 40}],
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
            ],
            "Cena": [
                [{"alimento": "Filete de pescado al vapor", "quantidade_g": 180, "kcal": 220}, {"alimento": "Verduras al vapor", "quantidade_g": 150, "kcal": 55}],
                [{"alimento": "Sopa de verduras con pollo deshebrado", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Ensalada de garbanzo, espinaca y aceite de oliva", "quantidade_g": 250, "kcal": 300}],
            ],
        },
    ),
    dict(
        nombre="Plan para el embarazo",
        categoria="Embarazo",
        kcal_objetivo=2200,
        imagen_url="https://images.unsplash.com/photo-1574093274766-f9843b59debd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Aporte extra de folato, hierro y calcio para el segundo/tercer trimestre, con proteína suficiente para el crecimiento fetal — siempre validado por el equipo obstétrico.",
        split={"p": 20, "f": 30, "c": 50},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con leche de almendra y plátano", "quantidade_g": 280, "kcal": 380}],
                [{"alimento": "Yogur griego con nuez y miel", "quantidade_g": 220, "kcal": 300}, {"alimento": "Naranja", "quantidade_g": 150, "kcal": 70}],
                [{"alimento": "Huevo cocido con aguacate y aceitunas", "quantidade_g": 200, "kcal": 300}, {"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
            ],
            "Colación AM": [
                [{"alimento": "Plátano", "quantidade_g": 120, "kcal": 105}],
                [{"alimento": "Almendras", "quantidade_g": 20, "kcal": 116}],
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
            ],
            "Comida": [
                [{"alimento": "Salmón con camote y espárragos", "quantidade_g": 300, "kcal": 480}],
                [{"alimento": "Pechuga de pollo al horno con hierbas", "quantidade_g": 200, "kcal": 300}, {"alimento": "Quinoa", "quantidade_g": 100, "kcal": 120}, {"alimento": "Verduras al vapor", "quantidade_g": 100, "kcal": 30}],
                [{"alimento": "Lentejas guisadas con verduras", "quantidade_g": 320, "kcal": 400}, {"alimento": "Arroz integral", "quantidade_g": 80, "kcal": 90}],
            ],
            "Colación PM": [
                [{"alimento": "Yogur griego natural", "quantidade_g": 200, "kcal": 130}, {"alimento": "Fresas", "quantidade_g": 100, "kcal": 35}],
                [{"alimento": "Hummus con zanahoria", "quantidade_g": 150, "kcal": 160}],
                [{"alimento": "Nueces", "quantidade_g": 20, "kcal": 130}],
            ],
            "Cena": [
                [{"alimento": "Crema de calabaza con semillas", "quantidade_g": 300, "kcal": 260}, {"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
                [{"alimento": "Tortilla de claras con champiñones y queso panela", "quantidade_g": 250, "kcal": 260}],
                [{"alimento": "Sopa de lentejas al estilo mediterráneo", "quantidade_g": 300, "kcal": 280}],
            ],
        },
    ),
    dict(
        nombre="Manejo de gastritis",
        categoria="Gastritis",
        kcal_objetivo=1800,
        imagen_url="https://images.unsplash.com/photo-1469307517101-0b99d8fb0c33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Preparaciones suaves y bajas en grasa, en tiempos frecuentes y pequeños, evitando irritantes (cítricos, picante, café, carbonatados) según tolerancia individual.",
        split={"p": 20, "f": 25, "c": 55},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena integral con canela", "quantidade_g": 200, "kcal": 220}],
                [{"alimento": "Huevo pochado con espinaca y jitomate", "quantidade_g": 180, "kcal": 200}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 200, "kcal": 100}, {"alimento": "Plátano", "quantidade_g": 100, "kcal": 90}],
            ],
            "Colación AM": [
                [{"alimento": "Papaya con semillas de chía", "quantidade_g": 150, "kcal": 80}],
                [{"alimento": "Manzana", "quantidade_g": 130, "kcal": 68}],
                [{"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo hervida con puré de papa", "quantidade_g": 280, "kcal": 380}],
                [{"alimento": "Caldo de pollo con arroz y zanahoria", "quantidade_g": 320, "kcal": 260}],
                [{"alimento": "Filete de pescado al vapor", "quantidade_g": 200, "kcal": 230}, {"alimento": "Arroz integral", "quantidade_g": 80, "kcal": 90}],
            ],
            "Colación PM": [
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 150, "kcal": 75}],
                [{"alimento": "Plátano", "quantidade_g": 100, "kcal": 90}],
            ],
            "Cena": [
                [{"alimento": "Consomé de verduras colado", "quantidade_g": 300, "kcal": 90}, {"alimento": "Tortilla de claras con champiñones y queso panela", "quantidade_g": 200, "kcal": 200}],
                [{"alimento": "Sopa de verduras con pechuga deshebrada", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Camote horneado", "quantidade_g": 150, "kcal": 130}, {"alimento": "Pechuga de pollo a la plancha", "quantidade_g": 120, "kcal": 190}],
            ],
        },
    ),
    dict(
        nombre="Manejo del síndrome de intestino irritable",
        categoria="SII",
        kcal_objetivo=1700,
        imagen_url="https://images.unsplash.com/photo-1579113800032-c38bd7635818?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Inspirado en el enfoque bajo en FODMAP: porciones moderadas, evitando alimentos productores de gas, con introducción gradual de fibra según tolerancia.",
        split={"p": 20, "f": 30, "c": 50},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena en hojuelas", "quantidade_g": 180, "kcal": 200}],
                [{"alimento": "Huevo pochado con espinaca y jitomate", "quantidade_g": 180, "kcal": 200}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 180, "kcal": 90}, {"alimento": "Plátano", "quantidade_g": 100, "kcal": 90}],
            ],
            "Colación AM": [
                [{"alimento": "Naranja", "quantidade_g": 130, "kcal": 60}],
                [{"alimento": "Almendras", "quantidade_g": 15, "kcal": 87}],
                [{"alimento": "Zanahoria y pepino con limón", "quantidade_g": 130, "kcal": 35}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo a la plancha", "quantidade_g": 180, "kcal": 280}, {"alimento": "Arroz integral", "quantidade_g": 100, "kcal": 110}, {"alimento": "Zanahoria y pepino con limón", "quantidade_g": 100, "kcal": 30}],
                [{"alimento": "Filete de pescado con ejotes", "quantidade_g": 250, "kcal": 280}],
                [{"alimento": "Caldo de pollo con arroz y zanahoria", "quantidade_g": 320, "kcal": 260}],
            ],
            "Colación PM": [
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
                [{"alimento": "Uvas", "quantidade_g": 100, "kcal": 69}],
                [{"alimento": "Requesón con fruta", "quantidade_g": 150, "kcal": 150}],
            ],
            "Cena": [
                [{"alimento": "Sopa de verduras con pollo deshebrado", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Pescado blanco al vapor con verduras", "quantidade_g": 250, "kcal": 230}],
                [{"alimento": "Tortilla de claras con champiñones y queso panela", "quantidade_g": 220, "kcal": 220}],
            ],
        },
    ),
    dict(
        nombre="Manejo del estreñimiento",
        categoria="Estreñimiento",
        kcal_objetivo=1800,
        imagen_url="https://images.unsplash.com/photo-1610832958506-aa56368176cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Alto en fibra soluble e insoluble, con hidratación abundante y alimentos de efecto laxante natural (ciruela pasa, papaya, avena) distribuidos a lo largo del día.",
        split={"p": 18, "f": 27, "c": 55},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con moras azules y linaza", "quantidade_g": 250, "kcal": 300}],
                [{"alimento": "Papaya con semillas de chía", "quantidade_g": 200, "kcal": 110}, {"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
                [{"alimento": "Yogur natural con nuez y linaza", "quantidade_g": 200, "kcal": 210}],
            ],
            "Colación AM": [
                [{"alimento": "Ciruelas pasas hidratadas", "quantidade_g": 60, "kcal": 120}],
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
                [{"alimento": "Nueces", "quantidade_g": 20, "kcal": 130}],
            ],
            "Comida": [
                [{"alimento": "Lentejas guisadas con verduras", "quantidade_g": 320, "kcal": 400}, {"alimento": "Arroz integral", "quantidade_g": 90, "kcal": 100}],
                [{"alimento": "Pechuga de pollo con verduras salteadas", "quantidade_g": 280, "kcal": 350}, {"alimento": "Ensalada verde mixta", "quantidade_g": 150, "kcal": 40}],
                [{"alimento": "Ensalada de garbanzo, pepino y jitomate", "quantidade_g": 300, "kcal": 360}],
            ],
            "Colación PM": [
                [{"alimento": "Ciruela", "quantidade_g": 100, "kcal": 46}],
                [{"alimento": "Yogur natural con nuez y linaza", "quantidade_g": 150, "kcal": 160}],
                [{"alimento": "Nueces", "quantidade_g": 20, "kcal": 130}],
            ],
            "Cena": [
                [{"alimento": "Crema de brócoli con jengibre", "quantidade_g": 300, "kcal": 220}, {"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
                [{"alimento": "Ensalada de garbanzo con vegetales asados", "quantidade_g": 300, "kcal": 320}],
                [{"alimento": "Sopa de lentejas al estilo mediterráneo", "quantidade_g": 300, "kcal": 280}],
            ],
        },
    ),
    dict(
        nombre="Manejo de litiasis biliar",
        categoria="Litiasis biliar",
        kcal_objetivo=1500,
        imagen_url="https://images.unsplash.com/photo-1673166569003-c2ae73ac8550?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Muy bajo en grasa para minimizar la estimulación de la vesícula biliar — cocciones al vapor/hervidas, sin frituras, con porciones pequeñas y frecuentes.",
        split={"p": 20, "f": 20, "c": 60},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena en hojuelas", "quantidade_g": 180, "kcal": 190}],
                [{"alimento": "Claras revueltas con espinaca", "quantidade_g": 180, "kcal": 150}, {"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 200, "kcal": 100}, {"alimento": "Plátano", "quantidade_g": 100, "kcal": 90}],
            ],
            "Colación AM": [
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
                [{"alimento": "Papaya con semillas de chía", "quantidade_g": 150, "kcal": 80}],
                [{"alimento": "Jícama con limón", "quantidade_g": 150, "kcal": 40}],
            ],
            "Comida": [
                [{"alimento": "Pescado al vapor con puré de zanahoria", "quantidade_g": 280, "kcal": 320}],
                [{"alimento": "Pechuga de pollo hervida con puré de papa", "quantidade_g": 280, "kcal": 360}],
                [{"alimento": "Caldo de pollo con arroz y zanahoria", "quantidade_g": 320, "kcal": 260}, {"alimento": "Ensalada verde mixta", "quantidade_g": 120, "kcal": 35}],
            ],
            "Colación PM": [
                [{"alimento": "Ciruela", "quantidade_g": 100, "kcal": 46}],
                [{"alimento": "Jícama con limón", "quantidade_g": 150, "kcal": 40}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 150, "kcal": 75}],
            ],
            "Cena": [
                [{"alimento": "Consomé de verduras colado", "quantidade_g": 300, "kcal": 90}, {"alimento": "Tortilla de maíz", "quantidade_g": 30, "kcal": 65}],
                [{"alimento": "Sopa de verduras con pechuga deshebrada", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Pescado blanco al vapor con verduras", "quantidade_g": 250, "kcal": 230}],
            ],
        },
    ),
    dict(
        nombre="Manejo nutricional de la anemia ferropénica",
        categoria="Anemia",
        kcal_objetivo=1900,
        imagen_url="https://images.unsplash.com/photo-1773620494047-50cb58f59bc5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Hierro hemo y no-hemo combinado con vitamina C en la misma comida para maximizar la absorción; té y café se evitan cerca de las comidas principales.",
        split={"p": 25, "f": 25, "c": 50},
        tiempos={
            "Desayuno": [
                [{"alimento": "Huevo cocido con aguacate y aceitunas", "quantidade_g": 200, "kcal": 300}, {"alimento": "Naranja", "quantidade_g": 150, "kcal": 70}],
                [{"alimento": "Avena en hojuelas", "quantidade_g": 200, "kcal": 220}, {"alimento": "Fresas", "quantidade_g": 100, "kcal": 35}],
                [{"alimento": "Claras revueltas con espinaca", "quantidade_g": 200, "kcal": 180}, {"alimento": "Naranja", "quantidade_g": 150, "kcal": 70}],
            ],
            "Colación AM": [
                [{"alimento": "Almendras", "quantidade_g": 20, "kcal": 116}],
                [{"alimento": "Toronja", "quantidade_g": 150, "kcal": 60}],
                [{"alimento": "Nueces", "quantidade_g": 20, "kcal": 130}],
            ],
            "Comida": [
                [{"alimento": "Hígado de res encebollado", "quantidade_g": 180, "kcal": 320}, {"alimento": "Arroz integral", "quantidade_g": 90, "kcal": 100}],
                [{"alimento": "Bistec de res con arroz integral y ensalada", "quantidade_g": 300, "kcal": 480}],
                [{"alimento": "Lentejas guisadas con verduras", "quantidade_g": 320, "kcal": 400}, {"alimento": "Naranja", "quantidade_g": 130, "kcal": 60}],
            ],
            "Colación PM": [
                [{"alimento": "Yogur griego natural", "quantidade_g": 180, "kcal": 120}],
                [{"alimento": "Uvas", "quantidade_g": 120, "kcal": 83}],
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
            ],
            "Cena": [
                [{"alimento": "Pechuga de pollo con verduras salteadas", "quantidade_g": 280, "kcal": 350}],
                [{"alimento": "Ensalada de garbanzo, pepino y jitomate", "quantidade_g": 300, "kcal": 360}],
                [{"alimento": "Sopa de lentejas al estilo mediterráneo", "quantidade_g": 300, "kcal": 280}],
            ],
        },
    ),
    dict(
        nombre="Manejo nutricional del hipotiroidismo",
        categoria="Hipotiroidismo",
        kcal_objetivo=1600,
        imagen_url="https://images.unsplash.com/photo-1625943553852-781c6dd46faa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Yodo y selenio adecuados (pescados, mariscos, nueces de Brasil) con déficit calórico moderado — apoya el metabolismo sin comprometer la función tiroidea.",
        split={"p": 25, "f": 25, "c": 50},
        tiempos={
            "Desayuno": [
                [{"alimento": "Yogur griego natural", "quantidade_g": 200, "kcal": 130}, {"alimento": "Nueces de castilla", "quantidade_g": 20, "kcal": 130}],
                [{"alimento": "Huevo pochado con espinaca y jitomate", "quantidade_g": 180, "kcal": 200}],
                [{"alimento": "Avena integral con canela", "quantidade_g": 180, "kcal": 200}],
            ],
            "Colación AM": [
                [{"alimento": "Nueces de castilla", "quantidade_g": 15, "kcal": 100}],
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
                [{"alimento": "Almendras", "quantidade_g": 15, "kcal": 87}],
            ],
            "Comida": [
                [{"alimento": "Camarones al ajillo", "quantidade_g": 180, "kcal": 260}, {"alimento": "Arroz integral", "quantidade_g": 80, "kcal": 90}],
                [{"alimento": "Salmón al horno", "quantidade_g": 180, "kcal": 320}, {"alimento": "Brócoli al vapor", "quantidade_g": 150, "kcal": 50}],
                [{"alimento": "Filete de pescado al vapor", "quantidade_g": 200, "kcal": 230}, {"alimento": "Ensalada verde mixta", "quantidade_g": 130, "kcal": 35}],
            ],
            "Colación PM": [
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 150, "kcal": 75}],
                [{"alimento": "Zanahoria y pepino con limón", "quantidade_g": 150, "kcal": 40}],
            ],
            "Cena": [
                [{"alimento": "Sopa de verduras con pollo deshebrado", "quantidade_g": 300, "kcal": 220}],
                [{"alimento": "Tortilla de claras con champiñones y queso panela", "quantidade_g": 220, "kcal": 220}],
                [{"alimento": "Ensalada de atún con verduras", "quantidade_g": 250, "kcal": 240}],
            ],
        },
    ),
    dict(
        nombre="Manejo nutricional de la menopausia",
        categoria="Menopausia",
        kcal_objetivo=1700,
        imagen_url="https://images.unsplash.com/photo-1517448931760-9bf4414148c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Calcio y vitamina D para salud ósea, fitoestrógenos de soya como apoyo natural, y proteína suficiente para preservar masa muscular durante la transición hormonal.",
        split={"p": 25, "f": 30, "c": 45},
        tiempos={
            "Desayuno": [
                [{"alimento": "Leche de soya con avena", "quantidade_g": 280, "kcal": 260}],
                [{"alimento": "Yogur griego con nuez y miel", "quantidade_g": 200, "kcal": 280}],
                [{"alimento": "Huevo cocido con aguacate y aceitunas", "quantidade_g": 200, "kcal": 300}],
            ],
            "Colación AM": [
                [{"alimento": "Edamame al vapor", "quantidade_g": 120, "kcal": 120}],
                [{"alimento": "Almendras", "quantidade_g": 20, "kcal": 116}],
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
            ],
            "Comida": [
                [{"alimento": "Salmón al horno", "quantidade_g": 180, "kcal": 320}, {"alimento": "Quinoa", "quantidade_g": 90, "kcal": 105}],
                [{"alimento": "Tofu al horno con verduras", "quantidade_g": 300, "kcal": 280}, {"alimento": "Arroz integral", "quantidade_g": 80, "kcal": 90}],
                [{"alimento": "Pechuga de pollo al horno con hierbas", "quantidade_g": 200, "kcal": 300}, {"alimento": "Brócoli al vapor", "quantidade_g": 150, "kcal": 50}],
            ],
            "Colación PM": [
                [{"alimento": "Yogur griego natural", "quantidade_g": 180, "kcal": 120}],
                [{"alimento": "Nueces", "quantidade_g": 20, "kcal": 130}],
                [{"alimento": "Requesón con fruta", "quantidade_g": 150, "kcal": 150}],
            ],
            "Cena": [
                [{"alimento": "Crema de calabaza con semillas", "quantidade_g": 300, "kcal": 230}, {"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
                [{"alimento": "Ensalada de garbanzo, espinaca y aceite de oliva", "quantidade_g": 280, "kcal": 320}],
                [{"alimento": "Tazón de vegetales al vapor con tofu y ajonjolí", "quantidade_g": 280, "kcal": 260}],
            ],
        },
    ),
    dict(
        nombre="Plan vegetariano ovolácteo",
        categoria="Vegetariano",
        kcal_objetivo=1800,
        imagen_url="https://images.unsplash.com/photo-1687276287139-88f7333c8ca4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Incluye huevo y lácteos como fuentes de proteína completa junto a legumbres y granos enteros — más flexible que el plan vegano para quienes no restringen estos grupos.",
        split={"p": 20, "f": 30, "c": 50},
        tiempos={
            "Desayuno": [
                [{"alimento": "Sándwich de huevo con aguacate", "quantidade_g": 220, "kcal": 380}],
                [{"alimento": "Yogur griego natural", "quantidade_g": 200, "kcal": 130}, {"alimento": "Avena en hojuelas", "quantidade_g": 40, "kcal": 150}],
                [{"alimento": "Omelette de claras con champiñones", "quantidade_g": 200, "kcal": 180}, {"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
            ],
            "Colación AM": [
                [{"alimento": "Hummus con zanahoria", "quantidade_g": 130, "kcal": 140}],
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
                [{"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
            ],
            "Comida": [
                [{"alimento": "Ensalada de quinoa con nuez y aguacate", "quantidade_g": 300, "kcal": 400}],
                [{"alimento": "Lentejas guisadas con verduras", "quantidade_g": 320, "kcal": 400}, {"alimento": "Arroz integral", "quantidade_g": 80, "kcal": 90}],
                [{"alimento": "Tacos de frijol con nopal y aguacate", "quantidade_g": 300, "kcal": 400}],
            ],
            "Colación PM": [
                [{"alimento": "Requesón con fruta", "quantidade_g": 180, "kcal": 170}],
                [{"alimento": "Yogur natural con fresas y linaza", "quantidade_g": 180, "kcal": 200}],
                [{"alimento": "Nueces", "quantidade_g": 20, "kcal": 130}],
            ],
            "Cena": [
                [{"alimento": "Tortilla de claras con champiñones y queso panela", "quantidade_g": 220, "kcal": 220}],
                [{"alimento": "Crema de calabaza con semillas", "quantidade_g": 300, "kcal": 230}, {"alimento": "Queso panela", "quantidade_g": 40, "kcal": 95}],
                [{"alimento": "Ensalada de garbanzo con vegetales asados", "quantidade_g": 300, "kcal": 320}],
            ],
        },
    ),
    dict(
        nombre="Manejo de dislipidemia",
        categoria="Dislipidemia",
        kcal_objetivo=1700,
        imagen_url="https://images.unsplash.com/photo-1547592180-85f173990554?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Bajo en grasa saturada, alto en fibra soluble (avena, leguminosas) y ácidos grasos omega-3 — enfoque dietético de primera línea para colesterol y triglicéridos elevados.",
        split={"p": 20, "f": 25, "c": 55},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con manzana y canela", "quantidade_g": 250, "kcal": 300}],
                [{"alimento": "Claras revueltas con espinaca", "quantidade_g": 200, "kcal": 160}, {"alimento": "Pan integral", "quantidade_g": 30, "kcal": 75}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 200, "kcal": 100}, {"alimento": "Fresas", "quantidade_g": 100, "kcal": 35}],
            ],
            "Colación AM": [
                [{"alimento": "Nueces", "quantidade_g": 15, "kcal": 100}],
                [{"alimento": "Manzana", "quantidade_g": 150, "kcal": 78}],
                [{"alimento": "Almendras sin sal", "quantidade_g": 15, "kcal": 87}],
            ],
            "Comida": [
                [{"alimento": "Salmón al horno", "quantidade_g": 180, "kcal": 320}, {"alimento": "Ensalada verde mixta", "quantidade_g": 150, "kcal": 40}],
                [{"alimento": "Lentejas guisadas con verduras", "quantidade_g": 320, "kcal": 400}],
                [{"alimento": "Pechuga de pollo a la plancha", "quantidade_g": 180, "kcal": 280}, {"alimento": "Quinoa", "quantidade_g": 90, "kcal": 105}],
            ],
            "Colación PM": [
                [{"alimento": "Zanahoria y pepino con limón", "quantidade_g": 150, "kcal": 40}],
                [{"alimento": "Yogur natural bajo en grasa", "quantidade_g": 150, "kcal": 75}],
                [{"alimento": "Jícama con limón", "quantidade_g": 150, "kcal": 40}],
            ],
            "Cena": [
                [{"alimento": "Sardinas con ensalada verde y aceite de oliva", "quantidade_g": 250, "kcal": 260}],
                [{"alimento": "Sopa de lentejas al estilo mediterráneo", "quantidade_g": 300, "kcal": 280}],
                [{"alimento": "Ensalada de garbanzo, pepino y jitomate", "quantidade_g": 300, "kcal": 360}],
            ],
        },
    ),
    dict(
        nombre="Manejo del síndrome metabólico",
        categoria="Síndrome metabólico",
        kcal_objetivo=1600,
        imagen_url="https://images.unsplash.com/photo-1579113800032-c38bd7635818?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
        descripcion="Bajo índice glucémico, sodio controlado y grasas saludables para atender simultáneamente resistencia a la insulina, presión arterial y perfil lipídico.",
        split={"p": 25, "f": 30, "c": 45},
        tiempos={
            "Desayuno": [
                [{"alimento": "Avena con canela y chía", "quantidade_g": 220, "kcal": 300}],
                [{"alimento": "Huevo pochado con espinaca y jitomate", "quantidade_g": 180, "kcal": 200}],
                [{"alimento": "Yogur griego natural", "quantidade_g": 200, "kcal": 130}, {"alimento": "Nueces", "quantidade_g": 15, "kcal": 100}],
            ],
            "Colación AM": [
                [{"alimento": "Almendras sin sal", "quantidade_g": 15, "kcal": 87}],
                [{"alimento": "Toronja", "quantidade_g": 150, "kcal": 60}],
                [{"alimento": "Zanahoria y pepino con limón", "quantidade_g": 150, "kcal": 40}],
            ],
            "Comida": [
                [{"alimento": "Pechuga de pollo a la plancha", "quantidade_g": 180, "kcal": 280}, {"alimento": "Ensalada de quinoa con nuez y aguacate", "quantidade_g": 180, "kcal": 240}],
                [{"alimento": "Filete de pescado con ejotes", "quantidade_g": 250, "kcal": 280}],
                [{"alimento": "Lentejas guisadas sin sal con vegetales", "quantidade_g": 300, "kcal": 340}],
            ],
            "Colación PM": [
                [{"alimento": "Yogur natural bajo en sodio", "quantidade_g": 150, "kcal": 90}],
                [{"alimento": "Apio con hummus casero", "quantidade_g": 150, "kcal": 110}],
                [{"alimento": "Nueces", "quantidade_g": 15, "kcal": 100}],
            ],
            "Cena": [
                [{"alimento": "Pescado blanco al vapor con verduras", "quantidade_g": 250, "kcal": 230}],
                [{"alimento": "Crema de espinaca sin sal con pechuga", "quantidade_g": 300, "kcal": 260}],
                [{"alimento": "Ensalada de garbanzo, espinaca y aceite de oliva", "quantidade_g": 280, "kcal": 320}],
            ],
        },
    ),
]


def seed_pathology_templates():
    """Inserta cualquier plantilla de TEMPLATES cuyo nombre todavía no exista
    en la base — así lotes nuevos agregados a esta lista se siembran solos
    en el próximo arranque, sin duplicar las que ya están."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    existing_names = {n for (n,) in db.query(PathologyTemplate.nombre).all()}
    to_insert = [t for t in TEMPLATES if t["nombre"] not in existing_names]
    if not to_insert:
        print(f"Plantillas por patología ya sembradas — {len(existing_names)} encontradas. Saltando.")
        db.close()
        return
    for t in to_insert:
        weekly_menu = _build_semana(t["kcal_objetivo"], t["split"], t["tiempos"])
        db.add(PathologyTemplate(
            nombre=t["nombre"],
            categoria=t["categoria"],
            kcal_objetivo=t["kcal_objetivo"],
            descripcion=t["descripcion"],
            tiempos_por_dia=len(t["tiempos"]),
            weekly_menu=weekly_menu,
            imagen_url=t.get("imagen_url"),
        ))
    db.commit()
    db.close()
    print(f"Semilla de plantillas por patología: {len(to_insert)} nuevas insertadas ({len(existing_names)} ya existían).")


if __name__ == "__main__":
    seed_pathology_templates()
