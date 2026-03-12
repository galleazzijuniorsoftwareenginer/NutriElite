from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.smae_calculation_service import SMAECalculationService

router = APIRouter()

@router.get("/plans/{plan_id}/audit")
def audit_plan(plan_id: int, db: Session = Depends(get_db)):
    return SMAECalculationService.calculate(plan_id, db)
