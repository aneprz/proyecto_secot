from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import get_connection
from .routers.auth import router as auth_router
from .routers.grupo_seniors import router as grupo_seniors_router
from .routers.grupos import router as grupos_router
from .routers.seniors import router as seniors_router
from .routers.usuarios import router as usuarios_router
from .settings import settings

app = FastAPI(title="SECOT Bizkaia API", version="0.1.0")

cors_kwargs = {
    "allow_origins": settings.cors_allow_origins(),
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.backend_cors_origin_regex:
    cors_kwargs["allow_origin_regex"] = settings.backend_cors_origin_regex

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db/ping")
def db_ping():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select 1;")
            value = cur.fetchone()[0]
    return {"db": "ok", "value": value}


app.include_router(seniors_router)
app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(grupos_router)
app.include_router(grupo_seniors_router)
