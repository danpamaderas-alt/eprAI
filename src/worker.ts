export interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, */*',
};

interface ScrapeResult {
  platform: 'makerworld' | 'generic';
  name?: string;
  category?: string;
  material?: string;
  layer_height?: number | null;
  infill?: number | null;
  estimated_time_hours?: number | null;
  estimated_grams?: number | null;
  imagen?: string;
  description?: string;
}

const fetchWithTimeout = async (url: string, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: BROWSER_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const extractMakerWorldDesignId = (url: URL): string | null => {
  const match = url.pathname.match(/\/models\/(\d+)/);
  if (match) return match[1];
  const query = url.searchParams.get('designId');
  if (query && /^\d+$/.test(query)) return query;
  return null;
};

const extractMakerWorldProfileId = (url: URL): string | null => {
  const match = url.hash.match(/profileId[=_-](\d+)/i);
  return match ? match[1] : null;
};

const toNumber = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const n = parseFloat(String(value).replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const uniqueTypes = (values: unknown[]): string[] =>
  [...new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))];

const jsonString = (value: unknown): string =>
  typeof value === 'string' ? value : value != null ? String(value) : '';

const getCategoryName = (categories: unknown): string | undefined => {
  if (!Array.isArray(categories)) return undefined;
  for (const cat of categories) {
    if (cat && typeof cat === 'object' && 'name' in cat) {
      const name = jsonString((cat as { name?: unknown }).name).trim();
      if (name) return name;
    }
    if (typeof cat === 'string' && cat.trim()) return cat.trim();
  }
  return undefined;
};

const getByPath = (obj: Record<string, unknown>, path: string[]): unknown => {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

async function scrapeMakerWorld(designId: string, url: URL): Promise<ScrapeResult | null> {
  const endpoints = [
    `https://makerworld.com/api/v1/design-service/design/${designId}`,
    `https://api.bambulab.com/v1/design-service/design/${designId}`,
  ];

  let design: Record<string, unknown> | null = null;
  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithTimeout(endpoint);
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      if (data && typeof data === 'object') {
        design = data;
        break;
      }
    } catch {
      /* intentar siguiente endpoint */
    }
  }

  if (!design) return null;

  const instances = Array.isArray(design.instances) ? design.instances : [];
  const defaultId = jsonString(design.defaultInstanceId);
  const profileIdFromUrl = extractMakerWorldProfileId(url);
  let instance: Record<string, unknown> | null = null;

  const findInstance = (match: string): Record<string, unknown> | null => {
    if (!match) return null;
    return (
      instances.find(
        (inst) =>
          inst &&
          typeof inst === 'object' &&
          (String((inst as Record<string, unknown>).id) === match ||
            String((inst as Record<string, unknown>).profileId) === match),
      ) ?? null
    );
  };

  instance = findInstance(profileIdFromUrl) ?? findInstance(defaultId);
  if (!instance && instances.length > 0) {
    instance = instances[0] as Record<string, unknown>;
  }

  const projectSettings = getByPath(
    instance as Record<string, unknown>,
    ['extention', 'modelInfo', 'projectSettings'],
  ) as Record<string, unknown> | null;

  const filaments = Array.isArray(instance?.instanceFilaments)
    ? (instance.instanceFilaments as Array<Record<string, unknown>>)
    : [];

  const grams = toNumber(instance?.weight ?? getByPath(design, ['weight']));
  const timeSeconds = toNumber(instance?.prediction ?? getByPath(design, ['prediction']));

  return {
    platform: 'makerworld',
    name: jsonString(design.titleTranslated || design.title) || undefined,
    category: getCategoryName(design.categories),
    material: uniqueTypes(filaments.map((f) => f.type)).join(' / ') || undefined,
    layer_height: toNumber(projectSettings?.layerHeight),
    infill: toNumber(projectSettings?.sparseInfillDensity),
    estimated_time_hours: timeSeconds != null ? Math.round((timeSeconds / 3600) * 10) / 10 : null,
    estimated_grams: grams != null ? Math.round(grams) : null,
    imagen:
      jsonString(design.coverLandscape) ||
      jsonString(design.coverPortrait) ||
      jsonString(design.coverUrl) ||
      undefined,
    description: jsonString(design.summaryTranslated || design.summary) || undefined,
  };
}

const parseMeta = (html: string, regex: RegExp): string | undefined => {
  const match = html.match(regex);
  if (!match?.[1]) return undefined;
  return match[1].trim().replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
};

async function scrapeGeneric(url: URL): Promise<ScrapeResult> {
  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) throw new Error(`No se pudo acceder al enlace (HTTP ${res.status}).`);
  const html = await res.text();

  const name =
    parseMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    parseMeta(html, /<title[^>]*>([^<]+)<\/title>/i);
  const image = parseMeta(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const description = parseMeta(
    html,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );

  return { platform: 'generic', name, imagen: image, description };
}

async function scrapeFromLink(rawUrl: string): Promise<ScrapeResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('El enlace no es una URL válida.');
  }

  const host = url.hostname.toLowerCase();
  if (host.includes('makerworld.com') || host.endsWith('.makerworld.com')) {
    const designId = extractMakerWorldDesignId(url);
    if (designId) {
      const result = await scrapeMakerWorld(designId, url);
      if (result) return result;
    }
  }

  return scrapeGeneric(url);
}

interface SublimationScrapeResult {
  platform: string;
  name?: string;
  imagen?: string;
  description?: string;
  designer?: string;
  price?: number | null;
  currency?: string;
}

const SUBLIMATION_PLATFORM_MAP: { matcher: RegExp; name: string }[] = [
  { matcher: /creativefabrica\.com/i, name: 'Creative Fabrica' },
  { matcher: /designbundles\.net/i, name: 'Design Bundles' },
  { matcher: /(^|\.)etsy\.com/i, name: 'Etsy' },
  { matcher: /thehungryjpeg\.com/i, name: 'The Hungry JPEG' },
  { matcher: /sofontsy\.com/i, name: 'So Fontsy' },
  { matcher: /vexels\.com/i, name: 'Vexels' },
  { matcher: /creativemarket\.com/i, name: 'Creative Market' },
  { matcher: /freepik\.com/i, name: 'Freepik' },
  { matcher: /vecteezy\.com/i, name: 'Vecteezy' },
  { matcher: /elements\.envato\.com/i, name: 'Envato Elements' },
  { matcher: /mydigitalstudio\.net/i, name: 'MyDigitalStudio' },
  { matcher: /plantillasparasublimar\.com/i, name: 'Plantillas para Sublimar' },
  { matcher: /designcuts\.com/i, name: 'Design Cuts' },
  { matcher: /fontbundles\.net/i, name: 'Font Bundles' },
  { matcher: /craftbundles\.(com|net)/i, name: 'CraftBundles' },
  { matcher: /shutterstock\.com/i, name: 'Shutterstock' },
  { matcher: /stockadobe|stock\.adobe\.com/i, name: 'Adobe Stock' },
];

const parseMetaMulti = (html: string, properties: string[]): string | undefined => {
  for (const prop of properties) {
    const value = parseMeta(html, new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'));
    if (value) return value;
  }
  return undefined;
};

const detectSublimationPlatform = (host: string): string => {
  for (const entry of SUBLIMATION_PLATFORM_MAP) {
    if (entry.matcher.test(host)) return entry.name;
  }
  return 'Otro';
};

async function scrapeSublimationFromLink(rawUrl: string): Promise<SublimationScrapeResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('El enlace no es una URL válida.');
  }

  const res = await fetchWithTimeout(url.toString());
  if (!res.ok) throw new Error(`No se pudo acceder al enlace (HTTP ${res.status}).`);
  const html = await res.text();

  const name =
    parseMetaMulti(html, ['og:title', 'twitter:title']) ??
    parseMeta(html, /<title[^>]*>([^<]+)<\/title>/i);
  const image = parseMetaMulti(html, ['og:image', 'twitter:image']);
  const description = parseMetaMulti(html, ['og:description', 'twitter:description']);

  const designer =
    parseMetaMulti(html, ['og:site_name']) ??
    parseMeta(html, /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i);

  let price: number | null = null;
  let currency: string | undefined;

  const priceMeta = parseMetaMulti(html, [
    'product:price:amount',
    'og:price:amount',
    'og:price:standard_amount',
    'twitter:data1',
  ]);
  const currencyMeta = parseMetaMulti(html, ['product:price:currency', 'og:price:currency']);

  if (priceMeta) {
    const cleaned = priceMeta.replace(/[$€£]/g, '').replace(/,/g, '').trim();
    const n = toNumber(cleaned);
    if (n != null && n >= 0) price = n;
    if (currencyMeta) currency = currencyMeta.trim();
  }

  return {
    platform: detectSublimationPlatform(url.hostname),
    name,
    imagen: image,
    description,
    designer,
    price,
    currency,
  };
}

const GEMINI_IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-2.0-flash-preview-image-generation'];

const DESIGN_TOOL_PROMPTS: Record<string, (product?: string) => string> = {
  remove_bg: () =>
    'Remove the background of this artwork completely and cleanly. Output the design with a fully transparent background as PNG. Keep colors, shapes and proportions identical to the original. Do not add shadows, borders or new elements.',
  mockup: (product) =>
    `Create a photorealistic product mockup: place this exact flat artwork on ${product ?? 'a white ceramic mug'}. Professional studio photography, neutral light background, soft realistic lighting and perspective. The artwork must remain unchanged, centered and clearly visible.`,
};

interface DesignToolBody {
  action?: string;
  imageBase64?: string;
  mimeType?: string;
  product?: string;
}

interface GeminiImageResponse {
  candidates?: {
    content?: {
      parts?: {
        inlineData?: GeminiInlineData;
        inline_data?: GeminiInlineData;
      }[];
    };
  }[];
}

interface GeminiInlineData {
  data?: string;
  mimeType?: string;
  mime_type?: string;
}

async function callGeminiImageEdit(
  env: Env,
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<{ imageBase64: string; mimeType: string }> {
  let lastError = 'No se pudo procesar la imagen.';

  for (const model of GEMINI_IMAGE_MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
              ],
            },
          ],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      },
    );

    if (!response.ok) {
      lastError = `El modelo de imagen respondió HTTP ${response.status}.`;
      continue;
    }

    const data = (await response.json()) as GeminiImageResponse;
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData ?? part.inline_data;
      if (!inline?.data) continue;
      return {
        imageBase64: inline.data,
        mimeType: inline.mimeType ?? inline.mime_type ?? 'image/png',
      };
    }
    lastError = 'El modelo no devolvió ninguna imagen.';
  }

  throw new Error(lastError);
}

async function verifySupabaseJWT(
  authHeader: string | null,
  supabaseUrl: string,
  apikey: string,
): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  if (!token || token === 'mock-access-token') return false;

  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      { headers: { Authorization: `Bearer ${token}`, apikey } },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/gemini' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const authenticated = await verifySupabaseJWT(authHeader, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      if (!authenticated) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }

      try {
        const body = await request.json();

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        );

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch {
        return new Response(
          JSON.stringify({ error: 'Proxy error' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
    }

    if (url.pathname === '/api/scrape-3d' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const authenticated = await verifySupabaseJWT(authHeader, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      if (!authenticated) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }

      try {
        const body = (await request.json()) as { url?: string };
        if (!body.url?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Falta el enlace del modelo.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
          );
        }

        const result = await scrapeFromLink(body.url.trim());
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo extraer la información del enlace.';
        return new Response(
          JSON.stringify({ error: message }),
          { status: 422, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
    }

    if (url.pathname === '/api/scrape-sublimation' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const authenticated = await verifySupabaseJWT(authHeader, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      if (!authenticated) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }

      try {
        const body = (await request.json()) as { url?: string };
        if (!body.url?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Falta el enlace del diseño.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
          );
        }

        const result = await scrapeSublimationFromLink(body.url.trim());
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo extraer la información del enlace.';
        return new Response(
          JSON.stringify({ error: message }),
          { status: 422, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
    }

    if (url.pathname === '/api/design-tools' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      const authenticated = await verifySupabaseJWT(authHeader, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      if (!authenticated) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }

      try {
        const body = (await request.json()) as DesignToolBody;
        const promptBuilder = body.action ? DESIGN_TOOL_PROMPTS[body.action] : undefined;
        if (!promptBuilder) {
          return new Response(
            JSON.stringify({ error: 'Acción inválida. Usá remove_bg o mockup.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
          );
        }
        if (!body.imageBase64?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Falta la imagen a procesar.' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
          );
        }
        if (!env.GEMINI_API_KEY) {
          return new Response(
            JSON.stringify({ error: 'El servidor no tiene configurada GEMINI_API_KEY.' }),
            { status: 503, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
          );
        }

        const result = await callGeminiImageEdit(
          env,
          body.imageBase64.trim(),
          body.mimeType ?? 'image/png',
          promptBuilder(body.product),
        );
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo procesar el diseño.';
        return new Response(
          JSON.stringify({ error: message }),
          { status: 422, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
        );
      }
    }

    if (url.pathname.startsWith('/api/') || request.method !== 'GET') {
      return new Response('Not Found', { status: 404 });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    return env.ASSETS.fetch(new Request(new URL('/', request.url)));
  },
};
