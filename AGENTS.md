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

Proyecto Supabase: `gjzvdepevoviygrcdwqj`. Aplicada más reciente: `020_print_jobs_3d.sql`
(token rotado tras usar: pedir al usuario revocarlo si no lo hizo). Última aplicada con bucket:
`016_design_storage.sql` (bucket privado `design-images` + políticas para authenticated).

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

## 📋 Registro de cambios y lecciones aprendidas

**Regla permanente**: tras cada cambio significativo o bug resuelto, agregar una entrada
acá SIN que el usuario lo pida. Incluir errores propios: documentan trampas del entorno.
Mantener las últimas ~10 entradas y podar las viejas.

### Lecciones del entorno (no repetir)

- **Rutas de Web Worker**: `new URL('./x.worker.ts', import.meta.url)` resuelve relativa al
  ARCHIVO que la escribe. Desde `utils/vectorize.ts`, el worker en `workers/` es
  `../workers/`. Costó un build roto (`[UNRESOLVED_ENTRY]` de rolldown).
- **PowerShell 5.1 + JSON**: reescribir package.json con `ConvertFrom-Json | ConvertTo-Json |
  Set-Content -Encoding utf8` agrega BOM y Vite/PostCSS rompen con `Unexpected token`.
  Fix: `[System.IO.File]::WriteAllText($ruta, $texto, [System.Text.UTF8Encoding]::new($false))`.
- **Tests en `src/*.test.ts`**: los imports relativos parten de la ubicación del archivo:
  módulos vecinos van con `./`, no `../`.
- **API printPreflight**: `evaluatePrint(info, preset)` con preset custom devuelve en
  `.verdict` un OBJETO `PresetVerdict` (el string está en `.verdict.verdict`). Así lo
  consume DesignStudioModal; no "corregir" sin tocar el consumidor.
- **Deploy = push a main** (CI). Verificar con poll HTTP 200 tras ~75 s. Evitar
  `wrangler dev` local (crashea por libuv en este Windows).
- **Tokens pegados en chat quedan comprometidos**: recordar al usuario revocar/rotar.

### Historial reciente

- **2026-08 UX carga de G-code: archivo primero, impresora después** — El dueño no podía
  cargar G-codes: el flujo exigía escribir la impresora ANTES de elegir el archivo (si
  elegías primero, se rechazaba y quedaba sin asignar) y el file picker filtraba por
  accept=".gcode,.gco,.nc" (variantes como .bgcode/.tap quedaban grises en Windows).
  Nuevo flujo en PrintModelFilesSection: se elige el archivo y si no hay impresora
  escrita Swal pregunta con input obligatorio; input inline pasa a opcional con
  datalist de impresoras ya usadas (sugerencias); gcode input SIN accept (acepta todo).
- **2026-08 auditoría detalle modelo 3D: delete seguro + purga de storage** — Dos bugs
  reales corregidos en PrintModelDetailModal: (1) "Eliminar" borraba el modelo SIN
  confirmación (la página sí preguntaba con Swal, el modal no) — ahora Swal.fire
  idéntico al patrón de PrintRepository.tsx; (2) deleteModel borra filas por CASCADE
  pero los STL/G-code quedaban huérfanos para siempre en el bucket print-files — nuevo
  `removeAllForModel(modelId)` en usePrintModelFileStore purga binarios (best-effort) +
  filas antes de eliminar. Menores: label de originales ahora incluye OBJ, fmtFormat con
  regex de extensión en vez de split().pop().
- **2026-08 fix RLS global: permission denied for user_company_id** — "Error al cargar
  los archivos" destapó un bug de la migración 008 (del 17/08): su `REVOKE EXECUTE ...
  FROM PUBLIC, anon, authenticated` sobre `private.user_company_id()` asumía que las
  expresiones de políticas RLS no chequean EXECUTE contra el rol consultante. ES FALSO:
  rompió las 37 tablas con tenant_isolation basado en esa función (orders, products,
  sales, remitos... HTTP 401 vía REST). Fix en dos migraciones APLICADAS: `024` (política
  inline en print_model_files) y `025` (GRANT USAGE schema private + EXECUTE función a
  anon/authenticated — la función solo devuelve el company_id del propio JWT, cero
  riesgo). Verificación: REST anon devuelve 200 en todas. **Lección: "solo usable dentro
  de políticas" no existe en Postgres; toda función referenciada por una política debe
  tener EXECUTE para los roles que consultan.**
- **2026-08 formatos libres y múltiples bandejas en archivos 3D** — Migración
  `023_print_model_files_formats.sql` (APLICADA): kind pasó de stl/gcode a original/gcode
  (UPDATE de datos incluido) + columna `format` backfilleada desde la extensión del
  archivo. UI: grupo "Originales" acepta .stl/.3mf/.step/.obj SIN límite de cantidad ni
  reemplazo automático (se elimina la lógica de STL único — el dueño imprime por
  bandejas), badge de formato por archivo; G-codes siguen por impresora y admiten varios
  por impresora (una fila = una bandeja).
- **2026-08 archivos STL/G-code en repositorio 3D** — Migración `022_print_model_files.sql`
  (APLICADA: tabla print_model_files con kind CHECK stl/gcode, printer_name para G-code,
  FK model_id ON DELETE CASCADE + bucket privado `print-files` con políticas authenticated).
  Store `usePrintModelFileStore` (upload path `{companyId}/{modelId}/{uuid}.{ext}`, STL
  único por modelo con reemplazo automático, firma on-demand con `download: true`).
  Sección "Archivos de impresión" en el detalle del modelo: adjuntar/descargar/borrar STL
  y un G-code por impresora (input impresora obligatorio antes del file picker).
- **2026-08 repositorio 3D: tiempo HH:MM + puente a calculadora** — Tiempo del repositorio
  migrado a HH:MM: formulario con input HH:MM (muestra horas decimales y días debajo),
  cards y detalle usan `formatHoursHuman` (nuevo helper en shared/utils/format.ts:
  "2d 03:30" si ≥24h). Botón "Calcular costo" en el detalle navega a
  `/calculadora-3d?fromModel=..&name=..&weight=..&time=HH:MM`; Print3DCalculator precarga
  pieceWeight/printTime/jobName vía lazy initializer con useSearchParams (sin setState en
  effects) y guarda `fromModelRef` para vincular model_id al "Enviar a producción".
  Lección: leer searchParams en lazy initializers de useState, no en effects.
- **2026-08 producción 3D ↔ repositorio/ventas/remitos** — Integración completa del flujo:
  migración `021_print_jobs_3d_model_link.sql` (APLICADA: columnas model_id FK→print_models,
  actual_cost_total, sale_id FK→sales, remito_id FK→remitos), botón "A Producción" en el
  detalle del modelo (crea trabajo presupuestado con estimaciones del modelo) y modal
  "Desde repositorio" en PrintJobsPage (modelo+cantidad+impresora+filamento, estimaciones
  auto-editables). `completeJob` ahora registra costo real (peso real × cost_per_kg del
  rollo). Nuevo `deliverJob`: inserta venta directa en `sales` (business_unit
  'impresion-3d', status COBRADO/DEUDA según método — la política FOR ALL de sales cubre
  INSERT, no hace falta RPC) + remito DELIVERED/VALUED con specs técnicas embebidas en
  items.details + vincula job a ambos. Modal de entrega pide método pago/total/cliente.
  Lección TS: tipo Update derivado de Row NO debe incluir campos de join (`print_models`)
  o supabase lo rechaza como `never`; anotar retorno explícito en acciones que llaman
  `getState()` para cortar ciclos de inferencia.
- **2026-08 UI simplificada** — Eliminados los botones flotantes de arriba a la derecha
  (buscador Ctrl+K y ThemeToggle) y la CommandPalette completa (componente borrado).
  El modo oscuro ahora vive en Configuración → General → "Apariencia" (usa useThemeStore,
  mismo store de antes). Borrados `src/components/ThemeToggle.tsx` y
  `src/shared/components/command-palette/`. Motivo: pedido directo del dueño ("dejá solo
  lo que está en el menú").
- **2026-08 producción 3D (print_jobs_3d)** — Nuevo flujo de cola de trabajos de impresión 3D:
  migración `sql/020_print_jobs_3d.sql` (PENDIENTE de aplicar: no había SUPABASE_TOKEN
  vigente en esta sesión), módulo `src/modules/printjobs/` (types con NEXT_STATUS map +
  store Zustand con tenant-reset; `completeJob` descuenta el peso real del rollo vía
  `useFilamentStore.consumeGrams` UNA sola vez, guard contra doble descuento), página
  `PrintJobsPage` (KPIs: activos/completados/gramos/tasa fallos/desvío tiempo real;
  filtros por estado; modal sweetalert2 para completar pidiendo peso g + tiempo HH:MM),
  ruta `/produccion-3d` y botón "Enviar a producción" en Print3DCalculator que inserta
  snapshot (inputs jsonb + estimaciones). Lecciones TS: supabase rechaza
  `Record<string, unknown>` como `Json` — castear explícito (`inputs as Json`) y armar
  payload con tipo `Omit<T,'inputs'> & { inputs?: Json }`, los spread condicionales no
  narrow bien. El lint error `any` de Sidebar.tsx:342 es PREEXISTENTE (verificado con
  git stash), no tocar sin pedirlo.
- **2026-08 features pendientes (WhatsApp/Mockups/Blanks)** — Tres integraciones cruzadas:
  botón de WhatsApp en Cotizador (`handleShareWhatsApp` abre `wa.me` con resumen del
  presupuesto), Mockups Base conectado a `MockupPreviewModal` (templates de la tabla
  `mockup_templates` mapeados a productos canvas vía `TEMPLATE_TYPE_TO_PRODUCT`; ojo: el
  store real vive en `src/modules/mockups/store/`, NO crear otro en `designs/store`),
  y selector de Blanks en Calculadora de Costos (categoría Textil autocompleta el costo
  desde `textile_blanks.cost_price`, aviso ⚠️ si stock <= mínimo). Lecciones: verificar
  con Glob si el store ya existe antes de crearlo — se duplicó uno con datos fake;
  los dos lint errors nuevos eran patrones prohibidos por convención #4 (historial de
  localStorage pasó a lazy initializer, `fetchData` movido antes del effect).
- **2026-08 typecheck limpio (250→0)** — Limpieza de deuda de tipos en una sesión:
  `database.types.ts` reconstruido contra la BD real: agregadas 7 tablas faltantes
  (`sales`, `remitos`, `resellers`, `reseller_transactions`, `stock_movements`,
  `3d_materials_stock`, `clients`), ~14 columnas que faltaban (address/email/etc.),
  y 11 funciones RPC tipadas. `react-to-print` v3 usa `contentRef` (no `content`) —
  rompía 3 archivos. Stores de datos castean a `Insert`/`Update` de la BD
  (`OrderDbUpdate`, `ProductUpdate`, etc.) por desalineación de tipos locales.
  Handlers de OrdersDashboard/Kanban/Calendar tipados (antes `any` → TS7006).
  Quitado `payments_param` de `process_sale_atomic` (la RPC real no lo acepta) y
  `payments` de la firma `processSale`. Lección: el typegen de PostgREST caza
  columnas/relaciones reales ausentes en los tipos; reconciliar con
  `information_schema` vía Management API es más confiable que parchear a mano.
- **2026-08 repos por rubro** — Separación del negocio en módulos por rubro:
  Filamentos (`print_filaments`, sql/017, costo/kg real que alimenta la Calculadora 3D
  vía selector "Filamento del inventario"), Blanks e Insumos (`textile_blanks`, sql/018,
  stock mínimo con aviso de reposición) y Mockups Base (`mockup_templates`, sql/019,
  áreas de impresión en mm). Menú lateral reagrupado en secciones: Operación /
  Impresión 3D / Textil y Sublimación / Stock y Compras / Finanzas / CRM. Los tres
  stores copian el patrón printrepo (tenant-reset incluido). `database.types.ts`
  parcheado a mano con las 3 tablas.
- **2026-08 formato de hora** — Campos de tiempo de la Calc. 3D migrados a HH:MM
  (`TimeField` con horas decimales debajo; soporta >24 h). Helpers nuevos en
  `shared/utils/format.ts`: `formatDate`, `formatDateTime`, `hoursToTime`,
  `timeToHours`. PDF usa fecha explícita dd/mm/aaaa hh:mm. Lección: `toLocaleString`
  en el PDF era ambiguo para el dueño; preferir formato explícito es-AR armado a mano.
- **2026-08 hotfix dashboard/pedidos** — Tres referencias rotas que el build NO detecta
  (no hay gate tsc): `KpiSkeleton` sin importar en DashboardInicio (crash visible:
  "Error en el dashboard"), `set(...)` fuera de scope en la suscripción tenant-reset de
  useOrderStore (debía ser `useOrderStore.setState`, como sí hizo bien useSublimationStore),
  y cast a `DedicatedWorkerGlobalScope` sin tipo en vectorize.worker. **Lección: tras cada
  feature correr `npx tsc --noEmit -p tsconfig.app.json` y grepear "Cannot find name"**;
  ESLint no caza no-undef en este proyecto.
- **2026-08 `bcefbf3`** — AGENTS.md con contexto completo para sesiones multi-PC.
- **2026-08 `3a20f5a`** — .env/.dev.vars commiteados TEMPORALMENTE (2 PCs); rotar claves al revertir.
- **2026-08 `ad3366a`** — Imágenes de diseños a Supabase Storage: bucket privado
  `design-images` + políticas para authenticated (SQL sobre storage.buckets/objects),
  firma on-demand con caché, subida desde formulario y migración perezosa de data-URLs
  al abrir detalle. Los 6 consumidores de `imagen` resuelven vía `useImageSrc`.
- **2026-08 `cf126f2`** — Suite vitest inicial (25 tests). Rate limiter extraído a util
  puro `shared/utils/rateLimit.ts` para poder testearlo; worker importa de ahí.
- **2026-08 `f4dac60`** — Modales Studio/Mockup lazy + vectorización en Web Worker con
  fallback main-thread (si Worker constructor falla o onerror dispara).
