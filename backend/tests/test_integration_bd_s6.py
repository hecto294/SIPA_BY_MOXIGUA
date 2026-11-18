"""
Semana 6 — Capa BD: integración del repositorio/modelo contra PostgreSQL real.
Se salta si DATABASE_URL no está definida (CI actual sigue en verde).
Limpieza: rollback por test (transacción aislada).
"""
import os
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import Rol, Usuario

DATABASE_URL = os.getenv("DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL no definida: se saltan tests de integración S6",
)


@pytest.fixture(scope="module")
def engine():
    eng = create_engine(DATABASE_URL, pool_pre_ping=True)
    with eng.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS etapa_productiva"))
        conn.execute(text("SET search_path TO etapa_productiva"))
        Base.metadata.create_all(bind=conn)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    """Sesión por test con rollback al final (limpieza explícita)."""
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection, autocommit=False, autoflush=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


def _unique_email(prefix: str = "s6") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}@test.local"


def test_bd_inserta_rol_y_queda_persistido_en_sesion(db):
    """BD: create del rol — se puede leer en la misma sesión (estado real)."""
    nombre = f"ROL_S6_{uuid.uuid4().hex[:8]}"
    rol = Rol(nombre=nombre, descripcion="Rol integración S6")
    db.add(rol)
    db.flush()

    encontrado = db.query(Rol).filter(Rol.nombre == nombre).one_or_none()
    assert encontrado is not None
    assert encontrado.nombre == nombre
    assert encontrado.id is not None


def test_bd_usuario_requiere_rol_fk(db):
    """BD: restricción FK — usuario sin rol válido no se puede guardar."""
    usuario = Usuario(
        nombre="Sin",
        apellido="Rol",
        email=_unique_email("sinrol"),
        password_hash="hash-falso-para-test",
        rol_id=999_999_999,  # no existe
        is_active=True,
    )
    db.add(usuario)

    with pytest.raises(IntegrityError):
        db.flush()


def test_bd_email_unico_en_usuarios(db):
    """BD: restricción UNIQUE de email — el segundo insert falla."""
    rol = Rol(nombre=f"ROL_UQ_{uuid.uuid4().hex[:8]}", descripcion="para unique")
    db.add(rol)
    db.flush()

    email = _unique_email("unique")
    u1 = Usuario(
        nombre="Uno",
        apellido="Test",
        email=email,
        password_hash="hash1",
        rol_id=rol.id,
        is_active=True,
    )
    db.add(u1)
    db.flush()

    u2 = Usuario(
        nombre="Dos",
        apellido="Test",
        email=email,  # mismo email
        password_hash="hash2",
        rol_id=rol.id,
        is_active=True,
    )
    db.add(u2)

    with pytest.raises(IntegrityError):
        db.flush()


def test_bd_filtro_usuarios_activos(db):
    """BD: consulta con filtro is_active (consulta propia del dominio)."""
    rol = Rol(nombre=f"ROL_FILT_{uuid.uuid4().hex[:8]}", descripcion="filtro")
    db.add(rol)
    db.flush()

    activo = Usuario(
        nombre="Activo",
        apellido="S6",
        email=_unique_email("activo"),
        password_hash="h",
        rol_id=rol.id,
        is_active=True,
    )
    inactivo = Usuario(
        nombre="Inactivo",
        apellido="S6",
        email=_unique_email("inactivo"),
        password_hash="h",
        rol_id=rol.id,
        is_active=False,
    )
    db.add_all([activo, inactivo])
    db.flush()

    solo_activos = (
        db.query(Usuario)
        .filter(Usuario.rol_id == rol.id, Usuario.is_active.is_(True))
        .all()
    )
    assert len(solo_activos) == 1
    assert solo_activos[0].nombre == "Activo"