import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from datetime import datetime
from app.models import Usuario
from app.core.security import get_current_user, require_role
from app.main import app

# ============================================================
# SEMANA 4 — TESTS DE API Y SEGURIDAD
# Capa: Endpoints / Rutas
# ============================================================

def test_1_sin_token_retorna_401(client):
    """Caso 401: Sin token, no debe dejar pasar."""
    response = client.get("/usuarios/")
    assert response.status_code == 401
    assert "detail" in response.json()

def test_2_token_invalido_retorna_401(client):
    """Caso 401: Token falso o expirado."""
    headers = {"Authorization": "Bearer token-falso-123456"}
    response = client.get("/usuarios/", headers=headers)
    assert response.status_code == 401

def test_3_rol_insuficiente_retorna_403(client, auth_headers):
    """Caso 403: Token válido de aprendiz intentando entrar a ruta de admin."""
    headers_aprendiz = auth_headers("aprendiz@test.com", "Aprendiz123!")
    response = client.get("/usuarios/", headers=headers_aprendiz)
    assert response.status_code == 403
    assert "No tiene permisos" in response.json()["detail"]

def test_4_contrato_no_expone_password(client):
    """Hallazgo de contrato: La respuesta no debe exponer el hash de la contraseña."""
    # 1. Creamos un admin simulado COMPLETO para que no falle la validación
    fake_admin = Usuario(
        id=1, nombre="Admin", apellido="Test", email="admin@test.com", 
        rol_id=1, is_active=True, preferencias_ui={}, 
        created_at=datetime.now(), updated_at=datetime.now()
    )
    
    # Sobrescribimos las dependencias
    app.dependency_overrides[get_current_user] = lambda: fake_admin
    app.dependency_overrides[require_role] = lambda *roles: lambda: fake_admin

    # 2. Simulamos la BD devolviendo un usuario COMPLETO
    with patch("app.modules.usuarios.router.crud.get_usuarios") as mock_get:
        mock_user = Usuario(
            id=2, nombre="User", apellido="Mock", email="user@test.com", 
            password_hash="hash_secreto", rol_id=4, is_active=True, 
            preferencias_ui={}, created_at=datetime.now(), updated_at=datetime.now()
        )
        mock_get.return_value = ([mock_user], 1)

        response = client.get("/usuarios/")
        
        # Verificamos el código 200 (Autorizado)
        assert response.status_code == 200
        data = response.json()
        
        # Verificamos el contrato de seguridad
        assert len(data) > 0
        assert "password_hash" not in data[0], "¡Hallazgo! La API expone el hash de la contraseña"
        assert "password" not in data[0], "¡Hallazgo! La API expone la contraseña"

    # Limpiamos las dependencias
    app.dependency_overrides.clear()
