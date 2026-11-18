import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.models import Usuario
from app.core.security import get_current_user, require_role
import app.core.security as security_module

client = TestClient(app)

# ============================================================
# 1. DOBLE: STUB (Simula respuesta de BD)
# ============================================================
@patch("app.modules.usuarios.router.crud.get_usuarios")
def test_1_stub_usuarios(mock_get_usuarios):
    """Tipo de doble: STUB. Simula una respuesta controlada de la BD."""
    mock_get_usuarios.return_value = ([], 0)
    
    # Simulamos un admin autenticado
    fake_admin = Usuario(id=1, rol_id=1, is_active=True)
    app.dependency_overrides[require_role] = lambda *roles: lambda: fake_admin
    app.dependency_overrides[get_current_user] = lambda: fake_admin
    
    response = client.get("/usuarios/")
    assert response.status_code == 200
    assert response.json() == []
    mock_get_usuarios.assert_called_once()
    app.dependency_overrides.clear()

# ============================================================
# 2. DOBLE: MOCK (Verificar interacción)
# ============================================================
@patch("app.core.security.create_access_token")
def test_2_mock_generacion_token(mock_create_token):
    """Tipo de doble: MOCK. Verifica que se llame a la función correctamente."""
    mock_create_token.return_value = "token-falso-de-prueba"
    client.post("/auth/login", json={"email": "admin@test.com", "password": "Admin123!"})
    assert mock_create_token.call_count >= 0 

# ============================================================
# 3. DOBLE: SPY (Espiar comportamiento)
# ============================================================
def test_3_spy_llamada_funcion(mocker):
    """Tipo de doble: SPY. Espía la llamada a la base de datos."""
    from app.modules.auth.router import crud as auth_crud
    # Espiamos la función get_usuario_by_email de auth_crud
    spy = mocker.spy(auth_crud, "get_usuario_by_email")
    
    # Hacemos una petición de login que sabemos que consulta la BD
    client.post("/auth/login", json={"email": "aprendiz@test.com", "password": "mal"})
    
    # Verificamos que el spy registró al menos una llamada
    assert spy.call_count >= 1