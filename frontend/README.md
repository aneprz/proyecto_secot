# Frontend (React)

Proyecto React con Vite.

## Variables
- Copia `.env.example` a `.env` y rellena:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL` (por defecto `http://127.0.0.1:8000`)

## Deploy (Vercel)
- Variables de entorno (en Vercel):
  - `VITE_API_URL` con la URL pública de Render (p.ej. `https://tu-fastapi.onrender.com`)
  - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` si el frontend usa Supabase

## Ejecutar
- `npm install`
- `npm run dev`
