from pydantic import BaseModel, field_validator
from typing import Literal, Optional


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
    patient_id: Optional[int] = None

    @field_validator("height")
    @classmethod
    def height_in_cm(cls, v: float) -> float:
        # Error común: escribir la altura en metros (ej. 1.65) en un campo
        # que espera centímetros — se detecta y convierte automáticamente
        # en vez de producir un IMC absurdo (peso / (1.65/100)^2).
        if 0.5 <= v <= 3:
            v = v * 100
        if not (40 <= v <= 250):
            raise ValueError("La altura debe estar en centímetros (ej. 165), entre 40 y 250 cm")
        return v
