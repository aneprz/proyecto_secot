from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .db import get_connection
from .routers.auth import router as auth_router
from .routers.actividades import router as actividades_router
from .routers.actividad_seniors import router as actividad_seniors_router
from .routers.centros import router as centros_router
from .routers.delegaciones import router as delegaciones_router
from .routers.grupo_seniors import router as grupo_seniors_router
from .routers.grupos import router as grupos_router
from .routers.seniors import router as seniors_router
from .routers.sesiones import router as sesiones_router
from .routers.usuarios import router as usuarios_router
from .settings import settings

app = FastAPI(title="SECOT Bizkaia API", version="0.1.0")

cors_kwargs = {
    "allow_origins": settings.cors_allow_origins(),
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
origin_regexes = settings.cors_allow_origin_regexes()
if origin_regexes:
    cors_kwargs["allow_origin_regex"] = "|".join(f"(?:{r})" for r in origin_regexes)

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/debug/cors")
def debug_cors():
    # Endpoint de diagnóstico para confirmar qué config CORS está cargada en producción.
    # No expone secretos; solo valores relacionados con CORS.
    if not settings.debug_cors:
        return JSONResponse(status_code=404, content={"detail": "Not found"})
    return {
        "allow_origins": settings.cors_allow_origins(),
        "allow_origin_regex": cors_kwargs.get("allow_origin_regex"),
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }


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
app.include_router(delegaciones_router)
app.include_router(grupos_router)
app.include_router(grupo_seniors_router)
app.include_router(centros_router)
app.include_router(actividades_router)
app.include_router(actividad_seniors_router)
app.include_router(sesiones_router)
