from datetime import datetime

from pydantic import BaseModel


class FoodLogEntryCreate(BaseModel):
    tiempo_comida: str  # Desayuno|Colación|Comida|Cena|Otro
    descripcion: str


class FoodLogEntryResponse(BaseModel):
    id: int
    patient_id: int
    plan_id: int | None = None
    tiempo_comida: str
    descripcion: str
    created_at: datetime

    class Config:
        from_attributes = True
