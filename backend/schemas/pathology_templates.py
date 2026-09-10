from pydantic import BaseModel
from typing import Optional


class PathologyTemplateSummary(BaseModel):
    id: int
    nombre: str
    categoria: str
    kcal_objetivo: float
    descripcion: Optional[str] = None
    tiempos_por_dia: int
    imagen_url: Optional[str] = None
    total_recetas: int

    class Config:
        from_attributes = True


class PathologyTemplateDetail(BaseModel):
    id: int
    nombre: str
    categoria: str
    kcal_objetivo: float
    descripcion: Optional[str] = None
    tiempos_por_dia: int
    imagen_url: Optional[str] = None
    weekly_menu: dict

    class Config:
        from_attributes = True


class AssignTemplateRequest(BaseModel):
    patient_id: int
