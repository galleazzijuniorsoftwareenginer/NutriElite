from pydantic import BaseModel
from typing import Literal, Optional


class PlanPreferencesUpdate(BaseModel):
    default_formula: Literal["mifflin", "harris", "schofield"] = "mifflin"
    default_activity_level: float = 1.55
    default_goal: Literal["cut", "maintenance", "bulk"] = "cut"
    protein_pct: float = 25
    fat_pct: float = 20
    carb_pct: float = 55
    kcal_adjustment_cut: float = -300
    kcal_adjustment_bulk: float = 300


class PlanPreferencesResponse(PlanPreferencesUpdate):
    class Config:
        from_attributes = True
