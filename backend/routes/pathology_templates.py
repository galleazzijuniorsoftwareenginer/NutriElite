from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import PathologyTemplate, Patient, Plan, PlanFoodGroup, User
from backend.routes.auth import verify_token
from backend.schemas.pathology_templates import (
    PathologyTemplateSummary,
    PathologyTemplateDetail,
    AssignTemplateRequest,
)
from backend.services.plan_service import calculate_smae_portions

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/pathology-templates", response_model=list[PathologyTemplateSummary])
def list_pathology_templates(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    categoria: str = None,
    kcal_min: float = None,
    kcal_max: float = None,
):
    query = db.query(PathologyTemplate).filter(PathologyTemplate.activo == 1)
    if categoria:
        query = query.filter(PathologyTemplate.categoria == categoria)
    if kcal_min is not None:
        query = query.filter(PathologyTemplate.kcal_objetivo >= kcal_min)
    if kcal_max is not None:
        query = query.filter(PathologyTemplate.kcal_objetivo <= kcal_max)
    templates = query.order_by(PathologyTemplate.categoria.asc(), PathologyTemplate.kcal_objetivo.asc()).all()
    return [
        PathologyTemplateSummary(
            id=t.id,
            nombre=t.nombre,
            categoria=t.categoria,
            kcal_objetivo=t.kcal_objetivo,
            descripcion=t.descripcion,
            tiempos_por_dia=t.tiempos_por_dia,
            imagen_url=t.imagen_url,
            total_recetas=sum(len(c.get("itens", [])) for d in t.weekly_menu.get("semana", []) for c in d.get("comidas", [])),
        )
        for t in templates
    ]


@router.get("/pathology-templates/{template_id}", response_model=PathologyTemplateDetail)
def get_pathology_template(template_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    template = db.query(PathologyTemplate).filter(PathologyTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return template


@router.post("/pathology-templates/{template_id}/assign")
def assign_pathology_template(
    template_id: int,
    data: AssignTemplateRequest,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
):
    user = db.query(User).filter(User.username == token["sub"]).first()
    template = db.query(PathologyTemplate).filter(PathologyTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    patient = db.query(Patient).filter(Patient.id == data.patient_id, Patient.user_id == user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    total_calories = template.kcal_objetivo
    protein = round((total_calories * 25 / 100) / 4, 1)
    fats = round((total_calories * 20 / 100) / 9, 1)
    carbs = round((total_calories * 55 / 100) / 4, 1)

    plan = Plan(
        patient_name=patient.name,
        patient_email=patient.email,
        patient_phone=patient.phone,
        goal="maintenance",
        get=total_calories,
        protein=protein,
        carbs=carbs,
        fats=fats,
        weekly_menu=template.weekly_menu,
        user_id=user.id,
        patient_id=patient.id,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    for item in calculate_smae_portions(db, plan):
        from backend.models import FoodGroup

        food_query = db.query(FoodGroup).filter(FoodGroup.group_name == item["group"])
        food_query = (
            food_query.filter(FoodGroup.subgroup_name.is_(None))
            if item["subgroup"] is None
            else food_query.filter(FoodGroup.subgroup_name == item["subgroup"])
        )
        food = food_query.first()
        if food:
            db.add(PlanFoodGroup(plan_id=plan.id, food_group_id=food.id, portions=item["portions"]))
    db.commit()

    return {"plan_id": plan.id}
