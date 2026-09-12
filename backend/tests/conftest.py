import os
import tempfile

import pytest

# El engine se crea na importação de backend.database, então a DATABASE_URL
# de teste precisa existir antes de qualquer import do pacote backend — um
# arquivo sqlite temporário (não :memory:) evita o problema de cada conexão
# do pool abrir um banco em memória isolado diferente.
_tmp_db_fd, _tmp_db_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_db_fd)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp_db_path}")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

from backend.database import Base, SessionLocal, engine  # noqa: E402
from backend.scripts.seed_smae import seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    Base.metadata.create_all(bind=engine)
    seed()
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
