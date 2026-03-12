from pydantic import BaseModel
from typing import Literal


class PlanRequest(BaseModel):
    patient_name: str
    patient_email: str
    patient_phone: str

    weight: float
    height: float
    age: int
    gender: str
    activity_level: float
    goal: str
    formula: Literal["mifflin", "harris", "schofield"]
