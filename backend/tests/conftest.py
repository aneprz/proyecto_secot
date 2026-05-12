import os

# Make JWT verification deterministic in tests (no DB required).
os.environ.setdefault("AUTH_SECRET_KEY", "TEST_SECRET_KEY_CHANGE_ME")

import pytest
from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_token(client: TestClient) -> str:
    return create_access_token("admin", extra_claims={"rol": "admin"})
