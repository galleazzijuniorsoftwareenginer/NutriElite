"""Shared cascade-cleanup helpers for deleting a single Patient or Plan.

Rows tied to the deleted resource via a non-nullable FK (they're meaningless
without it) are hard-deleted. Rows that merely *reference* it via a nullable
FK keep their own real clinical data, so the reference is detached (set to
NULL) instead of deleting the row.
"""
from sqlalchemy.orm import Session


def delete_patient_dependents(db: Session, patient_id: int) -> None:
    from backend.models import Appointment, ClinicalRecord, Consultation, FoodLogEntry, Plan, RenalAssessment

    db.query(RenalAssessment).filter(RenalAssessment.patient_id == patient_id).delete(synchronize_session=False)
    db.query(Consultation).filter(Consultation.patient_id == patient_id).delete(synchronize_session=False)
    db.query(ClinicalRecord).filter(ClinicalRecord.patient_id == patient_id).delete(synchronize_session=False)
    db.query(Appointment).filter(Appointment.patient_id == patient_id).delete(synchronize_session=False)
    db.query(FoodLogEntry).filter(FoodLogEntry.patient_id == patient_id).delete(synchronize_session=False)
    db.query(Plan).filter(Plan.patient_id == patient_id).update({Plan.patient_id: None}, synchronize_session=False)


def delete_plan_dependents(db: Session, plan_id: int) -> None:
    from backend.models import Consultation, FoodLogEntry, PlanFoodGroup

    db.query(PlanFoodGroup).filter(PlanFoodGroup.plan_id == plan_id).delete(synchronize_session=False)
    db.query(Consultation).filter(Consultation.plan_id == plan_id).update({Consultation.plan_id: None}, synchronize_session=False)
    db.query(FoodLogEntry).filter(FoodLogEntry.plan_id == plan_id).update({FoodLogEntry.plan_id: None}, synchronize_session=False)
