-- 022_print_model_files.sql
-- Archivos adjuntos del repositorio 3D: STL (uno por modelo) y G-code
-- (uno por impresora). Binarios en bucket privado 'print-files'.

CREATE TABLE IF NOT EXISTS public.print_model_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.print_models(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'gcode' CHECK (kind IN ('stl', 'gcode')),
  printer_name text,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_print_model_files_model ON public.print_model_files(model_id);
CREATE INDEX IF NOT EXISTS idx_print_model_files_company ON public.print_model_files(company_id);

DROP TRIGGER IF EXISTS trg_print_model_files_updated_at ON public.print_model_files;
CREATE TRIGGER trg_print_model_files_updated_at
  BEFORE UPDATE ON public.print_model_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.print_model_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.print_model_files;
CREATE POLICY tenant_isolation ON public.print_model_files
  FOR ALL USING (company_id = (SELECT private.user_company_id()));

-- Bucket privado para STL / G-code
INSERT INTO storage.buckets (id, name, public)
VALUES ('print-files', 'print-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "print_files_select" ON storage.objects;
DROP POLICY IF EXISTS "print_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "print_files_update" ON storage.objects;
DROP POLICY IF EXISTS "print_files_delete" ON storage.objects;

CREATE POLICY "print_files_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'print-files');

CREATE POLICY "print_files_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'print-files');

CREATE POLICY "print_files_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'print-files');

CREATE POLICY "print_files_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'print-files');

COMMENT ON TABLE public.print_model_files IS 'Adjuntos de print_models: kind stl/gcode; gcode designado por impresora.';
