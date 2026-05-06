# proyecto_secot

## Migraciones con Liquibase + Supabase (Postgres)

Requisitos: Docker Desktop.

### 0) Driver JDBC de PostgreSQL (1 vez)

Liquibase necesita el driver JDBC. Descarga `postgresql-*.jar` y déjalo en `db/drivers/`.

Si `docker run ...` da **Access is denied** al conectar con `//./pipe/docker_engine`, ejecuta la terminal como Administrador o añade tu usuario al grupo local `docker-users` y reinicia sesión.

1) Crea tu fichero de variables:
- Copia `.env.example` a `.env` (o usa `credenciales.env`)
- Rellena `SUPABASE_DB_*` con los datos de tu proyecto Supabase (Settings -> Database).
  - Si `db.<project-ref>.supabase.co` no funciona en Docker (IPv6), usa el host/puerto del **Connection Pooler** que te da Supabase.
  - Con pooler, el usuario suele ser `postgres.<project-ref>` (no solo `postgres`), si no puede fallar con “no tenant identifier”.

2) Ejecuta:
- `npm run db:validate`
- `npm run db:update`

Changelog principal: `db/changelog/db.changelog-master.yaml`

## Estructura del repo

- `db/`: changelogs Liquibase
- `scripts/`: runner de Liquibase (Docker)
- `backend/`: API FastAPI (Python)
- `frontend/`: React + Vite

## Arranque rápido (dev)

- Frontend: `npm run frontend:install` y `npm run frontend:dev`
- Backend: entra en `backend/` y sigue `backend/README.md`

## Deploy (Vercel + Render + Supabase)
- Vercel (frontend): define `VITE_API_URL=https://<tu-servicio>.onrender.com`
- Render (backend): define `DATABASE_URL` (Supabase Postgres) y `BACKEND_CORS_ORIGINS=https://<tu-app>.vercel.app`
- Opcional (previews Vercel): `BACKEND_CORS_ORIGIN_REGEX=^https://.*\\.vercel\\.app$`

## CRUD Senior

- API: `backend/app/routers/seniors.py`
- UI: `frontend/src/ui/App.jsx`

## Pruebas API (Postman/Newman)

- Colección: `postman/SECOT-Bizkaia-API.postman_collection.json`
- Ejecutar en local (requiere API levantada): `npx -y newman run postman/SECOT-Bizkaia-API.postman_collection.json -e postman/SECOT-Bizkaia-API.postman_environment.json --env-var baseUrl=http://localhost:8000 --env-var username=admin --env-var password=TU_PASSWORD`
- CI: workflow `Postman API tests` (GitHub Actions). Define secretos:
  - `API_BASE_URL` (URL del backend, p.ej. `https://<tu-servicio>.onrender.com`) como **Variable** o **Secret**
  - `API_AUTH_USER` y `API_AUTH_PASS` como **Variables** o **Secrets** (credenciales válidas en ese entorno; si no, `/auth/login` devolverá 401 y el resto fallará)
