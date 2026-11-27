from typing import Optional
from datetime import datetime, timedelta, timezone
import random
import string

from sqlalchemy.orm import Session

from app.models import Usuario
from app.core.config import settings
from app.core.security import get_password_hash
from app.modules.auth.services import send_email


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


def _generar_codigo(longitud: int = 6) -> str:
    """Genera un código numérico de recuperación."""
    return "".join(random.choices(string.digits, k=longitud))


def _enviar_codigo_reset(to_email: str, codigo: str, minutos: int) -> None:
    """Envía el código de recuperación por correo."""
    subject = "Código de recuperación de contraseña - SIPA"
    body_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #39A900;">Recuperación de contraseña - SIPA</h2>
            <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
            <p>Tu código de verificación es:</p>
            <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #39A900;">
                {codigo}
            </p>
            <p>Este código es válido por <strong>{minutos} minutos</strong>.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            <hr>
            <p style="font-size: 12px; color: #777;">Sistema SIPA - Seguimiento de Etapa Productiva</p>
        </body>
    </html>
    """
    send_email(to_email, subject, body_html)


def solicitar_reset_password(db: Session, email: str) -> dict:
    """
    Genera un código de recuperación, lo guarda con fecha de expiración
    y lo envía por correo. Funciona para todos los roles.
    """
    usuario = get_usuario_by_email(db, email.strip().lower())
    # Por seguridad no revelamos si el email existe o no
    if not usuario or not usuario.is_active:
        return {
            "mensaje": "Si el correo está registrado, recibirás un código de recuperación.",
            "codigo_debug": None,
        }

    codigo = _generar_codigo(6)
    minutos = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=minutos)

    usuario.reset_code = codigo
    usuario.reset_code_expires_at = expires_at
    db.commit()

    try:
        _enviar_codigo_reset(usuario.email, codigo, minutos)
    except Exception:
        # No fallamos la petición si el SMTP falla; el código queda guardado
        pass

    # En desarrollo se puede devolver el código (no en producción)
    debug = None
    if getattr(settings, "DEBUG", False) or getattr(settings, "ENVIRONMENT", "") in ("development", "dev", "local"):
        debug = codigo

    return {
        "mensaje": "Si el correo está registrado, recibirás un código de recuperación.",
        "codigo_debug": debug,
    }


def verificar_codigo_reset(db: Session, email: str, codigo: str) -> dict:
    """
    Verifica que el código de recuperación sea válido y no haya expirado.
    Disponible para todos los roles.
    """
    usuario = get_usuario_by_email(db, email.strip().lower())
    if not usuario or not usuario.is_active:
        raise ValueError("Código inválido o expirado")

    if not usuario.reset_code or not usuario.reset_code_expires_at:
        raise ValueError("Código inválido o expirado")

    if usuario.reset_code != codigo.strip():
        raise ValueError("Código inválido o expirado")

    expires = usuario.reset_code_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires:
        # Limpiar código expirado
        usuario.reset_code = None
        usuario.reset_code_expires_at = None
        db.commit()
        raise ValueError("El código ha expirado. Solicita uno nuevo.")

    return {"mensaje": "Código verificado correctamente", "valido": True}


def confirmar_reset_password(
    db: Session, email: str, codigo: str, nueva_password: str
) -> dict:
    """
    Restablece la contraseña tras validar el código.
    Limpia el código después de usarlo.
    """
    # Reutiliza la verificación
    verificar_codigo_reset(db, email, codigo)

    usuario = get_usuario_by_email(db, email.strip().lower())
    if not usuario:
        raise ValueError("Usuario no encontrado")

    if len(nueva_password) < 6:
        raise ValueError("La nueva contraseña debe tener al menos 6 caracteres")

    usuario.password_hash = get_password_hash(nueva_password)
    usuario.reset_code = None
    usuario.reset_code_expires_at = None
    db.commit()

    return {"mensaje": "Contraseña restablecida correctamente"}
