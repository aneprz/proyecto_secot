import os

import pytest
from fastapi.testclient import TestClient

# Make JWT verification deterministic in tests (no DB required).
os.environ.setdefault("AUTH_SECRET_KEY", "TEST_SECRET_KEY_CHANGE_ME")

from app.auth import create_access_token  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_token(client: TestClient) -> str:
    return create_access_token("admin", extra_claims={"rol": "admin"})
