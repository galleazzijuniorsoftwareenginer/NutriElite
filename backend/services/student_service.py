"""Datos de práctica para cuentas de estudiante — pacientes ficticios, claramente
marcados, para practicar cálculo de TMB/GET/SMAE sin ningún riesgo clínico real."""

from backend.models import Patient

PRACTICE_PATIENTS = [
    {"name": "[Práctica] Ana López — adulto, pérdida de peso", "email": "", "phone": ""},
    {"name": "[Práctica] Carlos Ruiz — adulto, ganancia de masa", "email": "", "phone": ""},
    {"name": "[Práctica] María Torres — adulto mayor, mantenimiento", "email": "", "phone": ""},
]


def seed_practice_patients(db, user_id: int):
    for item in PRACTICE_PATIENTS:
        db.add(Patient(user_id=user_id, **item))
    db.commit()
