# AGENTS.md — Contexto para agentes de código (OpenCode, etc.)

## Qué es esta app

**Raíces ERP** (`eprservintegrales`) — ERP interno para un emprendimiento real de
sublimación/impresión (marcas Raíces y Naza). Lo usan los dueños para administrar:

- **Pedidos** de clientes (por unidad de negocio), estados, entregas parciales por variante
- **Catálogo** de productos con costos y precios
- **Cotizaciones** con cálculo de margen real vs. objetivo
- **Repositorio de diseños** de sublimación: licencias PoD, plataformas (Creative Fabrica,
  Etsy, etc.), preflight de resolución (DPI) por producto, mockups para WhatsApp
- **Estudio IA**: quitar fondo, editar y vectorizar diseños (Gemini + imagetracerjs)

Es una herramienta de producción diaria: prioridad en flujos simples, español argentino
en toda la UI ("Cargá", "Subir archivo"), y no romper datos reales.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind v4 + Zustand + lucide-react + sweetalert2
- **Backend**: Supabase (Postgres + Auth + Storage) accedido directo desde el cliente
- **Worker API**: Cloudflare Worker (`src/worker.ts`) como proxy para Gemini AI y scrapers
  de páginas de plataformas de diseños (rutas `/api/gemini`, `/api/design-tools`,
  `/api/scrape-3d`, `/api/scrape-sublimation`, todas con JWT de Supabase obligatorio,
  rate limiting por usuario y timeouts)
- **Tests**: vitest (`npm test`)
- **Deploy**: push a `main` → CI → https://eprservintegrales.danpamaderas.workers.dev

## Comandos

```bash
npm run dev      # vite dev server en http://localhost:2026 (carga .dev.vars)
npm test         # vitest run (25 tests: preflight, rate limit, order schema, storage refs)
npx eslint <archivos>   # lint estricto; `npm run lint` linkea todo
npm run build    # SOLO vite build (no hay gate de tsc — no confiar en build para tipar)
```

`wrangler dev` crashea a veces en este Windows (libuv): si pasa, matar procesos node/workerd
huérfanos. No es necesario para desarrollo normal ni para deploy (CI hace `wrangler deploy`).

## Mapa del código

```
src/
├── worker.ts                  # Cloudflare Worker: proxy Gemini, scrapers, rate limits
├── lib/supabase.ts            # cliente Supabase (URL/anon key con fallback hardcodeado)
├── store/                     # useTenantStore (multi-tenant), useAuthStore, useToastStore
├── shared/
│   ├── utils/                 # designImageRef.ts, designStorage.ts (bucket firmado), rateLimit.ts
│   ├── hooks/useImageSrc.ts   # resuelve https/data:/path-storage → src mostrable
│   └── types/database.types.ts # tipos Supabase ACTUALIZADOS A MANO (no regenerar sin merge)
└── modules/
    ├── orders/                # pedidos: OrderForm, OrdersDashboard, OrderDesignLink (preflight)
    ├── quotes/                # cotizador con costo real y semáforo de margen
    ├── catalog/               # productos (useCatalogStore → Product.cost_price)
    └── sublimation/           # repositorio de diseños: card/detail/form modals,
                               # DesignStudioModal (IA, lazy), MockupPreviewModal (canvas, lazy),
                               # utils/printPreflight.ts, mockupCanvas.ts, vectorize.ts (+ web worker)
sql/                           # migraciones numeradas aplicadas via Management API
.agents/skills/                # skills instaladas: react-best-practices, supabase-postgres,
                               # tdd, web-design-guidelines (usarlas al tocar código afín)
```

## Decisiones y convenciones clave

1. **Multi-tenant**: `useTenantStore.activeCompanyId` filtra todo. Los stores de datos
   (pedidos, diseños) se suscriben al tenant y se resetean cuando cambia.
2. **Imágenes de diseños**: columna `sublimation_designs.imagen` acepta tres formatos:
   URL https legacy, data:URL legacy, o path de Storage `{companyId}/{uuid}.{ext}` (formato nuevo).
   Los paths se firman on-demand (URLs de 1 h, caché 45 min). Migración perezosa:
   al abrir el detalle de un diseño con data:URL se sube sola a Storage.
3. **Preflight de impresión**: `printPreflight.ts` evalúa DPI efectivo contra presets de
   producto (ok ≥95% de 300 DPI, warn hasta 150, bad debajo). Un pedido con veredicto 'bad'
   exige aprobación explícita del cliente (`design_client_approved`). El candado PoD
   (`pod_permitido === false`) bloquea seleccionar el diseño en pedidos.
4. **ESLint react-hooks estricto**: NO setState directo en body de effects — usar función
   async anidada (`const run = async () => {...}; void run();`). Estados que dependen de
   props se inicializan con lazy initializer + remount por `key`, no con efectos de reset.
5. **Performance ya hecha**: DesignStudioModal y MockupPreviewModal son lazy chunks;
   imagetracerjs corre en Web Worker (`workers/vectorize.worker.ts`); no volver a
   importarlos estático en el bundle principal.
6. **Tipos de DB**: `database.types.ts` se parchea a mano con cada migración. Regenerar con
   CLI solo si se mergea bien con los agregados custom.
7. **Errores preexistentes de lint ignorados a propósito** (no "arreglar" sin pedirlo):
   imports sin usar en OrdersDashboard y QuoteDashboard, `no-useless-catch` en useOrderStore:222.

## Migraciones de base de datos

Archivos numerados en `sql/`. Aplicar con Management API (requiere SUPABASE_TOKEN vigente):

```powershell
$env:SUPABASE_TOKEN="sbp_..."; node "$env:TEMP\opencode\apply-migration.cjs" sql\NNN_nombre.sql
```

Proyecto Supabase: `gjzvdepevoviygrcdwqj`. Aplicada más reciente: `016_design_storage.sql`
(bucket privado `design-images` + políticas para authenticated).

## Estado del proyecto (agosto 2026)

Roadmap de dos pistas COMPLETO:
- Pista 1 (producto): preflight diseño→pedido, mockups canvas para WhatsApp, costo/margen en cotizador, trazabilidad pedido↔diseño
- Pista 2 (técnica): rate limiting + timeouts en worker, reset de stores al cambiar tenant, lazy-load + Web Worker, suite vitest, imágenes en Supabase Storage

Pendientes conocidos:
- Generación de imágenes Gemini bloqueada por free tier (`limit:0`): requiere billing activo
- Rotar claves (GEMINI_API_KEY, tokens) — ver siguiente sección

## ⚠️ Seguridad temporal

`.env` y `.dev.vars` están commiteados TEMPORALMENTE porque el dueño trabaja desde dos PCs.
No hacer el repo público mientras duren. Cuando vuelva a una PC: quitarlos del repo,
gitignorearlos y rotar GEMINI_API_KEY.
