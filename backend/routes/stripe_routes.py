import stripe
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.routes.auth import verify_token

router = APIRouter(prefix="/stripe", tags=["stripe"])

stripe.api_key = os.getenv("STRIPE_API_KEY")
PRICE_ID = os.getenv("STRIPE_PRICE_ID")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/checkout")
def create_checkout(token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": PRICE_ID, "quantity": 1}],
            success_url="https://nutrielite-production-e88f.up.railway.app/app/?pro=success",
            cancel_url="https://nutrielite-production-e88f.up.railway.app/app/?pro=cancel",
            client_reference_id=str(db.query(User).filter(User.username == token["sub"]).first().id),
            # customer_email omitido — username pode não ser email
        )
        return {"url": session.url}
    except Exception as e:
        print(f"STRIPE ERROR: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        data = event["data"]["object"]
        user_id = int(data.get("client_reference_id", 0))
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_pro = 1
            user.stripe_customer_id = data.get("customer")
            db.commit()

    if event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        customer_id = event["data"]["object"].get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.is_pro = 0
            db.commit()

    return {"ok": True}

@router.get("/status")
def pro_status(token: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == token["sub"]).first()
    return {"is_pro": bool(user.is_pro) if user else False}
