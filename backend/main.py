from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.routes.calculator import router as calculator_router
from backend.routes.auth import router as auth_router
from backend.routes.food import router as food_router
from backend.routes import smae
from backend.database import engine
from backend.models import Base
from backend.scripts.seed_smae import seed

app = FastAPI()

app.mount("/app", StaticFiles(directory="backend/static/app", html=True), name="app")

Base.metadata.create_all(bind=engine)
seed()

app.include_router(calculator_router)
app.include_router(auth_router)
app.include_router(food_router)
app.include_router(smae.router)

@app.get("/")
def root():
    return {"message": "NutriElite CLEAN RUNNING"}
