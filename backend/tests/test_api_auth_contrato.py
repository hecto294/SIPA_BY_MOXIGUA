"""
Semana 4 — Capa Front: contrato HTTP de auth (frontend).
Sin seed de usuarios.
"""


def test_me_sin_token_devuelve_401_json(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert "application/json" in response.headers.get("content-type", "")
    assert "detail" in response.json()


def test_login_sin_password_devuelve_422_json(client):
    response = client.post("/auth/login", json={"email": "admin@test.com"})
    assert response.status_code == 422
    assert "application/json" in response.headers.get("content-type", "")
    assert "detail" in response.json()


def test_login_sin_email_devuelve_422_json(client):
    response = client.post("/auth/login", json={"password": "Admin123!"})
    assert response.status_code == 422
    assert "application/json" in response.headers.get("content-type", "")
    assert "detail" in response.json()


def test_login_json_malformado_no_devuelve_500(client):
    response = client.post(
        "/auth/login",
        content=b'{"email": "admin@test.com",',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code in (400, 422)
    assert response.status_code != 500
    assert "json" in response.headers.get("content-type", "").lower()


def test_login_body_vacio_devuelve_422(client):
    response = client.post("/auth/login", json={})
    assert response.status_code == 422
    assert "application/json" in response.headers.get("content-type", "")
    assert "detail" in response.json()
