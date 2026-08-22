export interface ProductPreset {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
}

export const PRODUCT_PRESETS: readonly ProductPreset[] = [
  { id: 'taza-11oz', label: 'Taza 11 oz', widthCm: 20, heightCm: 8.5 },
  { id: 'taza-magica', label: 'Taza mágica', widthCm: 19, heightCm: 8 },
  { id: 'remera-a4', label: 'Remera / textil A4', widthCm: 21, heightCm: 29.7 },
  { id: 'remera-a3', label: 'Remera / textil A3', widthCm: 29.7, heightCm: 42 },
  { id: 'mousepad', label: 'Mousepad', widthCm: 24, heightCm: 20 },
  { id: 'rompecabezas', label: 'Rompecabezas A4', widthCm: 21, heightCm: 29.7 },
  { id: 'botella', label: 'Botella acero', widthCm: 17, heightCm: 18 },
  { id: 'llavero', label: 'Llavero MDF', widthCm: 8, heightCm: 5 },
] as const;

export const TARGET_DPI = 300;

export type PreflightVerdict = 'ok' | 'warn' | 'bad';

export interface ImageInfo {
  widthPx: number;
  heightPx: number;
}

export interface PreflightReport {
  verdict: PresetVerdict | null;
  presets: PresetVerdict[];
  maxPrintCm: { widthCm: number; heightCm: number };
}

export interface PresetVerdict {
  preset: ProductPreset;
  effectiveDpiW: number;
  effectiveDpiH: number;
  verdict: PreflightVerdict;
}

export const loadImageInfo = (src: string): Promise<ImageInfo> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ widthPx: img.naturalWidth, heightPx: img.naturalHeight });
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para analizarla.'));
    img.src = src;
  });

const dpiFor = (px: number, cm: number): number => px / (cm / 2.54);

const verdictFor = (dpiW: number, dpiH: number): PreflightVerdict => {
  const min = Math.min(dpiW, dpiH);
  if (min >= TARGET_DPI * 0.95) return 'ok';
  if (min >= 150) return 'warn';
  return 'bad';
};

export const evaluatePreset = (info: ImageInfo, preset: ProductPreset): PresetVerdict => {
  const effectiveDpiW = Math.round(dpiFor(info.widthPx, preset.widthCm));
  const effectiveDpiH = Math.round(dpiFor(info.heightPx, preset.heightCm));
  return { preset, effectiveDpiW, effectiveDpiH, verdict: verdictFor(effectiveDpiW, effectiveDpiH) };
};

export const evaluatePrint = (info: ImageInfo, custom?: ProductPreset): PreflightReport => {
  const presets = (custom ? [custom] : PRODUCT_PRESETS).map((p) => evaluatePreset(info, p));
  return {
    verdict: custom ? presets[0] : null,
    presets,
    maxPrintCm: {
      widthCm: Math.round(((info.widthPx / TARGET_DPI) * 2.54) * 10) / 10,
      heightCm: Math.round(((info.heightPx / TARGET_DPI) * 2.54) * 10) / 10,
    },
  };
};

export const VERDICT_LABELS: Record<PreflightVerdict, { label: string; className: string }> = {
  ok: { label: 'Calidad óptima', className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  warn: { label: 'Aceptable', className: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  bad: { label: 'Va a salir pixelado', className: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
};
