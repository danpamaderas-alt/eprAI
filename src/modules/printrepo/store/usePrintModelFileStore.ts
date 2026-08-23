import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';
import type { PrintModelFile, PrintModelFileKind } from '../types';

export const PRINT_FILES_BUCKET = 'print-files';

const extFromName = (name: string): string => {
  const dot = name.lastIndexOf('.');
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'bin';
};

/** Sube el binario al bucket privado y devuelve el path de storage. */
export const uploadPrintFile = async (
  companyId: string,
  modelId: string,
  file: File,
): Promise<string> => {
  const ext = extFromName(file.name);
  const path = `${companyId}/${modelId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PRINT_FILES_BUCKET).upload(path, file, {
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);
  return path;
};

interface PrintModelFileState {
  files: PrintModelFile[];
  isLoading: boolean;
  error: string | null;

  fetchFiles: () => Promise<void>;
  attachFile: (args: {
    modelId: string;
    file: File;
    kind: PrintModelFileKind;
    printerName?: string | null;
  }) => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  getSignedDownloadUrl: (storagePath: string) => Promise<string | null>;
}

export const usePrintModelFileStore = create<PrintModelFileState>((set, get) => ({
  files: [],
  isLoading: false,
  error: null,

  fetchFiles: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('print_model_files')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      set({ files: (data as unknown as PrintModelFile[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los archivos';
      console.error('fetchFiles error:', err);
      set({ isLoading: false, error: message });
    }
  },

  attachFile: async ({ modelId, file, kind, printerName }) => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) throw new Error('No hay compañía activa.');

    const storagePath = await uploadPrintFile(companyId, modelId, file);

    const { data: row, error } = await supabase
      .from('print_model_files')
      .insert({
        company_id: companyId,
        model_id: modelId,
        kind,
        format: extFromName(file.name),
        printer_name: kind === 'gcode' ? (printerName?.trim() || null) : null,
        file_name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
      })
      .select()
      .single();
    if (error) throw error;

    set((state) => ({ files: [row as unknown as PrintModelFile, ...state.files] }));
  },

  removeFile: async (id) => {
    const existing = get().files.find((f) => f.id === id);
    if (!existing) return;

    const { error: dbError } = await supabase
      .from('print_model_files')
      .delete()
      .eq('id', id);
    if (dbError) throw dbError;

    // El binario se intenta borrar; si falla queda huérfano pero la DB queda consistente
    await supabase.storage.from(PRINT_FILES_BUCKET).remove([existing.storage_path]);

    set((state) => ({ files: state.files.filter((f) => f.id !== id) }));
  },

  getSignedDownloadUrl: async (storagePath) => {
    const { data, error } = await supabase.storage
      .from(PRINT_FILES_BUCKET)
      .createSignedUrl(storagePath, 3600, { download: true });
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    usePrintModelFileStore.setState({ files: [], isLoading: false, error: null });
  }
});
