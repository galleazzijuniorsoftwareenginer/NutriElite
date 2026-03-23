from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.routes.calculator import router as calculator_router
from backend.routes.auth import router as auth_router
from backend.routes.food import router as food_router
from backend.routes import smae
from backend.database import engine
from backend.models import Base
from backend.scripts.seed_smae import seed, seed_default_user

app = FastAPI()

from fastapi.staticfiles import StaticFiles
from fastapi import Response
from fastapi.responses import FileResponse
import os

@app.get("/app/{full_path:path}")
async def serve_app(full_path: str):
    file_path = f"backend/static/app/{full_path or 'index.html'}"
    if not full_path or not os.path.exists(file_path):
        file_path = "backend/static/app/index.html"
    response = FileResponse(file_path)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

Base.metadata.create_all(bind=engine)
seed()
seed_default_user()

app.include_router(calculator_router)
app.include_router(auth_router)
app.include_router(food_router)
app.include_router(smae.router)

@app.get("/")
def root():
    return {"message": "NutriElite CLEAN RUNNING"}
