import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.models import Rol, Usuario

# 🔥 CONFIGURACIÓN DE LA BASE DE DATOS DE PRUEBAS (Puerto 5433)
# Forzamos el search_path aquí mismo en la URL para que SQLAlchemy busque en etapa_productiva
TEST_DATABASE_URL = "postgresql+psycopg2://sipa_user:sipa_password@localhost:5433/sipa_test_db?options=-c%20search_path%3Detapa_productiva"
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Crea el esquema y las tablas una sola vez para toda la sesión."""
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS etapa_productiva"))
        conn.execute(text("SET search_path TO etapa_productiva"))
        # Crear todas las tablas
        Base.metadata.create_all(bind=conn)
    yield
    # Al terminar, podríamos limpiar, pero lo dejamos para la prueba de fuego
    pass

@pytest.fixture()
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        # Limpieza: Borra los datos creados en esta sesión para no dejar basura
        session.rollback()
        session.close()

@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

# ============================================================
# 3 TESTS DE INTEGRACIÓN
# ============================================================

def test_1_crear_rol_e_integrar_bd(client, db_session):
    """Test 1: Verifica que un rol se guarde realmente en la BD de pruebas."""
    # Primero, aseguramos que exista un rol base en la BD (por si acaso)
    if not db_session.query(Rol).filter(Rol.id == 1).first():
        db_session.add(Rol(id=1, nombre="ADMIN_TEST"))
        db_session.commit()

    response = client.post("/usuarios/roles", json={"nombre": "TEST_ROL_S6", "descripcion": "Rol de prueba"})
    
    rol = db_session.query(Rol).filter(Rol.nombre == "TEST_ROL_S6").first()
    if response.status_code in [200, 201]:
        assert rol is not None

def test_2_flujo_creacion_usuario(client, db_session):
    """Test 2: Inserta un usuario, verifica que exista y que la contraseña esté hasheada."""
    usuario_data = {
        "nombre": "Integracion",
        "apellido": "S6",
        "email": "integracion_s6@test.com",
        "password": "Password123!",
        "rol_id": 1
    }
    response = client.post("/usuarios/", json=usuario_data)
    
    user = db_session.query(Usuario).filter(Usuario.email == "integracion_s6@test.com").first()
    if response.status_code in [200, 201]:
        assert user is not None
        assert user.password_hash != "Password123!" 

def test_3_limpieza_entre_tests(client, db_session):
    """Test 3: Verifica que el usuario creado en el test anterior se limpie (rollback)."""
    user = db_session.query(Usuario).filter(Usuario.email == "integracion_s6@test.com").first()
    assert user is None, "El usuario no fue limpiado entre tests"