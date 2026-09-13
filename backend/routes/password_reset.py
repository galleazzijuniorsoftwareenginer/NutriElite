import jwt
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User
from backend.routes.auth import SECRET_KEY
from backend.services.email_service import is_valid_email, render_branded_email, send_email, PUBLIC_BASE_URL
from backend.services.rate_limit import rate_limit
from datetime import datetime, timedelta

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ForgotRequest(BaseModel):
    email: str

class ResetRequest(BaseModel):
    token: str
    password: str

@router.post("/forgot-password", dependencies=[Depends(rate_limit("forgot-password", max_attempts=5, window_seconds=900))])
def forgot_password(data: ForgotRequest, db: Session = Depends(get_db)):
    # Siempre la misma respuesta genérica, sin importar si el email existe,
    # tiene formato válido, o si el envío falla — cualquier diferencia (un
    # 500 vs este 200, por ejemplo) sería un canal para enumerar usuarios.
    from sqlalchemy import or_
    user = db.query(User).filter(
        or_(User.username == data.email, User.email == data.email)
    ).first()
    if user and is_valid_email(user.email):
        token = jwt.encode(
            {"sub": user.username, "exp": datetime.utcnow() + timedelta(hours=1), "type": "reset"},
            SECRET_KEY, algorithm="HS256"
        )
        reset_url = f"{PUBLIC_BASE_URL}/app/?reset={token}"
        send_email(
            user.email,
            "Recuperación de contraseña — NutriElite",
            render_branded_email(
                "Recupera tu contraseña",
                f"""
                <p style="color:#6b6860;font-size:14px;margin-bottom:24px;">
                  Recibimos una solicitud para restablecer tu contraseña. El enlace expira en 1 hora.
                </p>
                <a href="{reset_url}" style="display:inline-block;background:#6d5bff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                  Restablecer contraseña
                </a>
                <p style="color:#9e9b95;font-size:12px;margin-top:24px;">
                  Si no solicitaste esto, ignora este mensaje.
                </p>
                """,
            ),
        )
    return {"ok": True}

@router.post("/reset-password", dependencies=[Depends(rate_limit("reset-password", max_attempts=10, window_seconds=900))])
def reset_password(data: ResetRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Token inválido")
        username = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Token inválido")
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    user.password = pwd_context.hash(data.password[:72])
    db.commit()

    send_email(
        user.email,
        "Tu contraseña fue cambiada — NutriElite",
        render_branded_email(
            "✅ Contraseña actualizada",
            """
            <p style="color:#6b6860;font-size:14px;margin-bottom:24px;">
              Tu contraseña fue cambiada exitosamente. Si no realizaste este cambio, contáctanos de inmediato.
            </p>
            """,
        ),
    )

    return {"ok": True}
