import resend
import os
import jwt
import bcrypt
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import User
from datetime import datetime, timedelta

router = APIRouter()

resend.api_key = os.getenv("RESEND_API_KEY")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")

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

@router.post("/forgot-password")
def forgot_password(data: ForgotRequest, db: Session = Depends(get_db)):
    from sqlalchemy import or_
    user = db.query(User).filter(
        or_(User.username == data.email, User.email == data.email)
    ).first()
    if not user:
        # Não revela se email existe ou não
        return {"ok": True}
    
    token = jwt.encode(
        {"sub": user.username, "exp": datetime.utcnow() + timedelta(hours=1), "type": "reset"},
        SECRET_KEY, algorithm="HS256"
    )
    
    reset_url = f"https://nutrielite-production-e88f.up.railway.app/app/?reset={token}"
    
    resend.Emails.send({
        "from": "NutriElite <onboarding@resend.dev>",
        "to": data.email,
        "subject": "Recuperación de contraseña — NutriElite",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:18px;font-weight:700;color:#1a6b4a;">Nutri</span>
            <span style="font-size:18px;font-weight:700;color:#1a1916;">Elite</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Recupera tu contraseña</h2>
          <p style="color:#6b6860;font-size:14px;margin-bottom:24px;">
            Recibimos una solicitud para restablecer tu contraseña. El enlace expira en 1 hora.
          </p>
          <a href="{reset_url}" style="display:inline-block;background:#1a6b4a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Restablecer contraseña
          </a>
          <p style="color:#9e9b95;font-size:12px;margin-top:24px;">
            Si no solicitaste esto, ignora este mensaje.
          </p>
        </div>
        """
    })
    return {"ok": True}

@router.post("/reset-password")
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

    # Envia email de confirmação
    try:
        import re
        if user.email and re.match(r"[^@]+@[^@]+\.[^@]+", user.email):
            resend.Emails.send({
                "from": "NutriElite <onboarding@resend.dev>",
                "to": user.email,
                "subject": "Tu contraseña fue cambiada — NutriElite",
                "html": """
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
                  <div style="margin-bottom:24px;">
                    <span style="font-size:18px;font-weight:700;color:#1a6b4a;">Nutri</span>
                    <span style="font-size:18px;font-weight:700;color:#1a1916;">Elite</span>
                  </div>
                  <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">✅ Contraseña actualizada</h2>
                  <p style="color:#6b6860;font-size:14px;margin-bottom:24px;">
                    Tu contraseña fue cambiada exitosamente. Si no realizaste este cambio, contáctanos de inmediato.
                  </p>
                  <p style="color:#9e9b95;font-size:12px;">NutriElite · Precisión clínica. Nutrición inteligente.</p>
                </div>
                """
            })
    except Exception:
        pass

    return {"ok": True}
