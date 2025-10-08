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