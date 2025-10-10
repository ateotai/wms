# WMS (Warehouse Management System)

Aplicación web para gestión de almacenes, recepción, inventario, picking/packing y reportes. Incluye frontend en React + Vite y un backend Node/Express para autenticación y endpoints auxiliares.

## Estructura
- `src/`: Frontend React (Vite, TypeScript, Tailwind).
- `server/`: Backend Node/Express (autenticación y API auxiliar).
- `database/`: SQL y documentación de estructura y seguridad (Supabase/Postgres).

## Requisitos
- Node.js 18+ y npm.
- Variables de entorno en `.env` y `server/.env` (no se suben al repo).
- Base de datos Postgres/Supabase si se desea probar flujos completos.

## Desarrollo
Frontend:
```
npm install
npm run dev
```

Backend:
```
cd server
npm install
npm start
```

## Scripts útiles
- `npm run build`: compila el frontend.
- `npm run lint`: lint del código.
- `npm run typecheck`: verificación de tipos.

## Variables de entorno
Copiar `.env.example` a `.env` y completar. Ejemplos:
```
VITE_AUTH_BACKEND_URL=http://localhost:8080
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Backend `server/.env`:
```
JWT_SECRET=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## CI/CD (GitHub Actions)
El repo incluye workflow de CI que instala dependencias, ejecuta lint y build para frontend y arranca backend para validar que inicia.

## Licencia
Privado. Uso interno.
## Despliegue en Vercel (desde GitHub)

Sigue estos pasos para publicar este proyecto en Vercel:

- Requisitos:
  - Tener el repositorio en GitHub y acceso a Vercel.
  - Variables de entorno necesarias (si usas Supabase u otros servicios):
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`

- Configuración del proyecto:
  - Se ha añadido `vercel.json` en la raíz con:
    - `buildCommand`: `npm run build`
    - `outputDirectory`: `dist`
    - `framework`: `vite`

- Publicación:
  1. Entra a https://vercel.com/new e importa el repositorio de GitHub.
  2. En “Project Settings → Environment Variables”, añade las variables necesarias.
  3. Verifica que el comando de build sea `npm run build` y el output `dist`.
  4. Crea el proyecto y espera el primer despliegue.
  5. Los nuevos commits en `main` desplegarán automáticamente.

- Notas:
  - Este repo incluye una carpeta `server/` para desarrollo local; en Vercel se despliega el frontend (Vite). Si necesitas backend, úsalo como funciones serverless o despliega el servidor por separado.
  - Antes de publicar, asegúrate que `npm run build` finaliza correctamente en local.

## Despliegue en Render (Backend Node)

- Tipo de servicio: `web`
- Root Directory: `server`
- Build Command: `npm install` (el backend no tiene `build`)
- Start Command: `npm start` (ejecuta `node index.js`)
- Health Check: `GET /health`
- Variables de entorno requeridas:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_JWT_SECRET`
  - `CORS_ORIGINS` (opcional, coma-separado)

### Blueprint con `render.yaml`

Este repo incluye `render.yaml` en la raíz que define el servicio backend. En Render, usa “New → Blueprint” para importar el repositorio y crea los secrets `supabase_url`, `supabase_service_role_key`, `app_jwt_secret` y `cors_origins` referenciados por el blueprint.

### Verificación post-deploy

- `GET /` debe responder `Auth backend running`.
- `GET /health` debe devolver un JSON con `status`, `uptime`, `port` y `timestamp`.
- Configura el frontend con `VITE_AUTH_BACKEND_URL` apuntando al dominio de Render.