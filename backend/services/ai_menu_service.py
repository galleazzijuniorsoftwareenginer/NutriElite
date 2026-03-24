import json
import urllib.request
import os

ALIMENTOS_MEXICANOS = {
    "Alimentos de origen animal": {
        "cut": [("Pechuga de pollo a la plancha", 130), ("Atún en agua", 100), ("Clara de huevo cocida", 240), ("Tilapia al vapor", 130), ("Camarón a la plancha", 120)],
        "bulk": [("Carne de res magra asada", 150), ("Huevo entero cocido", 120), ("Salmón a la plancha", 130), ("Pechuga de pollo guisada", 150)],
        "maintenance": [("Pechuga de pollo a la plancha", 130), ("Atún en agua", 100), ("Tilapia al horno", 130), ("Huevo entero cocido", 120)],
    },
    "Leguminosas": [("Frijoles negros cocidos", 80), ("Frijoles bayos cocidos", 80), ("Lentejas cocidas", 80), ("Garbanzos cocidos", 80), ("Frijoles de la olla", 80)],
    "Cereales y tuberculos": {
        "cut": [("Arroz integral cocido", 75), ("Camote cocido", 100), ("Avena en hojuelas", 60), ("Tortilla de maíz", 60), ("Papa cocida", 100)],
        "bulk": [("Arroz blanco cocido", 80), ("Pasta integral cocida", 80), ("Pan integral", 60), ("Tortilla de maíz", 60)],
        "maintenance": [("Arroz integral cocido", 75), ("Camote cocido", 100), ("Avena en hojuelas", 60), ("Tortilla de maíz", 60)],
    },
    "Frutas": [("Plátano", 120), ("Manzana", 150), ("Papaya", 120), ("Naranja", 130), ("Mango", 100), ("Sandía", 200), ("Guayaba", 100), ("Tuna", 100)],
    "Verduras": [("Brócoli cocido", 100), ("Espinacas salteadas", 80), ("Zanahoria cruda", 80), ("Calabacita cocida", 100), ("Nopal cocido", 100), ("Chayote cocido", 100), ("Jitomate", 100), ("Chile poblano asado", 80)],
    "Aceites y Grasas": [("Aceite de oliva", 10), ("Aguacate", 50), ("Nuez", 20), ("Almendra", 20), ("Cacahuate natural", 20)],
    "Leche": [("Yogur griego descremado", 170), ("Leche descremada", 200), ("Queso cottage", 100), ("Jocoque", 100)],
    "Azucares": [("Miel de abeja", 15), ("Piloncillo", 10)],
}

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

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

def call_claude(prompt: str, api_key: str) -> str:
    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    text = result["content"][0]["text"]
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return text.strip()

def generate_day(dia: str, goal_es: str, weight: float, get: float,
                 protein_g: float, carbs_g: float, fats_g: float,
                 food_context: str, api_key: str) -> dict:

    prompt = f"""Eres nutricionista clínico mexicano. Genera el plan del {dia}.
Objetivo: {goal_es} | Peso: {weight}kg | Meta: {get:.0f} kcal
Proteína: {protein_g:.0f}g | Carb: {carbs_g:.0f}g | Grasa: {fats_g:.0f}g

Alimentos disponibles:
{food_context}

Responde SOLO con JSON:
{{"dia":"{dia}","comidas":[
{{"tiempo":"Desayuno","kcal":{int(get*0.25)},"itens":[{{"alimento":"Avena en hojuelas","quantidade_g":60,"kcal":219}}]}},
{{"tiempo":"Colación matutina","kcal":{int(get*0.10)},"itens":[{{"alimento":"Manzana","quantidade_g":150,"kcal":90}}]}},
{{"tiempo":"Comida","kcal":{int(get*0.30)},"itens":[{{"alimento":"Pechuga de pollo a la plancha","quantidade_g":130,"kcal":143}}]}},
{{"tiempo":"Colación vespertina","kcal":{int(get*0.10)},"itens":[{{"alimento":"Yogur griego descremado","quantidade_g":170,"kcal":95}}]}},
{{"tiempo":"Cena","kcal":{int(get*0.20)},"itens":[{{"alimento":"Tilapia al vapor","quantidade_g":130,"kcal":130}}]}},
{{"tiempo":"Colación nocturna","kcal":{int(get*0.05)},"itens":[{{"alimento":"Leche descremada","quantidade_g":200,"kcal":69}}]}}
],"macros":{{"proteina_g":{protein_g:.0f},"carb_g":{carbs_g:.0f},"gordura_g":{fats_g:.0f},"kcal_total":{get:.0f}}}}}"""

    text = call_claude(prompt, api_key)
    return json.loads(text)

def generate_ai_menu(plan_data: dict, audit_data: dict) -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    goal = plan_data.get("goal", "maintenance")
    weight = plan_data.get("weight", 70)
    get = audit_data["energy_validation"]["get_planned"]
    protein_g = audit_data["totals"]["protein_g"]
    carbs_g = audit_data["totals"]["carbs_g"]
    fats_g = audit_data["totals"]["fats_g"]
    smae_table = audit_data["smae_table"]

    food_context = build_food_context(smae_table, goal)
    goal_es = {"cut": "pérdida de peso", "bulk": "ganancia muscular", "maintenance": "mantenimiento"}.get(goal, goal)

    semana = []
    for dia in DIAS_SEMANA:
        try:
            day_data = generate_day(dia, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, api_key)
            semana.append(day_data)
        except Exception as e:
            print(f"ERRO dia {dia}: {e}")
            semana.append({
                "dia": dia,
                "comidas": [],
                "macros": {"proteina_g": protein_g, "carb_g": carbs_g, "gordura_g": fats_g, "kcal_total": get}
            })

    return {"semana": semana}
