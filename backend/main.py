from fastapi import FastAPI
from fastapi.responses import FileResponse
from backend.routes.calculator import router as calculator_router
from backend.routes.auth import router as auth_router
from backend.routes.food import router as food_router
from backend.routes.patients import router as patients_router
from backend.routes import smae
from backend.database import engine
from backend.models import Base
from backend.scripts.seed_smae import seed, seed_default_user
import os

app = FastAPI()

Base.metadata.create_all(bind=engine)

# Migration automática
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            name VARCHAR,
            email VARCHAR,
            phone VARCHAR,
            user_id INTEGER REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """))
    conn.execute(text("""
        ALTER TABLE plans ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id)
    """))
    conn.commit()

seed()
seed_default_user()

app.include_router(calculator_router)
app.include_router(auth_router)
app.include_router(food_router)
app.include_router(smae.router)
app.include_router(patients_router)

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
