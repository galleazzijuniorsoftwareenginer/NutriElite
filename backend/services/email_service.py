"""Envío de emails transaccionales vía Resend. Centraliza el layout de marca
para no repetir el mismo HTML en cada lugar que envía un correo."""

import os
import re
import resend

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_ADDRESS = "NutriElite <onboarding@resend.dev>"
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://nutrielite-production-e88f.up.railway.app").rstrip("/")

EMAIL_RE = re.compile(r"[^@]+@[^@]+\.[^@]+")


def is_valid_email(email: str | None) -> bool:
    return bool(email and EMAIL_RE.match(email))


def render_branded_email(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <div style="margin-bottom:24px;">
        <span style="font-size:18px;font-weight:700;color:#6d5bff;">Nutri</span>
        <span style="font-size:18px;font-weight:700;color:#171132;">Elite</span>
      </div>
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#171132;">{title}</h2>
      {body_html}
      <p style="color:#9992b3;font-size:12px;margin-top:24px;">NutriElite · Precisión clínica. Nutrición inteligente.</p>
    </div>
    """


def send_email(to: str, subject: str, html: str) -> bool:
    if not is_valid_email(to):
        return False
    try:
        resend.Emails.send({"from": FROM_ADDRESS, "to": to, "subject": subject, "html": html})
        return True
    except Exception:
        return False
