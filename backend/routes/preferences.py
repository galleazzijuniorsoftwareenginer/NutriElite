from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import PlanPreferences, User
from backend.routes.auth import verify_token
from backend.schemas.preferences import PlanPreferencesResponse, PlanPreferencesUpdate

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/plan-preferences", response_model=PlanPreferencesResponse)
def get_plan_preferences(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    prefs = db.query(PlanPreferences).filter(PlanPreferences.user_id == user.id).first()
    if not prefs:
        return PlanPreferencesResponse()
    return prefs


@router.put("/plan-preferences", response_model=PlanPreferencesResponse)
def update_plan_preferences(
    data: PlanPreferencesUpdate,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    user = db.query(User).filter(User.username == token["sub"]).first()
    prefs = db.query(PlanPreferences).filter(PlanPreferences.user_id == user.id).first()
    if not prefs:
        prefs = PlanPreferences(user_id=user.id)
        db.add(prefs)
    for field, value in data.model_dump().items():
        setattr(prefs, field, value)
    db.commit()
    db.refresh(prefs)
    return prefs
