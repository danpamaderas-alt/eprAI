export interface RateLimiter {
  check: (key: string) => boolean;
}

const DEFAULT_WINDOW_MS = 60_000;

/**
 * Rate limiter de ventana deslizante, en memoria (por isolado del worker).
 * check() devuelve true si la key tiene cupo disponible en la ventana.
 */
export const createRateLimiter = (
  maxPerWindow: number,
  windowMs = DEFAULT_WINDOW_MS,
): RateLimiter => {
  const buckets = new Map<string, number[]>();

  return {
    check(key: string): boolean {
      const now = Date.now();
      const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
      if (hits.length >= maxPerWindow) {
        buckets.set(key, hits);
        return false;
      }
      hits.push(now);
      buckets.set(key, hits);
      if (buckets.size > 5000) {
        for (const [k, v] of buckets) {
          if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
        }
      }
      return true;
    },
  };
};

/** Deriva una key estable sin guardar el token crudo en memoria. */
export const rateLimitKey = (prefix: string, token: string | null): string => {
  let h = 0;
  const t = token ?? '';
  for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0;
  return `${prefix}:${h.toString(36)}`;
};
