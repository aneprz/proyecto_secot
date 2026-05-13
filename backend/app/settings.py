import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None

    # En Render / producción, define `BACKEND_CORS_ORIGINS` como CSV o JSON:
    # - CSV:  https://mi-app.vercel.app,https://otro.com
    # - JSON: ["https://mi-app.vercel.app","https://otro.com"]
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Útil para Vercel previews y despliegues (p.ej. ^https://.*\\.vercel\\.app$)
    # Si quieres restringirlo más, define BACKEND_CORS_ORIGIN_REGEX en producción.
    backend_cors_origin_regex: str | None = r"^https://.*\.vercel\.app$"

    supabase_db_host: str | None = None
    supabase_db_port: int = 5432
    supabase_db_name: str = "postgres"
    supabase_db_schema: str = "public"
    supabase_db_sslmode: str = "require"
    supabase_db_user: str | None = None
    supabase_db_password: str | None = None

    auth_secret_key: str = "CHANGE_ME"
    auth_access_token_expire_minutes: int = 60 * 8
    auth_username: str = "admin"
    # Recomendado: guardar el hash en env (bcrypt). Ej: $2b$...
    auth_password_hash: str | None = None
    debug_cors: bool = False

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def _normalize_backend_cors_origins(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            trimmed = value.strip()
            # En algunos panels (Render) puede quedar definido como string vacío.
            if not trimmed:
                return "http://localhost:5173,http://127.0.0.1:5173"
            return trimmed
        return value

    @field_validator("backend_cors_origin_regex", mode="before")
    @classmethod
    def _normalize_backend_cors_origin_regex(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            trimmed = value.strip()
            # Evita que un env var vacío "pise" el default.
            if not trimmed:
                return r"^https://.*\.vercel\.app$"
            # Permite desactivar explícitamente desde env.
            if trimmed.lower() in {"none", "null", "disable", "disabled", "off", "0"}:
                return None
            return trimmed
        return value

    def cors_allow_origins(self) -> list[str]:
        raw = (self.backend_cors_origins or "").strip()
        if not raw:
            return []
        if raw.startswith("["):
            origins = json.loads(raw)
        else:
            origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
        # Normaliza para evitar problemas típicos (slash final).
        normalized: list[str] = []
        for origin in origins:
            origin = origin.strip()
            if origin.endswith("/"):
                origin = origin.rstrip("/")
            if origin:
                normalized.append(origin)
        return normalized

    def build_database_url(self) -> str | None:
        if self.database_url:
            return self.database_url
        if not (self.supabase_db_host and self.supabase_db_user and self.supabase_db_password):
            return None
        return (
            f"postgresql://{self.supabase_db_user}:{self.supabase_db_password}"
            f"@{self.supabase_db_host}:{self.supabase_db_port}/{self.supabase_db_name}"
            f"?sslmode={self.supabase_db_sslmode}&options=-csearch_path%3D{self.supabase_db_schema}"
        )


settings = Settings()
