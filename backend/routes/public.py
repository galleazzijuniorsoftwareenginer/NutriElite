from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Plan
from backend.services.shopping_list_service import build_shopping_list

router = APIRouter(prefix="/public")

GOAL_LABEL = {"cut": "Pérdida de peso", "bulk": "Ganancia de masa", "maintenance": "Mantenimiento"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/plans/{public_token}")
def get_public_plan(public_token: str, db: Session = Depends(get_db)):
    """Vista pública del plan para el paciente — sin autenticación, sin datos
    clínicos ni de contacto. Solo lo necesario para seguir su cardápio."""
    plan = db.query(Plan).filter(Plan.public_token == public_token).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Enlace no válido o expirado")

    weekly_menu = plan.weekly_menu or {"semana": []}
    shopping_list = build_shopping_list(weekly_menu) if weekly_menu.get("semana") else []

    return {
        "patient_first_name": (plan.patient_name or "").split(" ")[0] or "Paciente",
        "goal_label": GOAL_LABEL.get(plan.goal, plan.goal),
        "get": round(plan.get, 0) if plan.get else None,
        "weekly_menu": weekly_menu,
        "shopping_list": shopping_list,
    }
