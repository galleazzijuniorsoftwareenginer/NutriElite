from pydantic import BaseModel
from typing import Optional, List


class Ingredient(BaseModel):
    alimento: str
    cantidad_g: float


class RecipeCreate(BaseModel):
    nombre: str
    tiempo_comida: str  # Desayuno|Colación|Comida|Cena
    goal_tags: Optional[List[str]] = []
    ingredientes: List[Ingredient]
    instrucciones: Optional[str] = ""
    kcal_aprox: Optional[float] = None


class RecipeResponse(RecipeCreate):
    id: int
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class ShoppingListRequest(BaseModel):
    semana: list
