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


# ---------- GET USER PLAN HISTORY ----------
@router.get("/plans/{plan_id}/pdf")
def export_plan_pdf(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    menu: str = None
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
    pdf_buffer = generate_plan_pdf(plan, portions, menu_data)

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
