from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClassroomCreate(BaseModel):
    nombre: str


class ClassroomResponse(BaseModel):
    id: int
    professor_user_id: int
    nombre: str
    codigo_acceso: str
    total_estudiantes: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class JoinClassroomRequest(BaseModel):
    codigo_acceso: str


class StudentSummary(BaseModel):
    user_id: int
    username: str
    joined_at: datetime
    total_pacientes: int = 0
    total_planes: int = 0


class StudentPatientPlan(BaseModel):
    id: int
    goal: str
    weight: float
    get: float
    tmb: float
    created_at: str


class StudentPatientSummary(BaseModel):
    id: int
    name: str
    plans: list[StudentPatientPlan] = []
