import psycopg
from psycopg.rows import tuple_row

from .settings import settings


def get_connection(*, row_factory=tuple_row):
    database_url = settings.build_database_url()
    if not database_url:
        raise RuntimeError(
            "Falta DATABASE_URL o SUPABASE_DB_* (host/user/password) en backend/.env"
        )
    return psycopg.connect(database_url, row_factory=row_factory)
