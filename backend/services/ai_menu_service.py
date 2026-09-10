import json
import random
import urllib.request
import os

# Lista expandida de alimentos mexicanos por categoria e objetivo
ALIMENTOS_MEXICANOS = {
    "Alimentos de origen animal": {
        "cut": [
            ("Pechuga de pollo a la plancha", 130), ("Atún en agua", 100), ("Clara de huevo cocida", 240),
            ("Tilapia al vapor", 130), ("Camarón a la plancha", 120), ("Pavo molido al horno", 120),
            ("Sardina en agua", 90), ("Claras de huevo revueltas", 200), ("Filete de mojarra", 130),
            ("Pechuga de guajolote", 120), ("Atún fresco a la plancha", 120), ("Pulpo cocido", 100),
        ],
        "bulk": [
            ("Carne de res magra asada", 150), ("Huevo entero cocido", 120), ("Salmón a la plancha", 130),
            ("Pechuga de pollo guisada", 150), ("Carne molida de res", 130), ("Milanesa de pollo al horno", 140),
            ("Huevos estrellados", 120), ("Atún en aceite", 100), ("Bistec de res a la plancha", 140),
            ("Pierna de pollo sin piel", 130), ("Lomo de cerdo magro", 120), ("Huevo a la mexicana", 150),
        ],
        "maintenance": [
            ("Pechuga de pollo a la plancha", 130), ("Atún en agua", 100), ("Tilapia al horno", 130),
            ("Huevo entero cocido", 120), ("Pavo en salsa", 120), ("Pescado empapelado", 130),
            ("Pollo en salsa verde", 130), ("Camarón al ajillo", 100), ("Huevos rancheros", 150),
            ("Filete de res magro", 120), ("Pollo a las hierbas", 130), ("Sardina a la veracruzana", 100),
        ],
    },
    "Leguminosas": [
        ("Frijoles negros cocidos", 80), ("Frijoles bayos cocidos", 80), ("Lentejas cocidas", 80),
        ("Garbanzos cocidos", 80), ("Frijoles de la olla", 80), ("Frijoles pinto cocidos", 80),
        ("Sopa de lentejas", 200), ("Frijoles charros", 100), ("Habas cocidas", 80),
        ("Frijoles refritos light", 60), ("Sopa de garbanzos", 200), ("Edamame cocido", 80),
    ],
    "Cereales y tuberculos": {
        "cut": [
            ("Arroz integral cocido", 75), ("Camote cocido", 100), ("Avena en hojuelas", 60),
            ("Tortilla de maíz", 60), ("Papa cocida", 100), ("Tostadas horneadas", 30),
            ("Tortilla de nopal", 60), ("Arroz rojo integral", 75), ("Elote cocido", 100),
            ("Pan de centeno", 40), ("Quinoa cocida", 80), ("Amaranto inflado", 30),
        ],
        "bulk": [
            ("Arroz blanco cocido", 80), ("Pasta integral cocida", 80), ("Pan integral", 60),
            ("Tortilla de maíz", 60), ("Tamales de rajas", 100), ("Sopa de pasta", 80),
            ("Arroz a la mexicana", 80), ("Quesadilla de maíz", 80), ("Molletes integrales", 80),
            ("Papa al horno", 120), ("Enchiladas verdes", 100), ("Pozole de maíz", 200),
        ],
        "maintenance": [
            ("Arroz integral cocido", 75), ("Camote cocido", 100), ("Avena en hojuelas", 60),
            ("Tortilla de maíz", 60), ("Chilaquiles verdes light", 100), ("Sopa de fideos", 60),
            ("Arroz con verduras", 80), ("Tostadas de maíz", 30), ("Tamal de elote", 80),
            ("Papa cambray cocida", 100), ("Caldo tlalpeño", 200), ("Pozole verde", 200),
        ],
    },
    "Frutas": [
        ("Plátano", 120), ("Manzana", 150), ("Papaya", 120), ("Naranja", 130), ("Mango", 100),
        ("Sandía", 200), ("Guayaba", 100), ("Tuna", 100), ("Melón", 150), ("Fresa", 150),
        ("Mandarina", 120), ("Kiwi", 100), ("Pera", 150), ("Ciruela", 100), ("Durazno", 120),
        ("Uvas", 100), ("Jícama", 150), ("Tejocote", 100), ("Pitaya", 100), ("Nanche", 80),
    ],
    "Verduras": [
        ("Brócoli cocido", 100), ("Espinacas salteadas", 80), ("Zanahoria cruda", 80),
        ("Calabacita cocida", 100), ("Nopal cocido", 100), ("Chayote cocido", 100),
        ("Jitomate", 100), ("Chile poblano asado", 80), ("Ejotes cocidos", 100),
        ("Betabel cocido", 80), ("Coliflor al vapor", 100), ("Pepino", 100),
        ("Lechuga romana", 80), ("Acelgas salteadas", 80), ("Verdolagas guisadas", 80),
        ("Quelites", 80), ("Flor de calabaza", 80), ("Cebolla asada", 60),
        ("Pimiento morrón", 80), ("Champignones salteados", 80),
    ],
    "Aceites y Grasas": [
        ("Aceite de oliva", 10), ("Aguacate", 50), ("Nuez", 20), ("Almendra", 20),
        ("Cacahuate natural", 20), ("Semillas de girasol", 20), ("Pepitas de calabaza", 20),
        ("Aceite de aguacate", 10), ("Crema light", 30), ("Queso panela", 40),
    ],
    "Leche": [
        ("Yogur griego descremado", 170), ("Leche descremada", 200), ("Queso cottage", 100),
        ("Jocoque", 100), ("Kéfir natural", 200), ("Leche de almendra sin azúcar", 200),
        ("Queso fresco bajo en grasa", 40), ("Requesón", 80), ("Yogur natural sin azúcar", 170),
    ],
    "Azucares": [
        ("Miel de abeja", 15), ("Piloncillo", 10), ("Mermelada light", 15),
        ("Ate de guayaba", 20), ("Tamarindo natural", 15),
    ],
}

# Platillos mexicanos típicos por tiempo de comida para inspirar variedad
PLATILLOS_TIPICOS = {
    "Desayuno": [
        "Chilaquiles verdes con pollo", "Huevos a la mexicana", "Enfrijoladas light",
        "Avena con frutas tropicales", "Molletes con frijoles", "Quesadillas de flor de calabaza",
        "Huevos rancheros", "Tamales de rajas con queso", "Omelette de nopales",
        "Sincronizadas de pavo", "Enchiladas verdes", "Tlayuda oaxaqueña light",
    ],
    "Comida": [
        "Caldo de pollo con verduras", "Sopa de lima yucateca", "Pozole verde",
        "Mole negro con pechuga", "Pollo en salsa verde con arroz", "Pescado a la veracruzana",
        "Tinga de pollo con tostadas", "Sopa de lentejas con chorizo de pavo",
        "Camarones al mojo de ajo", "Birria de res magra", "Cocido de res",
        "Enchiladas rojas con pollo", "Chiles rellenos de atún", "Caldo tlalpeño",
    ],
    "Cena": [
        "Sopa de fideos seca", "Quesadillas de maíz con champiñones", "Ensalada de nopales",
        "Tacos de canasta de frijol", "Sopa de verduras", "Molletes integrales",
        "Tostadas de atún", "Caldo de pollo light", "Tacos de pollo al vapor",
        "Flautas horneadas", "Sopa azteca light", "Enfrijoladas de queso",
    ],
}

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

# Distribución por defecto de kcal a lo largo del día — el nutricionista puede
# ajustarla manualmente en el paso "Distribuye" del wizard (Plan.meal_distribution);
# esto es solo el punto de partida cuando el plan aún no tiene una guardada.
DEFAULT_MEAL_DISTRIBUTION = [
    {"tiempo": "Desayuno", "pct": 25, "horario": "08:00"},
    {"tiempo": "Colación matutina", "pct": 10, "horario": "11:00"},
    {"tiempo": "Comida", "pct": 30, "horario": "14:00"},
    {"tiempo": "Colación vespertina", "pct": 10, "horario": "17:00"},
    {"tiempo": "Cena", "pct": 20, "horario": "20:00"},
    {"tiempo": "Colación nocturna", "pct": 5, "horario": "22:00"},
]

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


def _fetch_recipe_pool(db) -> dict:
    """Nombres de recetas reales del banco del app (created_by=null),
    agrupados por tiempo_comida, para enriquecer la variedad con recetas
    que ya existen dentro de NutriElite en vez de solo la lista fija."""
    pool = {"Desayuno": [], "Comida": [], "Cena": []}
    if db is None:
        return pool
    try:
        from backend.models import Recipe
        rows = db.query(Recipe.nombre, Recipe.tiempo_comida).filter(Recipe.created_by.is_(None)).all()
        for nombre, tiempo in rows:
            if tiempo in pool:
                pool[tiempo].append(nombre)
    except Exception:
        pass
    return pool


def _build_dish_pools(db) -> dict:
    recipe_pool = _fetch_recipe_pool(db)
    pools = {}
    for tiempo, base_list in PLATILLOS_TIPICOS.items():
        merged = list(dict.fromkeys(base_list + recipe_pool.get(tiempo, [])))
        pools[tiempo] = merged
    return pools


def pick_weekly_dishes(pool: list, count: int = 7) -> list:
    """Asigna un platillo distinto por día de la semana (sin repetir mientras
    el pool alcance) — elimina la repetición estructural que ocurría cuando
    varios días rotaban sobre la misma lista y colisionaban."""
    items = list(dict.fromkeys(pool))
    if not items:
        return [None] * count
    random.shuffle(items)
    if len(items) >= count:
        return items[:count]
    out = []
    while len(out) < count:
        out.extend(items)
        random.shuffle(items)
    return out[:count]

CLAUDE_TIMEOUT_SECONDS = 30

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
    with urllib.request.urlopen(req, timeout=CLAUDE_TIMEOUT_SECONDS) as resp:
        result = json.loads(resp.read())

    text = result["content"][0]["text"]
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return text.strip()

def call_claude_with_retry(prompt: str, api_key: str, retries: int = 1) -> str:
    last_error = None
    for attempt in range(retries + 1):
        try:
            return call_claude(prompt, api_key)
        except Exception as e:
            last_error = e
    raise last_error

def _validate_day_json(parsed: dict) -> None:
    """El modelo a veces omite quantidade_g en algún alimento (JSON válido
    pero incompleto) — eso pasaba silenciosamente y el PDF mostraba "—g".
    Se valida acá para que ese caso dispare un reintento en vez de guardarse."""
    comidas = parsed.get("comidas")
    if not comidas:
        raise ValueError("Respuesta sin comidas")
    for comida in comidas:
        itens = comida.get("itens") or comida.get("items")
        if not itens:
            raise ValueError(f"Tiempo sin alimentos: {comida.get('tiempo')}")
        for item in itens:
            qty = item.get("quantidade_g")
            if not isinstance(qty, (int, float)) or qty <= 0:
                raise ValueError(f"Alimento sin quantidade_g válido: {item.get('alimento')}")
            if not item.get("alimento"):
                raise ValueError("Alimento sin nombre")


def generate_day(dia: str, day_index: int, goal_es: str, weight: float, get: float,
                 protein_g: float, carbs_g: float, fats_g: float,
                 food_context: str, api_key: str,
                 platillo_desayuno: str | None = None,
                 platillo_comida: str | None = None,
                 platillo_cena: str | None = None,
                 avoid_dishes: list | None = None,
                 meal_distribution: list | None = None) -> dict:

    avoid_txt = ""
    if avoid_dishes:
        avoid_txt = f"\nEVITA repetir estos platillos que ya se usaron otros días de esta misma semana: {', '.join(avoid_dishes)}."

    distribution = meal_distribution or DEFAULT_MEAL_DISTRIBUTION
    ejemplo_kcal = {"Desayuno": 200, "Comida": 200, "Cena": 150}
    tiempos_json = ",\n".join(
        f'{{"tiempo":"{slot["tiempo"]}","kcal":{round(get * slot["pct"] / 100)},"itens":[{{"alimento":"nombre","quantidade_g":100,"kcal":{ejemplo_kcal.get(slot["tiempo"], 90)}}}]}}'
        for slot in distribution
    )

    prompt = f"""Eres nutricionista clínico mexicano experto en gastronomía regional. Genera el plan alimenticio del {dia}.

DATOS:
- Objetivo: {goal_es} | Peso: {weight}kg | Meta: {get:.0f} kcal
- Proteína: {protein_g:.0f}g | Carb: {carbs_g:.0f}g | Grasa: {fats_g:.0f}g

ALIMENTOS BASE (usa como referencia de porciones):
{food_context}

PLATILLO PRINCIPAL OBLIGATORIO para el {dia} (puedes ajustar guarniciones/acompañantes, pero la preparación base de cada tiempo fuerte DEBE ser esta, exactamente como está escrita, para garantizar variedad real en la semana):
- Desayuno: {platillo_desayuno or "libre — usa un platillo mexicano típico distinto a chilaquiles"}
- Comida: {platillo_comida or "libre — usa un platillo mexicano típico"}
- Cena: {platillo_cena or "libre — usa un platillo mexicano típico"}
{avoid_txt}

REGLAS:
1. Usa alimentos y platillos mexicanos auténticos, reales y variados — nunca inventes combinaciones que no existan en la gastronomía mexicana
2. El platillo principal de Desayuno, Comida y Cena DEBE ser el indicado arriba, tal cual — no lo cambies ni lo sustituyas por otro
3. Las colaciones (matutina/vespertina/nocturna) deben variar entre frutas, lácteos y frutos secos — evita repetir el mismo alimento de colación más de una vez en el día
4. Cada tiempo debe tener 3-6 alimentos específicos con gramos, realistas para la preparación
5. Los gramos y kcal deben ser nutricionalmente coherentes con el platillo real

Responde SOLO con JSON:
{{"dia":"{dia}","comidas":[
{tiempos_json}
],"macros":{{"proteina_g":{protein_g:.0f},"carb_g":{carbs_g:.0f},"gordura_g":{fats_g:.0f},"kcal_total":{get:.0f}}}}}"""

    last_error = None
    for attempt in range(2):
        text = call_claude_with_retry(prompt, api_key, retries=0)
        try:
            parsed = json.loads(text)
            _validate_day_json(parsed)
            return parsed
        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
    raise last_error

def _fallback_day(dia: str, protein_g: float, carbs_g: float, fats_g: float, get: float, error: str) -> dict:
    return {
        "dia": dia,
        "comidas": [],
        "macros": {"proteina_g": protein_g, "carb_g": carbs_g, "gordura_g": fats_g, "kcal_total": get},
        "error": error,
    }

def _prepare_context(plan_data: dict, audit_data: dict, db=None):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    goal = plan_data.get("goal", "maintenance")
    weight = plan_data.get("weight", 70)
    get = audit_data["energy_validation"]["get_planned"]
    protein_g = audit_data["totals"]["protein_g"]
    carbs_g = audit_data["totals"]["carbs_g"]
    fats_g = audit_data["totals"]["fats_g"]
    food_context = build_food_context(audit_data["smae_table"], goal)
    goal_es = {"cut": "pérdida de peso", "bulk": "ganancia muscular", "maintenance": "mantenimiento"}.get(goal, goal)
    dish_pools = _build_dish_pools(db)
    assigned = {
        tiempo: pick_weekly_dishes(dish_pools.get(tiempo, []), len(DIAS_SEMANA))
        for tiempo in ("Desayuno", "Comida", "Cena")
    }
    meal_distribution = plan_data.get("meal_distribution") or DEFAULT_MEAL_DISTRIBUTION
    return api_key, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, assigned, meal_distribution


def _run_day(idx: int, dia: str, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, api_key, assigned, meal_distribution) -> dict:
    try:
        return generate_day(
            dia, idx, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, api_key,
            platillo_desayuno=assigned["Desayuno"][idx],
            platillo_comida=assigned["Comida"][idx],
            platillo_cena=assigned["Cena"][idx],
            meal_distribution=meal_distribution,
        )
    except Exception as e:
        print(f"ERRO dia {dia}: {e}")
        return _fallback_day(dia, protein_g, carbs_g, fats_g, get, str(e))


def generate_ai_menu(plan_data: dict, audit_data: dict, db=None) -> dict:
    api_key, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, assigned, meal_distribution = _prepare_context(plan_data, audit_data, db)

    from concurrent.futures import ThreadPoolExecutor

    def run(idx_dia):
        idx, dia = idx_dia
        return _run_day(idx, dia, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, api_key, assigned, meal_distribution)

    with ThreadPoolExecutor(max_workers=len(DIAS_SEMANA)) as executor:
        semana = list(executor.map(run, enumerate(DIAS_SEMANA)))

    return {"semana": semana}


def generate_ai_menu_stream(plan_data: dict, audit_data: dict, db=None):
    """Gera os 7 dias em paralelo e cede (yield) cada um assim que fica pronto,
    para alimentar um endpoint SSE com progresso ao vivo no front."""
    api_key, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, assigned, meal_distribution = _prepare_context(plan_data, audit_data, db)

    from concurrent.futures import ThreadPoolExecutor, as_completed

    with ThreadPoolExecutor(max_workers=len(DIAS_SEMANA)) as executor:
        futures = {
            executor.submit(_run_day, idx, dia, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, api_key, assigned, meal_distribution): idx
            for idx, dia in enumerate(DIAS_SEMANA)
        }
        for future in as_completed(futures):
            idx = futures[future]
            day_data = future.result()
            yield idx, day_data


def regenerate_single_day(dia: str, plan_data: dict, audit_data: dict, db=None, avoid_dishes: list | None = None) -> dict:
    """Regenera o cardápio de um único dia (para o fluxo de 'regenerar dia' no front).
    `avoid_dishes` traz os platillos principais já usados nos outros dias da mesma
    semana, para não repetir exatamente o que já saiu no restante do plano."""
    if dia not in DIAS_SEMANA:
        raise ValueError(f"Dia inválido: {dia}")
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    goal = plan_data.get("goal", "maintenance")
    weight = plan_data.get("weight", 70)
    get = audit_data["energy_validation"]["get_planned"]
    protein_g = audit_data["totals"]["protein_g"]
    carbs_g = audit_data["totals"]["carbs_g"]
    fats_g = audit_data["totals"]["fats_g"]
    food_context = build_food_context(audit_data["smae_table"], goal)
    goal_es = {"cut": "pérdida de peso", "bulk": "ganancia muscular", "maintenance": "mantenimiento"}.get(goal, goal)
    meal_distribution = plan_data.get("meal_distribution") or DEFAULT_MEAL_DISTRIBUTION

    dish_pools = _build_dish_pools(db)
    avoid_set = set(avoid_dishes or [])

    def pick_fresh(tiempo):
        pool = [d for d in dish_pools.get(tiempo, []) if d not in avoid_set]
        if not pool:
            pool = dish_pools.get(tiempo, [])
        return random.choice(pool) if pool else None

    idx = DIAS_SEMANA.index(dia)
    try:
        return generate_day(
            dia, idx, goal_es, weight, get, protein_g, carbs_g, fats_g, food_context, api_key,
            platillo_desayuno=pick_fresh("Desayuno"),
            platillo_comida=pick_fresh("Comida"),
            platillo_cena=pick_fresh("Cena"),
            avoid_dishes=list(avoid_set) if avoid_set else None,
            meal_distribution=meal_distribution,
        )
    except Exception as e:
        return _fallback_day(dia, protein_g, carbs_g, fats_g, get, str(e))
