# Setup — Raíces ERP (EPR)

Guía rápida para clonar y trabajar en otra PC. Para contexto profundo del
proyecto (stack, mapa de código, migraciones, convenciones) leer `AGENTS.md`.

## 1. Requisitos

- **Node 24** (ver `.nvmrc`). Si usás `nvm`: `nvm use`.
- **npm 11+**.
- Git.

## 2. Clonar e instalar

```bash
git clone <URL-del-repo> epr-sistema
cd epr-sistema
npm install          # o `npm ci` para reproducir el lockfile exacto
```

> `node_modules` no se commitea; se instala con `npm install`.

## 3. Variables de entorno

Los archivos **`.env`** y **`.dev.vars`** ya vienen commiteados en el repo
(temporalmente, porque el dueño trabaja desde dos PCs). Contienen las claves
de Supabase y Cloudflare necesarias para `npm run dev` y los scripts del worker.

⚠️ No hacer público el repo mientras estos archivos estén commiteados.
Cuando vuelvas a una sola PC: gitignorearlos y rotar `GEMINI_API_KEY`.

## 4. Desarrollo

```bash
npm run dev      # Vite en http://localhost:2026 (carga .dev.vars)
npm test         # vitest (suite de preflight, rate limit, schema, storage)
npx eslint .     # lint
npm run build    # solo vite build (no hay gate de tsc)
```

## 5. Deploy

Push a `main` → CI de Cloudflare → `https://eprservintegrales.danpamaderas.workers.dev`.
No hace falta `wrangler dev` local (crash conocido por libuv en Windows).

## 6. Base de datos

Las migraciones están en `sql/` (numeradas). Se aplican con la Management API
de Supabase usando un token vigente (ver helper en `AGENTS.md`). Los tipos de
`src/shared/types/database.types.ts` se parchean a mano con cada migración.
