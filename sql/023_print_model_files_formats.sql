-- 023_print_model_files_formats.sql
-- Formato libre para el archivo original (stl/3mf/step/obj) y multiples
-- archivos sin restricciones (varias bandejas => varios gcode por impresora).

ALTER TABLE public.print_model_files DROP CONSTRAINT IF EXISTS print_model_files_kind_check;

UPDATE public.print_model_files SET kind = 'original' WHERE kind = 'stl';

ALTER TABLE public.print_model_files ADD COLUMN IF NOT EXISTS format text;

-- Backfill del formato desde el nombre de archivo
UPDATE public.print_model_files
SET format = lower(split_part(split_part(file_name, '?', 1), '.', -1))
WHERE format IS NULL AND file_name LIKE '%.%';

-- El formato se deriva de la extensión; si no se puede derivar queda 'bin'
UPDATE public.print_model_files SET format = 'bin' WHERE format IS NULL OR format = '';

ALTER TABLE public.print_model_files
  ADD CONSTRAINT print_model_files_kind_check CHECK (kind IN ('original', 'gcode'));

COMMENT ON COLUMN public.print_model_files.kind IS 'original = archivo fuente editable; gcode = instrucciones para una impresora';
