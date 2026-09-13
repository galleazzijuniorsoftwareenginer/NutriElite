from datetime import datetime

import pytest

from backend.models import Appointment, Consultation, FoodLogEntry, Plan, PlanFoodGroup, RenalAssessment
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


def _create_plan(client, headers, patient_id):
    payload = {**PLAN_PAYLOAD, "patient_id": patient_id}
    resp = client.post("/plan", json=payload, headers=headers)
    assert resp.status_code == 200
    return resp.json()["plan_id"]


def test_delete_patient_detaches_plan_and_hard_deletes_clinical_history(client, db):
    headers = _register_and_login(client, "cascade_patient_owner")
    patient_id = _create_patient(client, headers, "Paciente con historial")
    plan_id = _create_plan(client, headers, patient_id)

    db.add(Consultation(patient_id=patient_id, plan_id=plan_id, motivo_consulta="control"))
    db.add(Appointment(user_id=1, patient_id=patient_id, scheduled_at=datetime(2026, 1, 1, 10, 0, 0)))
    db.add(
        RenalAssessment(
            patient_id=patient_id,
            ckd_stage="3a",
            dialysis_modality="none",
            weight=70,
            kcal_per_kg=30,
            kcal_total=2100,
            protein_g_per_kg=0.8,
            protein_g_total=56,
            sodium_mg=2000,
            potassium_mg=2500,
            phosphorus_mg=900,
        )
    )
    db.add(FoodLogEntry(patient_id=patient_id, plan_id=plan_id, tiempo_comida="Desayuno", descripcion="avena"))
    db.commit()

    resp = client.delete(f"/patients/{patient_id}", headers=headers)
    assert resp.status_code == 200

    assert db.query(Consultation).filter(Consultation.patient_id == patient_id).count() == 0
    assert db.query(Appointment).filter(Appointment.patient_id == patient_id).count() == 0
    assert db.query(RenalAssessment).filter(RenalAssessment.patient_id == patient_id).count() == 0
    assert db.query(FoodLogEntry).filter(FoodLogEntry.patient_id == patient_id).count() == 0

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    assert plan is not None
    assert plan.patient_id is None


def test_delete_plan_detaches_consultation_and_food_log_but_deletes_food_groups(client, db):
    headers = _register_and_login(client, "cascade_plan_owner")
    patient_id = _create_patient(client, headers, "Paciente con plan")
    plan_id = _create_plan(client, headers, patient_id)

    assert db.query(PlanFoodGroup).filter(PlanFoodGroup.plan_id == plan_id).count() > 0

    db.add(Consultation(patient_id=patient_id, plan_id=plan_id, motivo_consulta="seguimiento"))
    db.add(FoodLogEntry(patient_id=patient_id, plan_id=plan_id, tiempo_comida="Comida", descripcion="pollo"))
    db.commit()

    resp = client.delete(f"/plans/{plan_id}", headers=headers)
    assert resp.status_code == 200

    assert db.query(PlanFoodGroup).filter(PlanFoodGroup.plan_id == plan_id).count() == 0

    consultation = db.query(Consultation).filter(Consultation.patient_id == patient_id).first()
    assert consultation is not None
    assert consultation.plan_id is None

    entry = db.query(FoodLogEntry).filter(FoodLogEntry.patient_id == patient_id).first()
    assert entry is not None
    assert entry.plan_id is None
