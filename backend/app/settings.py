from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None

    backend_cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    # Útil para Vercel previews (p.ej. ^https://.*\\.vercel\\.app$)
    backend_cors_origin_regex: str | None = None

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

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                return json.loads(raw)
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return value

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
