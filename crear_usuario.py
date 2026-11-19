from sqlalchemy import create_engine, text
from passlib.context import CryptContext

engine = create_engine(
    "postgresql+psycopg2://sipa_user:sipa_password@sipa_db:5432/sipa_db"
    "?options=-c%20search_path=etapa_productiva"
)

with engine.begin() as c:
    c.execute(text("CREATE SCHEMA IF NOT EXISTS etapa_productiva"))
import app.main
from app.models import Base
Base.metadata.create_all(bind=engine)

roles = [(1, "ADMIN"), (2, "COORDINADOR"), (3, "INSTRUCTOR"),
         (4, "APRENDIZ"), (5, "APOYO_ADMINISTRATIVO"), (6, "CONSULTA")]
hash_ = CryptContext(schemes=["bcrypt"]).hash("Admin1234*")
usuarios = [("Coordinador", "SIPA", "coordinador@sipa.com", 2),
            ("Admin", "SIPA", "admin@sipa.com", 1)]

with engine.begin() as c:
    for rid, nombre in roles:
        c.execute(text("INSERT INTO roles (id, nombre, is_active) VALUES (:i, :n, true) "
                       "ON CONFLICT (id) DO NOTHING"), {"i": rid, "n": nombre})
    for nom, ape, email, rol in usuarios:
        c.execute(text("""
            INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, is_active)
            VALUES (:nom, :ape, :e, :h, :r, true)
            ON CONFLICT (email) DO UPDATE SET password_hash = :h, rol_id = :r
        """), {"nom": nom, "ape": ape, "e": email, "h": hash_, "r": rol})
print("Listo: coordinador@sipa.com y admin@sipa.com / Admin1234*")
