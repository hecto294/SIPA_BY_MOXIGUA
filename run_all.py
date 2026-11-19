from sqlalchemy import create_engine, text
from passlib.context import CryptContext

engine = create_engine(
    "postgresql+psycopg2://sipa_user:sipa_password@sipa_db:5432/sipa_db"
    "?options=-c%20search_path=etapa_productiva"
)

# Crea el esquema y las tablas a partir de los modelos
with engine.begin() as c:
    c.execute(text("CREATE SCHEMA IF NOT EXISTS etapa_productiva"))
from app.models import Base
Base.metadata.create_all(bind=engine)

roles = [(1, "ADMIN"), (2, "COORDINADOR"), (3, "INSTRUCTOR"),
         (4, "APRENDIZ"), (5, "APOYO_ADMINISTRATIVO"), (6, "CONSULTA")]
hash_ = CryptContext(schemes=["bcrypt"]).hash("Admin1234*")

with engine.begin() as c:
    for rid, nombre in roles:
        c.execute(text("INSERT INTO roles (id, nombre) VALUES (:i, :n) "
                       "ON CONFLICT (id) DO NOTHING"), {"i": rid, "n": nombre})
    c.execute(text("""
        INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id)
        VALUES ('Admin', 'SIPA', 'admin@sipa.com', :h, 1)
        ON CONFLICT (email) DO UPDATE SET password_hash = :h, rol_id = 1
    """), {"h": hash_})
print("Listo: admin@sipa.com / Admin1234*")