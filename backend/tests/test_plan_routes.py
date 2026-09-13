import pytest

from backend.services.rate_limit import _attempts


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    _attempts.clear()
    yield
    _attempts.clear()


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


def _register_and_login(client, username):
    client.post("/register", json={"username": username, "password": "supersecret1"})
    resp = client.post("/login", json={"username": username, "password": "supersecret1"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_patient(client, headers, name):
    resp = client.post("/patients", json={"name": name, "email": "", "phone": ""}, headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_cannot_link_a_plan_to_another_users_patient(client):
    # Regresión HTTP del bug: crear un plan con el patient_id de otro
    # nutricionista debía devolver 404, no aceptarlo en silencio.
    owner_headers = _register_and_login(client, "plan_owner_a")
    attacker_headers = _register_and_login(client, "plan_attacker_b")
    victim_patient_id = _create_patient(client, owner_headers, "Paciente de owner_a")

    payload = {**PLAN_PAYLOAD, "patient_id": victim_patient_id}
    resp = client.post("/plan", json=payload, headers=attacker_headers)
    assert resp.status_code == 404


def test_can_link_a_plan_to_own_patient(client):
    headers = _register_and_login(client, "plan_owner_c")
    patient_id = _create_patient(client, headers, "Paciente propio")

    payload = {**PLAN_PAYLOAD, "patient_id": patient_id}
    resp = client.post("/plan", json=payload, headers=headers)
    assert resp.status_code == 200

    pdf_resp = client.get(f"/plans/{resp.json()['plan_id']}/pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"


def test_get_plan_returns_the_formula_actually_used(client):
    headers = _register_and_login(client, "plan_owner_formula")
    patient_id = _create_patient(client, headers, "Paciente formula")

    payload = {**PLAN_PAYLOAD, "patient_id": patient_id, "formula": "harris"}
    resp = client.post("/plan", json=payload, headers=headers)
    assert resp.status_code == 200

    detail = client.get(f"/plans/{resp.json()['plan_id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["formula"] == "harris"


def test_get_plan_returns_use_eta_setting(client):
    headers = _register_and_login(client, "plan_owner_eta")
    patient_id = _create_patient(client, headers, "Paciente eta")

    payload = {**PLAN_PAYLOAD, "patient_id": patient_id, "use_eta": False}
    resp = client.post("/plan", json=payload, headers=headers)
    assert resp.status_code == 200

    detail = client.get(f"/plans/{resp.json()['plan_id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["use_eta"] is False


def test_plan_rejects_invalid_gender_goal_and_activity_level(client):
    headers = _register_and_login(client, "plan_owner_enum")
    patient_id = _create_patient(client, headers, "Paciente enum")

    for field, bad_value in [("gender", "other"), ("goal", "shred"), ("activity_level", 3.5)]:
        payload = {**PLAN_PAYLOAD, "patient_id": patient_id, field: bad_value}
        resp = client.post("/plan", json=payload, headers=headers)
        assert resp.status_code == 422, f"{field}={bad_value!r} debería ser rechazado"


def test_delete_account_cascades_patient_data(client, db):
    from backend.models import Appointment, ClinicalRecord, Patient, User

    headers = _register_and_login(client, "delete_me_user")
    patient_id = _create_patient(client, headers, "Paciente a borrar")
    client.put(f"/patients/{patient_id}/clinical-record", json={"alergias": "ninguna"}, headers=headers)

    resp = client.request("DELETE", "/account", json={"password": "supersecret1"}, headers=headers)
    assert resp.status_code == 200

    assert db.query(User).filter(User.username == "delete_me_user").first() is None
    assert db.query(Patient).filter(Patient.id == patient_id).first() is None
    assert db.query(ClinicalRecord).filter(ClinicalRecord.patient_id == patient_id).first() is None
