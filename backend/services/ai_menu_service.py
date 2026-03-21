import json
import urllib.request
import os

GEMINI_MODEL = "gemini-1.5-flash"

ALIMENTOS_MEXICANOS = {
    "Alimentos de origen animal": {
        "cut": [
            ("Pechuga de pollo a la plancha", 130),
            ("Atún en agua", 100),
            ("Clara de huevo cocida", 240),
            ("Tilapia al vapor", 130),
            ("Camarón a la plancha", 120),
        ],
        "bulk": [
            ("Carne de res magra asada", 150),
            ("Huevo entero cocido", 120),
            ("Salmón a la plancha", 130),
            ("Pechuga de pollo guisada", 150),
            ("Atún en agua", 100),
        ],
        "maintenance": [
            ("Pechuga de pollo a la plancha", 130),
            ("Atún en agua", 100),
            ("Tilapia al horno", 130),
            ("Huevo entero cocido", 120),
            ("Camarón a la plancha", 120),
        ],
    },
    "Leguminosas": [
        ("Frijoles negros cocidos", 80),
        ("Frijoles bayos cocidos", 80),
        ("Lentejas cocidas", 80),
        ("Garbanzos cocidos", 80),
        ("Frijoles de la olla", 80),
    ],
    "Cereales y tuberculos": {
        "cut": [
            ("Arroz integral cocido", 75),
            ("Camote cocido", 100),
            ("Avena en hojuelas", 60),
            ("Tortilla de maíz", 60),
            ("Papa cocida", 100),
        ],
        "bulk": [
            ("Arroz blanco cocido", 80),
            ("Pasta integral cocida", 80),
            ("Pan integral", 60),
            ("Tortilla de maíz", 60),
            ("Camote cocido", 100),
        ],
        "maintenance": [
            ("Arroz integral cocido", 75),
            ("Camote cocido", 100),
            ("Avena en hojuelas", 60),
            ("Tortilla de maíz", 60),
            ("Papa cocida", 100),
        ],
    },
    "Frutas": [
        ("Plátano", 120), ("Manzana", 150), ("Papaya", 120),
        ("Naranja", 130), ("Mango", 100), ("Sandía", 200),
        ("Melón", 150), ("Guayaba", 100), ("Tuna", 100),
    ],
    "Verduras": [
        ("Brócoli cocido", 100), ("Espinacas salteadas", 80),
        ("Zanahoria cruda", 80), ("Calabacita cocida", 100),
        ("Nopal cocido", 100), ("Chayote cocido", 100),
        ("Jitomate", 100), ("Lechuga", 80), ("Pepino", 100),
        ("Chile poblano asado", 80),
    ],
    "Aceites y Grasas": [
        ("Aceite de oliva", 10), ("Aguacate", 50),
        ("Nuez", 20), ("Almendra", 20), ("Cacahuate natural", 20),
    ],
    "Leche": [
        ("Yogur griego descremado", 170), ("Leche descremada", 200),
        ("Queso cottage", 100), ("Jocoque", 100),
    ],
    "Azucares": [
        ("Miel de abeja", 15), ("Piloncillo", 10),
    ],
}

def build_food_context(smae_table, goal):
    lines = []
    for row in smae_table:
        group = row["group"]
        foods = ALIMENTOS_MEXICANOS.get(group, [])
        if isinstance(foods, dict):
            foods = foods.get(goal, foods.get("maintenance", []))
        if foods:
            food_str = ", ".join([f"{f[0]} ({f[1]}g)" for f in foods])
            lines.append(f"- {group}: {food_str}")
    return "\n".join(lines)

def generate_ai_menu(plan_data: dict, audit_data: dict) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY", "")

    goal = plan_data.get("goal", "maintenance")
    weight = plan_data.get("weight", 70)
    get = audit_data["energy_validation"]["get_planned"]
    protein_g = audit_data["totals"]["protein_g"]
    carbs_g = audit_data["totals"]["carbs_g"]
    fats_g = audit_data["totals"]["fats_g"]
    smae_table = audit_data["smae_table"]

    food_context = build_food_context(smae_table, goal)
    goal_es = {"cut": "pérdida de peso", "bulk": "ganancia muscular", "maintenance": "mantenimiento"}.get(goal, goal)

    prompt = f"""Eres un nutricionista clínico especializado en gastronomía mexicana saludable.
Genera 3 opciones de menú diario con 6 tiempos de comida usando ingredientes típicos mexicanos.

DATOS DEL PACIENTE:
- Objetivo: {goal_es}
- Peso: {weight} kg
- Meta calórica: {get:.0f} kcal/día
- Proteína: {protein_g:.1f}g | Carbohidrato: {carbs_g:.1f}g | Grasa: {fats_g:.1f}g

ALIMENTOS DISPONIBLES:
{food_context}

DISTRIBUCIÓN CALÓRICA EN 6 TIEMPOS:
- Desayuno: 25%
- Colación matutina: 10%
- Comida: 30%
- Colación vespertina: 10%
- Cena: 20%
- Colación nocturna: 5%

REGLAS:
1. Usa ÚNICAMENTE los alimentos de la lista
2. Especifica cantidad en GRAMOS
3. Opción 1: Alta proteína (pollo, atún, huevo, camarón)
4. Opción 2: Balanceada (variedad mexicana completa)
5. Opción 3: Basada en plantas (leguminosas, verduras, nopal)
6. Usa preparaciones mexicanas: a la plancha, guisado, al vapor, en caldo, asado
7. Incluye ingredientes típicos: nopal, chayote, tortilla de maíz, frijoles, aguacate

Responde ÚNICAMENTE con JSON válido:
{{
  "opciones": [
    {{
      "nombre": "Opción 1 — Alta proteína",
      "refeicoes": [
        {{"refeicao": "Desayuno", "kcal": {int(get*0.25)}, "itens": [{{"alimento": "Pechuga de pollo a la plancha", "quantidade_g": 130, "kcal": 143}}, {{"alimento": "Tortilla de maíz", "quantidade_g": 60, "kcal": 120}}]}},
        {{"refeicao": "Colación matutina", "kcal": {int(get*0.10)}, "itens": [{{"alimento": "Manzana", "quantidade_g": 150, "kcal": 90}}]}},
        {{"refeicao": "Comida", "kcal": {int(get*0.30)}, "itens": [{{"alimento": "Atún en agua", "quantidade_g": 100, "kcal": 116}}, {{"alimento": "Arroz integral cocido", "quantidade_g": 75, "kcal": 105}}, {{"alimento": "Frijoles negros cocidos", "quantidade_g": 80, "kcal": 96}}, {{"alimento": "Nopal cocido", "quantidade_g": 100, "kcal": 25}}]}},
        {{"refeicao": "Colación vespertina", "kcal": {int(get*0.10)}, "itens": [{{"alimento": "Yogur griego descremado", "quantidade_g": 170, "kcal": 95}}]}},
        {{"refeicao": "Cena", "kcal": {int(get*0.20)}, "itens": [{{"alimento": "Tilapia al vapor", "quantidade_g": 130, "kcal": 130}}, {{"alimento": "Chayote cocido", "quantidade_g": 100, "kcal": 38}}]}},
        {{"refeicao": "Colación nocturna", "kcal": {int(get*0.05)}, "itens": [{{"alimento": "Leche descremada", "quantidade_g": 200, "kcal": 69}}]}}
      ],
      "macros": {{"proteina_g": {protein_g:.0f}, "carb_g": {carbs_g:.0f}, "gordura_g": {fats_g:.0f}, "kcal_total": {get:.0f}}}
    }},
    {{
      "nombre": "Opción 2 — Balanceada",
      "refeicoes": [
        {{"refeicao": "Desayuno", "kcal": {int(get*0.25)}, "itens": [{{"alimento": "Huevo entero cocido", "quantidade_g": 120, "kcal": 186}}, {{"alimento": "Frijoles de la olla", "quantidade_g": 80, "kcal": 96}}, {{"alimento": "Tortilla de maíz", "quantidade_g": 60, "kcal": 120}}]}},
        {{"refeicao": "Colación matutina", "kcal": {int(get*0.10)}, "itens": [{{"alimento": "Papaya", "quantidade_g": 120, "kcal": 54}}, {{"alimento": "Nuez", "quantidade_g": 20, "kcal": 131}}]}},
        {{"refeicao": "Comida", "kcal": {int(get*0.30)}, "itens": [{{"alimento": "Pechuga de pollo guisada", "quantidade_g": 150, "kcal": 165}}, {{"alimento": "Arroz integral cocido", "quantidade_g": 75, "kcal": 105}}, {{"alimento": "Calabacita cocida", "quantidade_g": 100, "kcal": 30}}, {{"alimento": "Aguacate", "quantidade_g": 50, "kcal": 80}}]}},
        {{"refeicao": "Colación vespertina", "kcal": {int(get*0.10)}, "itens": [{{"alimento": "Manzana", "quantidade_g": 150, "kcal": 90}}, {{"alimento": "Almendra", "quantidade_g": 20, "kcal": 116}}]}},
        {{"refeicao": "Cena", "kcal": {int(get*0.20)}, "itens": [{{"alimento": "Atún en agua", "quantidade_g": 100, "kcal": 116}}, {{"alimento": "Camote cocido", "quantidade_g": 100, "kcal": 90}}, {{"alimento": "Espinacas salteadas", "quantidade_g": 80, "kcal": 18}}]}},
        {{"refeicao": "Colación nocturna", "kcal": {int(get*0.05)}, "itens": [{{"alimento": "Yogur griego descremado", "quantidade_g": 170, "kcal": 95}}]}}
      ],
      "macros": {{"proteina_g": {protein_g:.0f}, "carb_g": {carbs_g:.0f}, "gordura_g": {fats_g:.0f}, "kcal_total": {get:.0f}}}
    }},
    {{
      "nombre": "Opción 3 — Base vegetal",
      "refeicoes": [
        {{"refeicao": "Desayuno", "kcal": {int(get*0.25)}, "itens": [{{"alimento": "Avena en hojuelas", "quantidade_g": 60, "kcal": 228}}, {{"alimento": "Plátano", "quantidade_g": 120, "kcal": 107}}, {{"alimento": "Leche descremada", "quantidade_g": 200, "kcal": 69}}]}},
        {{"refeicao": "Colación matutina", "kcal": {int(get*0.10)}, "itens": [{{"alimento": "Guayaba", "quantidade_g": 100, "kcal": 68}}, {{"alimento": "Cacahuate natural", "quantidade_g": 20, "kcal": 113}}]}},
        {{"refeicao": "Comida", "kcal": {int(get*0.30)}, "itens": [{{"alimento": "Lentejas cocidas", "quantidade_g": 80, "kcal": 93}}, {{"alimento": "Arroz integral cocido", "quantidade_g": 75, "kcal": 105}}, {{"alimento": "Nopal cocido", "quantidade_g": 100, "kcal": 25}}, {{"alimento": "Tortilla de maíz", "quantidade_g": 60, "kcal": 120}}, {{"alimento": "Aguacate", "quantidade_g": 50, "kcal": 80}}]}},
        {{"refeicao": "Colación vespertina", "kcal": {int(get*0.10)}, "itens": [{{"alimento": "Mango", "quantidade_g": 100, "kcal": 60}}, {{"alimento": "Jocoque", "quantidade_g": 100, "kcal": 75}}]}},
        {{"refeicao": "Cena", "kcal": {int(get*0.20)}, "itens": [{{"alimento": "Garbanzos cocidos", "quantidade_g": 80, "kcal": 134}}, {{"alimento": "Chayote cocido", "quantidade_g": 100, "kcal": 38}}, {{"alimento": "Calabacita cocida", "quantidade_g": 100, "kcal": 30}}]}},
        {{"refeicao": "Colación nocturna", "kcal": {int(get*0.05)}, "itens": [{{"alimento": "Queso cottage", "quantidade_g": 100, "kcal": 98}}]}}
      ],
      "macros": {{"proteina_g": {protein_g:.0f}, "carb_g": {carbs_g:.0f}, "gordura_g": {fats_g:.0f}, "kcal_total": {get:.0f}}}
    }}
  ]
}}"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"

    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 4000}
    }).encode()

    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    text = result["candidates"][0]["content"]["parts"][0]["text"]
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)
