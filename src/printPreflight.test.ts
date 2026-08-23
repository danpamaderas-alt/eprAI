import { describe, it, expect } from 'vitest';
import {
  evaluatePreset,
  evaluatePrint,
  PRODUCT_PRESETS,
  TARGET_DPI,
} from './modules/sublimation/utils/printPreflight';

const pxForDpi = (cm: number, dpi: number) => Math.round((cm / 2.54) * dpi);

describe('printPreflight', () => {
  const taza = PRODUCT_PRESETS.find((p) => p.id === 'taza-11oz')!;

  it('marca ok cuando el DPI efectivo alcanza el objetivo', () => {
    const info = { widthPx: pxForDpi(taza.widthCm, TARGET_DPI), heightPx: pxForDpi(taza.heightCm, TARGET_DPI) };
    expect(evaluatePreset(info, taza).verdict).toBe('ok');
  });

  it('tolera un 5% por debajo del objetivo (umbral 0.95)', () => {
    const info = { widthPx: pxForDpi(taza.widthCm, TARGET_DPI), heightPx: pxForDpi(taza.heightCm, TARGET_DPI * 0.96) };
    expect(evaluatePreset(info, taza).verdict).toBe('ok');
  });

  it('marca warn entre 150 y 300 DPI', () => {
    const info = { widthPx: pxForDpi(taza.widthCm, 200), heightPx: pxForDpi(taza.heightCm, 200) };
    const r = evaluatePreset(info, taza);
    expect(r.verdict).toBe('warn');
    expect(r.effectiveDpiW).toBe(200);
  });

  it('usa el eje más chico para decidir (una dimensión mala arruina)', () => {
    const info = { widthPx: pxForDpi(taza.widthCm, 400), heightPx: pxForDpi(taza.heightCm, 100) };
    expect(evaluatePreset(info, taza).verdict).toBe('bad');
  });

  it('marca bad por debajo de 150 DPI', () => {
    const info = { widthPx: pxForDpi(taza.widthCm, 72), heightPx: pxForDpi(taza.heightCm, 72) };
    expect(evaluatePreset(info, taza).verdict).toBe('bad');
  });

  it('evaluatePrint sin preset evalúa los 8 productos y devuelve maxPrintCm a 300 DPI', () => {
    const a4 = { widthPx: 2480, heightPx: 3508 };
    const r = evaluatePrint(a4);
    expect(r.presets).toHaveLength(PRODUCT_PRESETS.length);
    expect(r.verdict).toBeNull();
    expect(r.maxPrintCm.widthCm).toBeCloseTo(21.0, 0);
    expect(r.maxPrintCm.heightCm).toBeCloseTo(29.7, 0);
  });

  it('evaluatePrint con preset devuelve ese veredicto en la raíz', () => {
    const tiny = { widthPx: 100, heightPx: 100 };
    expect(evaluatePrint(tiny, taza).verdict?.verdict).toBe('bad');
  });
});
