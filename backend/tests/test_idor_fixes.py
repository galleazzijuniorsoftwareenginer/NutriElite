import pytest

from backend.services.rate_limit import _attempts


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    _attempts.clear()
    yield
    _attempts.clear()


def _register_and_login(client, username):
    client.post("/register", json={"username": username, "password": "supersecret1"})
    resp = client.post("/login", json={"username": username, "password": "supersecret1"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_patient(client, headers, name):
    resp = client.post("/patients", json={"name": name, "email": "", "phone": ""}, headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


RECIPE_PAYLOAD = {
    "nombre": "Receta privada",
    "tiempo_comida": "Desayuno",
    "ingredientes": [{"alimento": "Avena", "cantidad_g": 40}],
}

PLAN_PAYLOAD = {
    "patient_name": "x",
    "patient_email": "x@x.com",
    "patient_phone": "555",
    "weight": 70,
    "height": 170,
    "age": 30,
    "gender": "female",
    "activity_level": 1.55,
    "goal": "maintenance",
    "formula": "mifflin",
}


def test_cannot_favorite_another_users_private_recipe(client):
    owner_headers = _register_and_login(client, "recipe_owner")
    attacker_headers = _register_and_login(client, "recipe_attacker")

    resp = client.post("/recipes", json=RECIPE_PAYLOAD, headers=owner_headers)
    assert resp.status_code == 200
    recipe_id = resp.json()["id"]

    fav_resp = client.post(f"/recipes/{recipe_id}/favorite", headers=attacker_headers)
    assert fav_resp.status_code == 404


def test_can_favorite_own_recipe(client):
    headers = _register_and_login(client, "recipe_owner_2")
    resp = client.post("/recipes", json=RECIPE_PAYLOAD, headers=headers)
    recipe_id = resp.json()["id"]

    fav_resp = client.post(f"/recipes/{recipe_id}/favorite", headers=headers)
    assert fav_resp.status_code == 200
    assert fav_resp.json()["favorito"] is True


def test_cannot_fetch_another_users_private_recipe_by_id(client):
    owner_headers = _register_and_login(client, "recipe_owner_3")
    attacker_headers = _register_and_login(client, "recipe_attacker_3")

    resp = client.post("/recipes", json=RECIPE_PAYLOAD, headers=owner_headers)
    recipe_id = resp.json()["id"]

    get_resp = client.get(f"/recipes/{recipe_id}", headers=attacker_headers)
    assert get_resp.status_code == 404


def test_can_fetch_own_recipe_by_id(client):
    headers = _register_and_login(client, "recipe_owner_4")
    resp = client.post("/recipes", json=RECIPE_PAYLOAD, headers=headers)
    recipe_id = resp.json()["id"]

    get_resp = client.get(f"/recipes/{recipe_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["nombre"] == "Receta privada"


def test_cannot_link_consultation_to_another_users_plan(client):
    victim_headers = _register_and_login(client, "consult_victim")
    victim_patient_id = _create_patient(client, victim_headers, "Paciente de victim")
    plan_resp = client.post(
        "/plan", json={**PLAN_PAYLOAD, "patient_id": victim_patient_id}, headers=victim_headers
    )
    assert plan_resp.status_code == 200
    victim_plan_id = plan_resp.json()["plan_id"]

    attacker_headers = _register_and_login(client, "consult_attacker")
    attacker_patient_id = _create_patient(client, attacker_headers, "Paciente de attacker")

    resp = client.post(
        f"/patients/{attacker_patient_id}/consultations",
        json={"plan_id": victim_plan_id},
        headers=attacker_headers,
    )
    assert resp.status_code == 404


def test_can_link_consultation_to_own_plan(client):
    headers = _register_and_login(client, "consult_owner")
    patient_id = _create_patient(client, headers, "Paciente propio")
    plan_resp = client.post("/plan", json={**PLAN_PAYLOAD, "patient_id": patient_id}, headers=headers)
    plan_id = plan_resp.json()["plan_id"]

    resp = client.post(
        f"/patients/{patient_id}/consultations",
        json={"plan_id": plan_id},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["plan_id"] == plan_id
