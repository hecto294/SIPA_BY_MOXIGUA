import os
from sqlalchemy import create_engine, text
from passlib.context import CryptContext

engine = create_engine(os.environ["DATABASE_URL"])
h = CryptContext(schemes=["bcrypt"]).hash("Admin1234*")
with engine.begin() as c:
    r = c.execute(text("""
        UPDATE etapa_productiva.usuarios
        SET password = :h, password_hash = :h, rol = 'COORDINADOR', rol_id = 2, is_active = true
        WHERE email = 'coordinador@sipa.com'
    """), {"h": h})
    print("Usuarios actualizados:", r.rowcount)
