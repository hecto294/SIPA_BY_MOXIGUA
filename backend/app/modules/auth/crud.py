import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models import Usuario
from app.modules.auth.services import send_email

logger = logging.getLogger(__name__)

CODE_EXPIRE_MINUTES = 5
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 30
GENERIC_MESSAGE = "Si el correo está registrado, te enviamos un código de 6 dígitos."

_table_ready = False


def get_usuario_by_email(db: Session, email: str) -> Optional[Usuario]:
    """Obtiene un usuario por email (sin filtrar por activo)."""
    return db.query(Usuario).filter(Usuario.email == email).first()


def get_usuario_by_id(db: Session, usuario_id: int) -> Optional[Usuario]:
    """Obtiene un usuario por ID."""
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def update_password(db: Session, usuario: Usuario, new_password_hash: str) -> Usuario:
    """Actualiza el hash de contraseña de un usuario."""
    usuario.password_hash = new_password_hash
    db.commit()
    db.refresh(usuario)
    return usuario


# ============================================================
# RECUPERACIÓN DE CONTRASEÑA (código de 6 dígitos)
# ============================================================

def _ensure_table(db: Session) -> None:
    """Crea la tabla de códigos si no existe (una sola vez por proceso)."""
    global _table_ready
    if _table_ready:
        return
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS password_reset_codes (
            email VARCHAR(255) PRIMARY KEY,
            code_hash VARCHAR(64) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            sent_at TIMESTAMPTZ NOT NULL
        )
    """))
    db.commit()
    _table_ready = True


def _hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{email}:{code}".encode("utf-8")).hexdigest()


def _invalid() -> HTTPException:
    return HTTPException(status_code=400, detail="Código inválido o expirado")


def _find_user(db: Session, email: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(func.lower(Usuario.email) == email).first()


def _delete_code(db: Session, email: str) -> None:
    db.execute(text("DELETE FROM password_reset_codes WHERE email = :email"), {"email": email})
    db.commit()


def _send_code_email(to_email: str, nombre: str, code: str) -> None:
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color: #39a900;">SIPA by Moxigua</h2>
        <p>Hola {nombre or ''},</p>
        <p>Tu código de verificación para recuperar la contraseña es:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">{code}</p>
        <p>Este código expira en {CODE_EXPIRE_MINUTES} minutos.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      </body>
    </html>
    """
    text_plain = (
        f"Tu código de verificación SIPA es: {code}\n"
        f"Expira en {CODE_EXPIRE_MINUTES} minutos."
    )
    try:
        send_email(to_email, "Código de recuperación - SIPA", html, text_plain)
    except Exception:
        logger.exception("No se pudo enviar el correo de recuperación")
        raise HTTPException(
            status_code=503,
            detail="No se pudo enviar el correo. Intenta de nuevo en unos minutos.",
        )


def solicitar_reset_password(db: Session, email: str) -> dict:
    """Genera un código aleatorio de 6 dígitos y lo envía por correo."""
    email = email.strip().lower()
    _ensure_table(db)

    now = datetime.now(timezone.utc)
    row = db.execute(
        text("SELECT sent_at FROM password_reset_codes WHERE email = :email"),
        {"email": email},
    ).first()
    if row and (now - row.sent_at).total_seconds() < RESEND_COOLDOWN_SECONDS:
        raise HTTPException(
            status_code=429,
            detail="Espera unos segundos antes de pedir otro código",
        )

    user = _find_user(db, email)
    if user and user.is_active:
        code = f"{secrets.randbelow(1_000_000):06d}"
        db.execute(
            text("""
                INSERT INTO password_reset_codes (email, code_hash, expires_at, attempts, sent_at)
                VALUES (:email, :h, :exp, 0, :now)
                ON CONFLICT (email) DO UPDATE
                SET code_hash = :h, expires_at = :exp, attempts = 0, sent_at = :now
            """),
            {
                "email": email,
                "h": _hash_code(email, code),
                "exp": now + timedelta(minutes=CODE_EXPIRE_MINUTES),
                "now": now,
            },
        )
        db.commit()
        if os.getenv("ENVIRONMENT") == "development":
            print(f">>> CODIGO DE RECUPERACION para {email}: {code}", flush=True)
        _send_code_email(user.email, user.nombre, code)

    # Misma respuesta exista o no el correo (no revela qué cuentas existen)
    return {"mensaje": GENERIC_MESSAGE}


def reenviar_codigo_reset(db: Session, email: str) -> dict:
    return solicitar_reset_password(db, email)


def _check_code(db: Session, email: str, codigo: str) -> None:
    """Valida el código. Lanza 400 si es incorrecto, expiró o superó los intentos."""
    _ensure_table(db)
    row = db.execute(
        text("SELECT code_hash, expires_at, attempts FROM password_reset_codes WHERE email = :email"),
        {"email": email},
    ).first()
    if not row:
        raise _invalid()

    now = datetime.now(timezone.utc)
    if row.expires_at < now or row.attempts >= MAX_ATTEMPTS:
        _delete_code(db, email)
        raise _invalid()

    if not secrets.compare_digest(row.code_hash, _hash_code(email, codigo)):
        db.execute(
            text("UPDATE password_reset_codes SET attempts = attempts + 1 WHERE email = :email"),
            {"email": email},
        )
        db.commit()
        raise _invalid()


def verificar_codigo_reset(db: Session, email: str, codigo: str) -> dict:
    email = email.strip().lower()
    _check_code(db, email, codigo)
    return {"mensaje": "Código verificado correctamente"}


def confirmar_reset_password(db: Session, email: str, codigo: str, nueva_password: str) -> dict:
    from app.core.security import get_password_hash

    email = email.strip().lower()
    _check_code(db, email, codigo)

    user = _find_user(db, email)
    if not user:
        raise _invalid()

    update_password(db, user, get_password_hash(nueva_password))
    _delete_code(db, email)
    return {"mensaje": "Contraseña actualizada correctamente"}