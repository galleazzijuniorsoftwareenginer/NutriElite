import pytest

from backend.services.rate_limit import _attempts


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    # El limitador es un dict global en memoria — sin esto, pruebas anteriores
    # que ya golpearon /login o /register harían fallar las siguientes con
    # un 429 inesperado, o un test de límite heredaría intentos de otro.
    _attempts.clear()
    yield
    _attempts.clear()


def test_register_then_login_succeeds(client):
    resp = client.post("/register", json={"username": "route_user_a", "password": "supersecret1"})
    assert resp.status_code == 200

    resp = client.post("/login", json={"username": "route_user_a", "password": "supersecret1"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password_rejected(client):
    client.post("/register", json={"username": "route_user_b", "password": "supersecret1"})
    resp = client.post("/login", json={"username": "route_user_b", "password": "wrong-password"})
    assert resp.status_code == 400


def test_register_duplicate_username_rejected(client):
    client.post("/register", json={"username": "route_user_c", "password": "supersecret1"})
    resp = client.post("/register", json={"username": "route_user_c", "password": "otherpass1"})
    assert resp.status_code == 400


def test_login_rate_limited_after_repeated_attempts(client):
    for _ in range(10):
        resp = client.post("/login", json={"username": "nadie", "password": "x"})
        assert resp.status_code == 400
    resp = client.post("/login", json={"username": "nadie", "password": "x"})
    assert resp.status_code == 429


def test_forgot_password_same_response_for_real_and_fake_email(client):
    client.post("/register", json={"username": "route_user_d", "password": "supersecret1", "email": "route_user_d@example.com"})

    real = client.post("/forgot-password", json={"email": "route_user_d@example.com"})
    fake = client.post("/forgot-password", json={"email": "no-existe@example.com"})
    username_as_email = client.post("/forgot-password", json={"email": "route_user_d"})

    assert real.status_code == fake.status_code == username_as_email.status_code == 200
    assert real.json() == fake.json() == username_as_email.json() == {"ok": True}
