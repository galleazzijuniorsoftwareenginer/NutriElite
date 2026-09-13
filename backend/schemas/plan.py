from pydantic import BaseModel, field_validator, model_validator
from typing import Literal, Optional


class MealSlot(BaseModel):
    tiempo: str
    pct: float
    horario: Optional[str] = None


class MealDistributionRequest(BaseModel):
    items: list[MealSlot]

    @model_validator(mode="after")
    def pct_sums_close_to_100(self):
        total = sum(i.pct for i in self.items)
        if not (95 <= total <= 105):
            raise ValueError(f"Los porcentajes deben sumar ~100% (suman {total:.0f}%)")
        return self


class PlanConfigRequest(BaseModel):
    """Configuración del plan (idioma/región del menú IA + ingredientes que
    el paciente no puede/quiere comer) — aplicada tanto al generador con IA
    como a la selección del acervo de recetas."""
    idioma: Literal["es", "en", "pt"] = "es"
    region: str = "México"
    restricted_ingredients: list[str] = []

    @field_validator("restricted_ingredients")
    @classmethod
    def strip_empty(cls, v: list[str]) -> list[str]:
        return [s.strip() for s in v if s and s.strip()]


class MenuItemManual(BaseModel):
    alimento: str
    quantidade_g: float
    kcal: float


class MenuMealManual(BaseModel):
    tiempo: str
    kcal: float
    itens: list[MenuItemManual]


class MenuDayManual(BaseModel):
    dia: str
    comidas: list[MenuMealManual]
    macros: dict


class PlanRequest(BaseModel):
    patient_name: str
    patient_email: str
    patient_phone: str

    weight: float
    height: float
    age: int
    gender: Literal["male", "female"]
    activity_level: Literal[1.2, 1.375, 1.55, 1.725, 1.9]
    goal: Literal["cut", "maintenance", "bulk"]
    formula: Literal["mifflin", "harris", "schofield", "katch", "cunningham"]
    body_fat_percent: Optional[float] = None
    patient_id: Optional[int] = None
    use_eta: bool = True

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

    @model_validator(mode="after")
    def require_body_fat_for_lean_mass_formulas(self):
        if self.formula in ("katch", "cunningham"):
            if self.body_fat_percent is None:
                raise ValueError(f"La fórmula {self.formula} requiere el % de grasa corporal")
            if not (3 <= self.body_fat_percent <= 60):
                raise ValueError("El % de grasa corporal debe estar entre 3 y 60")
        return self
