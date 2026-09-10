from fastapi import FastAPI
from fastapi.responses import FileResponse
from backend.routes.calculator import router as calculator_router
from backend.routes.auth import router as auth_router
from backend.routes.food import router as food_router
from backend.routes.patients import router as patients_router
from backend.routes.profile import router as profile_router
from backend.routes.stripe_routes import router as stripe_router
from backend.routes.password_reset import router as password_router
from backend.routes.clinical import router as clinical_router
from backend.routes.appointments import router as appointments_router
from backend.routes.recipes import router as recipes_router
from backend.routes.public import router as public_router
from backend.routes.reference import router as reference_router
from backend.routes.classroom import router as classroom_router
from backend.routes.pathology_templates import router as pathology_templates_router
from backend.routes.preferences import router as preferences_router
from backend.scripts.seed_pathology_templates import seed_pathology_templates
from backend.scripts.seed_recipes import seed_recipes
from backend.routes import smae
from backend.database import engine
from backend.models import Base
from backend.scripts.seed_smae import seed, seed_default_user
import os

app = FastAPI()

Base.metadata.create_all(bind=engine)

# Migration automática para bancos Postgres já existentes em produção, cujo schema
# foi criado antes dessas colunas existirem nos models (Base.metadata.create_all não
# altera tabelas já existentes, só cria as que faltam). Em SQLite local o
# create_all acima já cria o schema completo e atualizado — "ADD COLUMN IF NOT
# EXISTS" não é sintaxe válida no SQLite, então esse bloco roda só no Postgres.
from sqlalchemy import text
if engine.dialect.name == "postgresql":
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE plans ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id)
        """))
        conn.execute(text("""
            ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_template INTEGER DEFAULT 0
        """))
        conn.execute(text("""
            ALTER TABLE plans ADD COLUMN IF NOT EXISTS template_name VARCHAR
        """))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_login INTEGER DEFAULT 1"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS plans_this_month INTEGER DEFAULT 0"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS plans_month_reset VARCHAR"))
        conn.execute(text("ALTER TABLE plans ADD COLUMN IF NOT EXISTS weekly_menu JSON"))
        conn.execute(text("ALTER TABLE plans ADD COLUMN IF NOT EXISTS public_token VARCHAR"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_plans_public_token ON plans (public_token)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'professional'"))
        conn.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS categoria_tags JSON"))
        conn.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS imagen_url VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'activo'"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS notas_generales TEXT"))
        conn.execute(text("ALTER TABLE plans ADD COLUMN IF NOT EXISTS body_fat_percent FLOAT"))
        conn.execute(text("ALTER TABLE plans ADD COLUMN IF NOT EXISTS formula VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS activity_type VARCHAR"))
        conn.execute(text("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pliegue_pecho FLOAT"))
        conn.execute(text("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pliegue_abdominal FLOAT"))
        conn.execute(text("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pliegue_triceps FLOAT"))
        conn.execute(text("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pliegue_suprailiaco FLOAT"))
        conn.execute(text("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pliegue_muslo FLOAT"))
        conn.execute(text("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS grasa_corporal_pct FLOAT"))
        conn.execute(text("ALTER TABLE consultations ADD COLUMN IF NOT EXISTS grasa_corporal_metodo VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS activity_category VARCHAR"))
        conn.execute(text("ALTER TABLE plans ADD COLUMN IF NOT EXISTS meal_distribution JSON"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS etiquetas JSON"))
        conn.execute(text("ALTER TABLE plans ADD COLUMN IF NOT EXISTS portal_last_accessed_at TIMESTAMPTZ"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS timezone VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS country VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS address VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS residence_place VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS education_level VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR"))
        conn.execute(text("ALTER TABLE patients ADD COLUMN IF NOT EXISTS children_count INTEGER"))
        conn.commit()

seed()
seed_default_user()
seed_recipes()
seed_pathology_templates()

app.include_router(calculator_router)
app.include_router(auth_router)
app.include_router(food_router)
app.include_router(smae.router)
app.include_router(patients_router)
app.include_router(profile_router)
app.include_router(stripe_router)
app.include_router(password_router)
app.include_router(clinical_router)
app.include_router(appointments_router)
app.include_router(recipes_router)
app.include_router(public_router)
app.include_router(reference_router)
app.include_router(classroom_router)
app.include_router(pathology_templates_router)
app.include_router(preferences_router)

@app.get("/app")
@app.get("/app/")
async def serve_app_root():
    response = FileResponse("backend/static/app/index.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/app/{full_path:path}")
async def serve_app(full_path: str):
    file_path = f"backend/static/app/{full_path}"
    if not os.path.exists(file_path):
        file_path = "backend/static/app/index.html"
    response = FileResponse(file_path)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/")
def root():
    return {"message": "NutriElite CLEAN RUNNING"}
