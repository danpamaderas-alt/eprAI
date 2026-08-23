-- 029_backfill_filament_colors.sql
-- Rellena color_hex segun color_name para los rollos que no lo tengan.
-- Mapeo en ASCII (sin acentos) para evitar problemas de encoding.

UPDATE public.print_filaments
SET color_hex = CASE lower(color_name)
  WHEN 'negro'      THEN '#1f2937'
  WHEN 'blanco'     THEN '#f1f5f9'
  WHEN 'gris'       THEN '#9ca3af'
  WHEN 'plateado'   THEN '#cbd5e1'
  WHEN 'dorado'     THEN '#d4af37'
  WHEN 'rojo'       THEN '#ef4444'
  WHEN 'naranja'    THEN '#f97316'
  WHEN 'amarillo'   THEN '#facc15'
  WHEN 'verde'      THEN '#22c55e'
  WHEN 'celeste'    THEN '#38bdf8'
  WHEN 'azul'       THEN '#3b82f6'
  WHEN 'violeta'    THEN '#8b5cf6'
  WHEN 'rosa'       THEN '#ec4899'
  WHEN 'marron'     THEN '#92400e'
  WHEN 'natural'    THEN '#d9d3c3'
  WHEN 'transparente' THEN '#e2e8f0'
  WHEN 'multicolor' THEN '#a855f7'
  ELSE color_hex
END
WHERE color_hex IS NULL AND color_name IS NOT NULL;
