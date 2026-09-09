from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AppointmentCreate(BaseModel):
    patient_id: int
    scheduled_at: datetime
    duration_minutes: int = 30
    notes: Optional[str] = ""


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None  # scheduled|completed|cancelled|no_show
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    user_id: int
    patient_id: int
    patient_name: Optional[str] = None
    scheduled_at: datetime
    duration_minutes: int
    status: str
    notes: Optional[str] = None
    reminder_sent: bool

    class Config:
        from_attributes = True
