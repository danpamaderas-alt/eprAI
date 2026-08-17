export interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function verifySupabaseJWT(
  authHeader: string | null,
  supabaseUrl: string,
): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  if (!token || token === 'mock-access-token') return false;

  try {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      { headers: { Authorization: `Bearer ${token}`, apikey: '' } },
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
      const authenticated = await verifySupabaseJWT(authHeader, env.SUPABASE_URL);
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

    return new Response('Not Found', { status: 404 });
  },
};
