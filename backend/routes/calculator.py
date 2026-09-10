from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import Plan, User
from backend.schemas.plan import PlanRequest

from backend.routes.auth import verify_token, verify_token_str

from backend.services.plan_service import create_plan
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

    # Limite Free: 3 planos/semana
    from datetime import datetime
    if not db_user.is_pro:
        now = datetime.utcnow()
        week_key = now.strftime("%Y-W%W")
        if db_user.plans_month_reset != week_key:
            db_user.plans_this_month = 0
            db_user.plans_month_reset = week_key
            db.commit()
        if (db_user.plans_this_month or 0) >= 3:
            raise HTTPException(status_code=403, detail="LIMIT_REACHED")
        db_user.plans_this_month = (db_user.plans_this_month or 0) + 1
        db.commit()
    plan = create_plan(data, db, db_user.id)

    return {
        "plan_id": plan.id,
        "TMB": round(plan.tmb, 2),
        "GET": round(plan.get, 2),
        "Protein_g": round(plan.protein, 2),
        "Carbs_g": round(plan.carbs, 2),
        "Fats_g": round(plan.fats, 2)
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
        "tmb": round(p.tmb, 0) if p.tmb is not None else None,
        "get": round(p.get, 0) if p.get is not None else None,
        "created_at": str(p.created_at)[:10]
    } for p in plans]

# ---------- GET USER PLAN HISTORY ----------
@router.get("/plans/{plan_id}/pdf")
def export_plan_pdf(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    menu: str = None,
    perfil: str = None,
    protein_g: float = None,
    carbs_g: float = None,
    fats_g: float = None
):

    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()

    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    # Se o nutricionista ajustou os macros (%) na tela de auditoria, usa esses
    # valores no PDF em vez dos macros default salvos na criação do plano.
    pdf_plan = plan
    if protein_g is not None and carbs_g is not None and fats_g is not None:
        from backend.services.smae_calculation_service import build_override_plan
        pdf_plan = build_override_plan(plan, protein_g, carbs_g, fats_g)

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
    # Se não veio perfil na URL, busca do banco
    if not perfil_data:
        from backend.models import NutritionistProfile
        profile = db.query(NutritionistProfile).filter(
            NutritionistProfile.user_id == db_user.id
        ).first()
        if profile:
            perfil_data = {
                "nombre": profile.nombre,
                "cedula": profile.cedula,
                "especialidad": profile.especialidad,
                "clinica": profile.clinica,
                "telefono": profile.telefono,
                "email": profile.email,
                "logo": profile.logo_base64,
            }
    override_plan = pdf_plan if pdf_plan is not plan else None

    consultations = None
    patient_data = None
    if plan.patient_id:
        from backend.models import Consultation, Patient
        patient = db.query(Patient).filter(Patient.id == plan.patient_id).first()
        if patient:
            patient_data = {
                "emergency_contact_name": patient.emergency_contact_name,
                "emergency_contact_phone": patient.emergency_contact_phone,
                "emergency_contact_relation": patient.emergency_contact_relation,
                "blood_type": patient.blood_type,
                "activity_type": patient.activity_type,
            }
        rows = (
            db.query(Consultation)
            .filter(Consultation.patient_id == plan.patient_id, Consultation.peso.isnot(None))
            .order_by(Consultation.fecha.asc())
            .all()
        )
        if rows:
            consultations = [
                {
                    "fecha": r.fecha,
                    "peso": r.peso,
                    "grasa_corporal_pct": r.grasa_corporal_pct,
                    "grasa_corporal_metodo": r.grasa_corporal_metodo,
                }
                for r in rows
            ]

    pdf_buffer = generate_plan_pdf(plan, menu_data, perfil_data, override_plan=override_plan, consultations=consultations, patient_data=patient_data)

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
        menu = generate_ai_menu(plan_data, audit, db=db)
        plan.weekly_menu = menu
        db.commit()
        return menu
    except Exception as e:
        import traceback
        print("ERRO MENU AI:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao gerar menu: {str(e)}")


# ---------- REGENERATE SINGLE DAY OF AI MENU ----------
@router.post("/plans/{plan_id}/menu/ai/day/{dia}")
def regenerate_ai_menu_day(
    plan_id: int,
    dia: str,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):
    from backend.services.smae_calculation_service import SMAECalculationService
    from backend.services.ai_menu_service import regenerate_single_day

    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    audit = SMAECalculationService.calculate(plan_id, db)
    plan_data = {"goal": plan.goal, "weight": plan.weight, "get": plan.get}

    avoid_dishes = []
    if plan.weekly_menu:
        for d in plan.weekly_menu.get("semana", []):
            if d.get("dia") == dia:
                continue
            for c in d.get("comidas", []):
                if c.get("tiempo") in ("Desayuno", "Comida", "Cena") and c.get("itens"):
                    avoid_dishes.append(c["itens"][0].get("alimento"))

    try:
        day_data = regenerate_single_day(dia, plan_data, audit, db=db, avoid_dishes=avoid_dishes)
        if plan.weekly_menu:
            updated = dict(plan.weekly_menu)
            updated["semana"] = [day_data if d.get("dia") == dia else d for d in updated.get("semana", [])]
            plan.weekly_menu = updated
            db.commit()
        return day_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print("ERRO REGENERATE DAY:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao regenerar dia: {str(e)}")


# ---------- AI MENU GENERATION (SSE, progresso ao vivo dia-a-dia) ----------
@router.get("/plans/{plan_id}/menu/ai/stream")
def generate_ai_menu_stream_endpoint(
    plan_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    # EventSource não permite headers customizados, então o JWT vem via query
    # string aqui em vez do header Authorization usado pelos demais endpoints.
    payload = verify_token_str(token)
    username = payload["sub"]

    from backend.services.smae_calculation_service import SMAECalculationService
    from backend.services.ai_menu_service import generate_ai_menu_stream
    import json

    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(
        Plan.id == plan_id,
        Plan.user_id == db_user.id if db_user else False
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    audit = SMAECalculationService.calculate(plan_id, db)
    plan_data = {"goal": plan.goal, "weight": plan.weight, "get": plan.get}

    def event_source():
        collected: dict[int, dict] = {}
        try:
            for idx, day_data in generate_ai_menu_stream(plan_data, audit, db=db):
                collected[idx] = day_data
                msg = json.dumps({"idx": idx, "day": day_data})
                yield f"data: {msg}\n\n"
            plan.weekly_menu = {"semana": [collected[i] for i in sorted(collected.keys())]}
            db.commit()
            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            import traceback
            print("ERRO MENU AI STREAM:", traceback.format_exc())
            yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
        from backend.services.smae_calculation_service import build_override_plan
        override = build_override_plan(plan, protein_g, carbs_g, fats_g)
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
        "TMB": round(plan.tmb, 2) if plan.tmb is not None else None,
        "GET": round(plan.get, 2) if plan.get is not None else None,
        "Protein_g": round(plan.protein, 2) if plan.protein is not None else None,
        "Carbs_g": round(plan.carbs, 2) if plan.carbs is not None else None,
        "Fats_g": round(plan.fats, 2) if plan.fats is not None else None,
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
    # Decrementa contador do mês se o plano foi criado neste mês
    from datetime import datetime
    now = datetime.utcnow()
    month_key = now.strftime("%Y-%m")
    if db_user.plans_month_reset == month_key and (db_user.plans_this_month or 0) > 0:
        db_user.plans_this_month = db_user.plans_this_month - 1
    db.commit()
    return {"ok": True}

# ---------- PORTAL DO PACIENTE (link público) ----------
@router.post("/plans/{plan_id}/share")
def share_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):
    import secrets
    from backend.services.email_service import PUBLIC_BASE_URL

    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == db_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    if not plan.public_token:
        plan.public_token = secrets.token_urlsafe(16)
        db.commit()

    return {"public_token": plan.public_token, "url": f"{PUBLIC_BASE_URL}/app/portal/{plan.public_token}"}

# ---------- PLANTILLAS ----------
@router.post("/plans/{plan_id}/save-template")
def save_as_template(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    template_name: str = "Mi plantilla"
):
    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == db_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    plan.is_template = 1
    plan.template_name = template_name
    db.commit()
    return {"ok": True, "template_name": template_name}

@router.get("/templates")
def list_templates(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):
    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    templates = db.query(Plan).filter(
        Plan.user_id == db_user.id,
        Plan.is_template == 1
    ).order_by(Plan.created_at.desc()).all()
    return [{
        "id": p.id,
        "template_name": p.template_name,
        "goal": p.goal,
        "weight": p.weight,
        "get": round(p.get, 0),
        "protein": round(p.protein, 1),
        "carbs": round(p.carbs, 1),
        "fats": round(p.fats, 1),
        "created_at": str(p.created_at)[:10]
    } for p in templates]

@router.delete("/templates/{plan_id}")
def delete_template(
    plan_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token)
):
    username = token["sub"]
    db_user = db.query(User).filter(User.username == username).first()
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == db_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    plan.is_template = 0
    plan.template_name = None
    db.commit()
    return {"ok": True}
