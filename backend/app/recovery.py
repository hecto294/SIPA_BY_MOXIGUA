from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import random
import aiosmtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()

class ForgotPasswordReq(BaseModel):
    email: str

class VerifyCodeReq(BaseModel):
    email: str
    otp_code: str
    new_password: str

@router.post("/api/forgot-password")
async def forgot_password(req: ForgotPasswordReq, db: AsyncSession = Depends(get_db)):
    otp = str(random.randint(100000, 999999))
    expires = datetime.now() + timedelta(minutes=10)
    try:
        await db.execute(text("DELETE FROM password_reset_tokens WHERE email = :email"), {"email": req.email})
        await db.execute(text("INSERT INTO password_reset_tokens (email, otp_code, expires_at) VALUES (:email, :otp, :exp)"), {"email": req.email, "otp": otp, "exp": expires})
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")
    msg = EmailMessage()
    msg.set_content(f"Tu codigo es: {otp}")
    msg["Subject"] = "Recuperacion SIPA"
    msg["From"] = "no-reply@sipa.com"
    msg["To"] = req.email
    try:
        smtp = aiosmtplib.SMTP(hostname="mailpit", port=1025)
        await smtp.connect()
        await smtp.send_message(msg)
        await smtp.quit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error mail: {str(e)}")
    return {"message": "Codigo enviado"}

@router.post("/api/verify-code")
async def verify_code(req: VerifyCodeReq, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT * FROM password_reset_tokens WHERE email = :email AND otp_code = :otp AND expires_at > NOW()"), {"email": req.email, "otp": req.otp_code})
        if not result.fetchone():
            raise HTTPException(status_code=400, detail="Codigo invalido o expirado")
        await db.execute(text("DELETE FROM password_reset_tokens WHERE email = :email"), {"email": req.email})
        await db.commit()
        return {"message": "Codigo verificado."}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error BD: {str(e)}")
