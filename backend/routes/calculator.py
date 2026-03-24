from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import Plan, User
from backend.schemas.plan import PlanRequest

from backend.routes.auth import verify_token

from backend.services.plan_service import create_plan
from backend.services.plan_service import calculate_smae_portions
from backend.services.metabolic_service import calculate_tmb
from backend.services.pdf_service import generate_plan_pdf

from fastapi.responses import StreamingResponse

router = APIRouter()


# ---------- DATABASE SESSION ----------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- GENERATE AND SAVE PLAN ----------
@router.post("/plan")
def generate_plan(
    data: PlanRequest,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):

    username = token["sub"]

    db_user = db.query(User).filter(User.username == username).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    plan = create_plan(data, db, db_user.id)

    return {
        "plan_id": plan.id,
        "TMB": round(plan.tmb, 2),
        "GET": round(plan.get, 2),
        "Protein_g": round(plan.protein, 2),
        "Carbs_g": round(plan.carbs, 2),
        "Fats_g": round(plan.fats, 2)
    }

    # Pega o username do token
    username = token["sub"]

    # Busca usuário no banco
    db_user = db.query(User).filter(User.username == username).first()

    if not db_user:
        return {"error": "User not found"}

    # Chama o service para criar e salvar o plano
    plan = create_plan(data, db, db_user.id)

    return {
        "TMB": round(plan.tmb, 2),
        "GET": round(plan.get, 2),
        "Protein_g": round(plan.protein, 2),
        "Carbs_g": round(plan.carbs, 2),
        "Fats_g": round(plan.fats, 2)
    }

    tmb = calculate_tmb(
    weight,
    height,
    age,
    gender,
    data.formula
)

    # Macros
    protein = weight * 2
    fats = weight * 1
    carbs = (total_calories - (protein * 4 + fats * 9)) / 4

    # Get logged user
    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()

    # Save plan
    new_plan = Plan(
        weight=weight,
        height=height,
        age=age,
        gender=gender,
        activity_level=activity_level,
        goal=goal,
        tmb=tmb,
        get=total_calories,
        protein=protein,
        carbs=carbs,
        fats=fats,
        user_id=db_user.id
    )

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return {
        "TMB": round(tmb, 2),
        "GET": round(total_calories, 2),
        "Protein_g": round(protein, 2),
        "Carbs_g": round(carbs, 2),
        "Fats_g": round(fats, 2)
    }



# ---------- GET ALL PLANS ----------
@router.get("/plans")
def get_all_plans(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    goal: str = None
):
    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    query = db.query(Plan).filter(Plan.user_id == db_user.id)
    if goal:
        query = query.filter(Plan.goal == goal)
    plans = query.order_by(Plan.created_at.desc()).all()
    return [{
        "id": p.id,
        "patient_name": p.patient_name,
        "patient_id": p.patient_id,
        "goal": p.goal,
        "weight": p.weight,
        "height": p.height,
        "age": p.age,
        "tmb": round(p.tmb, 0),
        "get": round(p.get, 0),
        "created_at": str(p.created_at)[:10]
    } for p in plans]

# ---------- GET USER PLAN HISTORY ----------
@router.get("/plans/{plan_id}/pdf")
def export_plan_pdf(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    menu: str = None,
    perfil: str = None
):

    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()

    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    portions = calculate_smae_portions(db, plan)

    import json
    menu_data = None
    if menu:
        try:
            menu_data = json.loads(menu)
        except Exception:
            menu_data = None
    perfil_data = None
    if perfil:
        try:
            perfil_data = json.loads(perfil)
        except Exception:
            perfil_data = None
    pdf_buffer = generate_plan_pdf(plan, portions, menu_data, perfil_data)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=plan_{plan_id}.pdf"}
    )

# ---------- AI MENU GENERATION ----------
@router.post("/plans/{plan_id}/menu/ai")
def generate_ai_menu_endpoint(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):
    from backend.services.smae_calculation_service import SMAECalculationService
    from backend.services.ai_menu_service import generate_ai_menu

    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    audit = SMAECalculationService.calculate(plan_id, db)
    plan_data = {
        "goal": plan.goal,
        "weight": plan.weight,
        "get": plan.get
    }

    try:
        menu = generate_ai_menu(plan_data, audit)
        return menu
    except Exception as e:
        import traceback
        print("ERRO MENU AI:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao gerar menu: {str(e)}")


# ---------- AUDIT WITH CUSTOM MACROS ----------
@router.get("/plans/{plan_id}/audit")
def get_audit(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    protein_g: float = None,
    carbs_g: float = None,
    fats_g: float = None
):
    from backend.services.smae_calculation_service import SMAECalculationService
    import copy

    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    if protein_g is not None and carbs_g is not None and fats_g is not None:
        from backend.models import Plan as PlanModel
        override = PlanModel()
        override.__dict__.update({k: v for k, v in plan.__dict__.items() if not k.startswith('_')})
        override.protein = protein_g
        override.carbs = carbs_g
        override.fats = fats_g
        override.get = protein_g * 4 + carbs_g * 4 + fats_g * 9
        return SMAECalculationService.calculate(plan_id, db, override_plan=override)

    return SMAECalculationService.calculate(plan_id, db)

# ---------- GET PLAN BY ID ----------
@router.get("/plans/{plan_id}")
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):
    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return {
        "plan_id": plan.id,
        "TMB": round(plan.tmb, 2),
        "GET": round(plan.get, 2),
        "Protein_g": round(plan.protein, 2),
        "Carbs_g": round(plan.carbs, 2),
        "Fats_g": round(plan.fats, 2),
        "patient_name": plan.patient_name,
        "patient_email": plan.patient_email,
        "patient_phone": plan.patient_phone,
        "weight": plan.weight,
        "height": plan.height,
        "age": plan.age,
        "gender": plan.gender,
        "activity_level": plan.activity_level,
        "goal": plan.goal,
    }

# ---------- DELETE PLAN ----------
@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):
    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    from backend.models import PlanFoodGroup
    db.query(PlanFoodGroup).filter(PlanFoodGroup.plan_id == plan_id).delete()
    db.delete(plan)
    db.commit()
    return {"ok": True}
