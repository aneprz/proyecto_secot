# Backend (FastAPI)

## Requisitos
- Python 3.11+ (recomendado)

## Configuración
1) Crear entorno virtual:
- Windows (PowerShell):
  - `py -m venv .venv`
  - `.\.venv\Scripts\Activate.ps1`

2) Instalar dependencias:
- `pip install -r requirements.txt`

3) Variables de entorno:
- Copia `.env.example` a `.env` y rellena valores.

## Ejecutar
- `uvicorn app.main:app --reload --port 8000`

## Deploy (Render)
- Start command recomendado:
  - `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Variables de entorno (en Render):
  - `DATABASE_URL` (recomendado) **o** `SUPABASE_DB_HOST`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD` (+ opcionales)
  - `BACKEND_CORS_ORIGINS` con tu dominio de Vercel (CSV o JSON). Ej:
    - `https://mi-app.vercel.app`
    - `https://mi-app.vercel.app,https://otro-dominio.com`
    - `["https://mi-app.vercel.app"]`
  - Opcional: `BACKEND_CORS_ORIGIN_REGEX` si quieres permitir previews (p.ej. `^https://.*\\.vercel\\.app$`)
  - Auth:
    - `AUTH_SECRET_KEY` (obligatorio en prod)
    - `AUTH_USERNAME`
    - `AUTH_PASSWORD_HASH` (bcrypt)

## Endpoints
- `GET /health`
- `POST /auth/login`
- `GET /seniors` / `POST /seniors`
- `GET /seniors/{id}` / `PATCH /seniors/{id}` / `DELETE /seniors/{id}`
