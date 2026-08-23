// Mapea nombres de color de filamento a un código hex para mostrar el swatch.
// Cubre los colores sembrados (PLA) y los más comunes del rubro.

export const FILAMENT_COLOR_HEX: Record<string, string> = {
  NEGRO: '#1f2937',
  BLANCO: '#f1f5f9',
  GRIS: '#9ca3af',
  PLATEADO: '#cbd5e1',
  DORADO: '#d4af37',
  ROJO: '#ef4444',
  NARANJA: '#f97316',
  AMARILLO: '#facc15',
  VERDE: '#22c55e',
  CELESTE: '#38bdf8',
  AZUL: '#3b82f6',
  VIOLETA: '#8b5cf6',
  ROSA: '#ec4899',
  MARRON: '#92400e',
  NATURAL: '#d9d3c3',
  TRANSPARENTE: '#e2e8f0',
  MULTICOLOR: '#a855f7',
};

const DEFAULT_HEX = '#64748b';

export const colorHexForName = (name?: string | null): string => {
  if (!name) return DEFAULT_HEX;
  const key = name.trim().toUpperCase();
  return FILAMENT_COLOR_HEX[key] ?? DEFAULT_HEX;
};
