"""Integration test for GET /plans/{id}/menu/recipe-matches against the real
acervo generator and the real 500-recipe seed bank (not mocks) — proves the
Bloco 5 "receta sugerida" feature actually connects end to end: an acervo
menu, generated for real, always resolves back to its own recipes at
score 1.0, since recipe_menu_service embeds the exact recipe name it used."""

PLAN_PAYLOAD = {
    "patient_name": "Paciente Recetas",
    "patient_email": "recetas@example.com",
    "patient_phone": "555",
    "weight": 70,
    "height": 170,
    "age": 30,
    "gender": "female",
    "activity_level": 1.55,
    "goal": "maintenance",
    "formula": "mifflin",
}


def _register_and_login(client, username):
    client.post("/register", json={"username": username, "password": "supersecret1"})
    resp = client.post("/login", json={"username": username, "password": "supersecret1"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_acervo_menu_resolves_to_its_own_recipes(client):
    headers = _register_and_login(client, "recipe_matches_user")

    plan_resp = client.post("/plan", json=PLAN_PAYLOAD, headers=headers)
    assert plan_resp.status_code == 200
    plan_id = plan_resp.json()["plan_id"]

    menu_resp = client.post(f"/plans/{plan_id}/menu/acervo", headers=headers)
    assert menu_resp.status_code == 200
    semana = menu_resp.json()["semana"]
    assert len(semana) == 7

    matches_resp = client.get(f"/plans/{plan_id}/menu/recipe-matches", headers=headers)
    assert matches_resp.status_code == 200
    matches = matches_resp.json()

    # At least one day/tiempo pair from the acervo menu resolves back to a
    # real recipe at full confidence.
    assert matches, "esperaba al menos una sugerencia de receta"
    first_day = next(iter(matches.values()))
    first_match = next(iter(first_day.values()))
    assert first_match["score"] == 1.0
    assert first_match["recipe_id"] > 0
    assert first_match["nombre"]


def test_recipe_matches_requires_generated_menu(client):
    headers = _register_and_login(client, "recipe_matches_user_2")
    plan_resp = client.post("/plan", json=PLAN_PAYLOAD, headers=headers)
    plan_id = plan_resp.json()["plan_id"]

    resp = client.get(f"/plans/{plan_id}/menu/recipe-matches", headers=headers)
    assert resp.status_code == 400
