from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
router = APIRouter()
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
import os
import logging

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"

if SECRET_KEY == "supersecretkey":
    logging.getLogger("uvicorn.error").warning(
        "JWT_SECRET_KEY não configurado — usando valor default inseguro. "
        "Defina a env var JWT_SECRET_KEY em produção."
    )

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserRegister(BaseModel):
    username: str
    password: str
    email: str = None
    role: str = "professional"  # professional|student

class UserLogin(BaseModel):
    username: str
    password: str

def hash_password(password: str):
    password = password[:72]
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_token_str(token: str) -> dict:
    """Mesma verificação de verify_token, mas para quando o token não vem no
    header Authorization (ex: EventSource de SSE, que não permite headers
    customizados e por isso manda o token via query string)."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.username == user.username).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    if user.role not in ("professional", "student"):
        raise HTTPException(status_code=400, detail="Rol inválido")

    hashed = hash_password(user.password)

    new_user = User(
        username=user.username,
        password=hashed,
        email=user.email,
        role=user.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if user.role == "student":
        from backend.services.student_service import seed_practice_patients
        seed_practice_patients(db, new_user.id)

    return {"message": "User created successfully"}

@router.get("/me")
def get_me(token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    first = bool(user.first_login)
    if first:
        user.first_login = 0
        db.commit()
    return {
        "username": user.username,
        "is_pro": bool(user.is_pro),
        "first_login": first,
        "role": user.role or "professional",
    }

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.username == user.username).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = create_token({"sub": db_user.username})

    return {"access_token": token}
  
