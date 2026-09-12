from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import FoodGroup
from backend.routes.auth import verify_token

router = APIRouter()

# ---------- DATABASE SESSION ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- GET ALL FOOD GROUPS ----------
@router.get("/food-groups")
def get_food_groups(db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    foods = db.query(FoodGroup).all()
    return foods
