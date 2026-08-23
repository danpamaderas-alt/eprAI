/**
 * Extrae peso (g) y tiempo de impresión embebidos como comentarios por los slicers.
 *
 - PrusaSlicer: `; estimated printing time (normal mode) = 2h 15m 30s` + `; filament used [g] = 12.34`
 - Orca/Bambu:  `; model printing time: 1h 23m 45s; total printing time: ...` + `; total filament weight [g] : 12.34`
 - Cura:        `;TIME:5678` (segundos) + `;Filament used: 3.42m` (metros → gramos vía densidad)
 - Simplify3D:  `;   Build time: 01:02:03`
 - Marlin:      `M73 R12345` (segundos restantes, último gana)
 */

export interface GcodeStats {
  timeSeconds: number | null;
  grams: number | null;
}

/** mm de diámetro de filamento por defecto (1.75 estándar) */
const DEFAULT_DIAMETER_MM = 1.75;

/** densidad g/cm³ por material */
const DENSITY_BY_TYPE: Record<string, number> = {
  pla: 1.24,
  petg: 1.27,
  abs: 1.04,
  asa: 1.07,
  tpu: 1.21,
  pc: 1.2,
  nylon: 1.14,
  pa: 1.14,
  hips: 1.04,
  pva: 1.23,
};
const DEFAULT_DENSITY = DENSITY_BY_TYPE.pla;

/** Suma todos los números de una lista tipo "12.34, 5.67" */
const sumNumbers = (raw: string): number => {
  let total = 0;
  for (const m of raw.matchAll(/[\d]+(?:[.,]\d+)?/g)) {
    total += parseFloat(m[0].replace(',', '.'));
  }
  return total;
};

/** "2h 15m 30s" | "1d 3h" | "2 hours 30 minutes" | "45 seg" | "01:02:03" → segundos */
export const parseDurationToSeconds = (raw: string): number | null => {
  let total = 0;
  let found = false;

  const wordRe = /(\d+(?:[.,]\d+)?)\s*(d(?:ias?|ays?)?|h(?:oras?|ours?|rs?)?|minutos?|minutes?|mins?|m|segundos?|seconds?|secs?|seg|s)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(raw.toLowerCase())) !== null) {
    const u = m[2];
    const mult =
      u.startsWith('d') ? 86400 :
      u.startsWith('h') ? 3600 :
      u.startsWith('mi') || u === 'm' ? 60 : 1;
    total += parseFloat(m[1].replace(',', '.')) * mult;
    found = true;
  }

  if (!found) {
    const clock = raw.match(/(\d{1,3}):(\d{2}):(\d{2})/);
    if (clock) {
      total = Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
      found = true;
    }
  }

  return found ? Math.round(total) : null;
};

const extractTimeSeconds = (text: string): number | null => {
  const candidates: { re: RegExp; isRaw?: boolean }[] = [
    { re: /;\s*estimated printing time \(normal mode\)\s*=\s*([^\r\n]+)/i },
    { re: /;\s*estimated printing time \(silent mode\)\s*=\s*([^\r\n]+)/i },
    { re: /;\s*model printing time:\s*([^;\r\n]+)/i },
    { re: /;\s*total printing time:\s*([^;\r\n]+)/i },
    { re: /;\s*build time:\s*([^\r\n]+)/i },
    { re: /^;\s*time:\s*(\d+)\s*$/im, isRaw: true },
  ];
  for (const { re, isRaw } of candidates) {
    const m = text.match(re);
    if (m?.[1] != null) {
      const secs = isRaw ? Number(m[1]) : parseDurationToSeconds(m[1]);
      if (secs != null && Number.isFinite(secs) && secs > 0) return secs;
    }
  }
  // M73 R<segundos> (último gana)
  let last: number | null = null;
  for (const m of text.matchAll(/M73\s+[^\r\n]*R(\d+)/gi)) {
    last = Number(m[1]);
  }
  return last != null && last > 0 ? last : null;
};

const gramsFromLength = (
  meters: number,
  diameterMm: number,
  density: number,
): number => {
  const radiusCm = diameterMm / 10 / 2;
  const areaCm2 = Math.PI * radiusCm * radiusCm;
  return meters * 100 * areaCm2 * density;
};

const detectDensity = (text: string): number => {
  const m =
    text.match(/;\s*filament_type\s*=\s*([A-Za-z0-9_-]+)/i) ??
    text.match(/;\s*filament settings id.*?=\s*([A-Za-z]+)/i);
  const type = (m?.[1] ?? '').toLowerCase();
  const hit = Object.entries(DENSITY_BY_TYPE).find(([k]) => type.startsWith(k));
  return hit ? hit[1] : DEFAULT_DENSITY;
};

export const extractGcodeStats = (text: string): GcodeStats => {
  const timeSeconds = extractTimeSeconds(text);

  let grams: number | null = null;

  // 1) gramos directos (Prusa / Orca)
  const gramPatterns = [
    /;\s*total filament weight\s*\[g\]\s*[:=]\s*([^\r\n]+)/i,
    /;\s*filament used \[g\]\s*=\s*([^\r\n]+)/i,
  ];
  for (const re of gramPatterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const g = sumNumbers(m[1]);
      if (g > 0) {
        grams = g;
        break;
      }
    }
  }

  // 2) fallback: metros de filamento (Cura) → gramos con diámetro/densidad
  if (grams == null) {
    const lenMatch = text.match(/^\s*;\s*filament used:\s*([^\r\n]+?)\s*m\b/im);
    if (lenMatch?.[1]) {
      const meters = sumNumbers(lenMatch[1]);
      if (meters > 0) {
        const diaMatch = text.match(/;\s*filament_diameter\s*=\s*([\d.]+)/i);
        const diameter = diaMatch ? Number(diaMatch[1]) : DEFAULT_DIAMETER_MM;
        grams = gramsFromLength(meters, diameter, detectDensity(text));
      }
    }
  }

  return {
    timeSeconds,
    grams: grams != null ? Math.round(grams) : null,
  };
};

/**
 * Lee solo el inicio y el final del archivo (los slicers ponen los resúmenes
 * en la cabecera o al pie) para no escanear G-codes de decenas de MB.
 */
export const readGcodeStats = async (file: File): Promise<GcodeStats> => {
  const HEAD = 128 * 1024;
  const TAIL = 384 * 1024;
  const head = await file.slice(0, HEAD).text();
  const tail =
    file.size > HEAD ? await file.slice(Math.max(0, file.size - TAIL)).text() : '';
  return extractGcodeStats(`${head}\n${tail}`);
};
