from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Recipe, User
from backend.routes.auth import verify_token
from backend.schemas.recipes import RecipeCreate, RecipeResponse, ShoppingListRequest
from backend.services.shopping_list_service import build_shopping_list

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/recipes", response_model=list[RecipeResponse])
def list_recipes(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_token),
    tiempo_comida: str = None,
    goal: str = None,
    search: str = None,
):
    user = db.query(User).filter(User.username == token["sub"]).first()
    query = db.query(Recipe).filter(or_(Recipe.created_by.is_(None), Recipe.created_by == user.id))
    if tiempo_comida:
        query = query.filter(Recipe.tiempo_comida == tiempo_comida)
    if search:
        query = query.filter(Recipe.nombre.ilike(f"%{search}%"))
    recipes = query.order_by(Recipe.nombre.asc()).all()
    if goal:
        recipes = [r for r in recipes if not r.goal_tags or goal in r.goal_tags]
    return recipes


@router.post("/recipes", response_model=RecipeResponse)
def create_recipe(data: RecipeCreate, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    recipe = Recipe(
        created_by=user.id,
        nombre=data.nombre,
        tiempo_comida=data.tiempo_comida,
        goal_tags=data.goal_tags,
        ingredientes=[i.model_dump() for i in data.ingredientes],
        instrucciones=data.instrucciones,
        kcal_aprox=data.kcal_aprox,
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db), token: dict = Depends(verify_token)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id, Recipe.created_by == user.id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta não encontrada (só é possível eliminar receitas próprias)")
    db.delete(recipe)
    db.commit()
    return {"ok": True}


@router.post("/shopping-list")
def generate_shopping_list(data: ShoppingListRequest, token: dict = Depends(verify_token)):
    return {"items": build_shopping_list(data.model_dump())}
