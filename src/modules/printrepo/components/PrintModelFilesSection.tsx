import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileCode2, FileUp, Loader2, Trash2, Boxes } from 'lucide-react';
import {
  usePrintModelFileStore,
} from '../store/usePrintModelFileStore';
import { useToastStore } from '../../../store/useToastStore';
import type { PrintModelFileKind } from '../types';

const fmtSize = (bytes: number | null): string => {
  if (bytes == null) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface Props {
  modelId: string;
}

export const PrintModelFilesSection = memo(function PrintModelFilesSection({ modelId }: Props) {
  const toast = useToastStore((s) => s.toast);
  const { files, isLoading, error, fetchFiles, attachFile, removeFile, getSignedDownloadUrl } =
    usePrintModelFileStore();
  const [uploading, setUploading] = useState<PrintModelFileKind | null>(null);
  const [printerName, setPrinterName] = useState('');
  const stlInputRef = useRef<HTMLInputElement>(null);
  const gcodeInputRef = useRef<HTMLInputElement>(null);

  const modelFiles = useMemo(() => files.filter((f) => f.model_id === modelId), [files, modelId]);
  const stl = modelFiles.find((f) => f.kind === 'stl');
  const gcodes = modelFiles.filter((f) => f.kind === 'gcode');

  useEffect(() => {
    void fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async (path: string, fallbackName: string) => {
    try {
      const url = await getSignedDownloadUrl(path);
      if (!url) throw new Error('sin URL');
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      console.error(err);
      toast(`No se pudo descargar ${fallbackName}`, { type: 'error' });
    }
  };

  const handlePick = async (kind: PrintModelFileKind, file: File | undefined) => {
    if (!file) return;
    if (kind === 'gcode' && printerName.trim() === '') {
      toast('Escribí primero la impresora del G-code', { type: 'warning' });
      return;
    }
    setUploading(kind);
    try {
      await attachFile({ modelId, file, kind, printerName });
      toast(
        kind === 'stl'
          ? 'STL adjuntado al modelo'
          : `G-code guardado para «${printerName.trim()}»`,
        { type: 'success' },
      );
      setPrinterName('');
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Error al subir el archivo', { type: 'error' });
    } finally {
      setUploading(null);
      if (stlInputRef.current) stlInputRef.current.value = '';
      if (gcodeInputRef.current) gcodeInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await removeFile(id);
      toast(`${name} eliminado`, { type: 'info' });
    } catch (err) {
      console.error(err);
      toast('No se pudo eliminar', { type: 'error' });
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
        Archivos de impresión
      </p>

      {error && (
        <p className="text-[11px] font-bold text-rose-500">{error}</p>
      )}

      {/* STL */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <Boxes className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
              {stl ? stl.file_name : 'Sin STL adjunto'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              STL · {fmtSize(stl?.size_bytes ?? null)}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {stl && (
            <>
              <button type="button" onClick={() => void handleDownload(stl.storage_path, stl.file_name)}
                title="Descargar STL"
                aria-label={`Descargar ${stl.file_name}`}
                className="p-2 rounded-lg bg-brand-600/10 hover:bg-brand-600/20 text-brand-600 dark:text-brand-400 transition-colors">
                {uploading === 'stl' ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Download size={14} aria-hidden />}
              </button>
              <button type="button" onClick={() => void handleDelete(stl.id, stl.file_name)}
                title="Quitar STL"
                aria-label={`Eliminar ${stl.file_name}`}
                className="p-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 transition-colors">
                <Trash2 size={14} aria-hidden />
              </button>
            </>
          )}
          {!stl && (
            <button
              type="button"
              onClick={() => stlInputRef.current?.click()}
              disabled={uploading != null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-500 text-slate-500 dark:text-slate-400 hover:text-brand-500 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {uploading === 'stl' ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <FileUp size={12} aria-hidden />}
              Adjuntar STL
            </button>
          )}
        </div>
      </div>
      <input ref={stlInputRef} type="file" accept=".stl,model/stl,application/sla" className="hidden"
        onChange={(e) => void handlePick('stl', e.target.files?.[0])} />

      {/* G-codes */}
      {gcodes.map((g) => (
        <div key={g.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <FileCode2 className="w-4 h-4 text-violet-500 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{g.file_name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                G-CODE · {g.printer_name ?? 'sin impresora'} · {fmtSize(g.size_bytes)}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={() => void handleDownload(g.storage_path, g.file_name)}
              title={`Descargar G-code de ${g.printer_name ?? 'impresora'}`}
              aria-label={`Descargar ${g.file_name}`}
              className="p-2 rounded-lg bg-brand-600/10 hover:bg-brand-600/20 text-brand-600 dark:text-brand-400 transition-colors">
              <Download size={14} aria-hidden />
            </button>
            <button type="button" onClick={() => void handleDelete(g.id, g.file_name)}
              title="Quitar G-code"
              aria-label={`Eliminar ${g.file_name}`}
              className="p-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 transition-colors">
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </div>
      ))}

      {/* Alta de G-code */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
        <input
          type="text"
          value={printerName}
          onChange={(e) => setPrinterName(e.target.value)}
          placeholder="Impresora (ej: Ender 3 V2)"
          aria-label="Nombre de la impresora para el G-code"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => gcodeInputRef.current?.click()}
          disabled={uploading != null}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-colors shrink-0"
        >
          {uploading === 'gcode' ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <FileCode2 size={12} aria-hidden />}
          G-code
        </button>
      </div>
      <input ref={gcodeInputRef} type="file" accept=".gcode,.gco,.nc,text/plain" className="hidden"
        onChange={(e) => void handlePick('gcode', e.target.files?.[0])} />

      {isLoading && modelFiles.length === 0 && (
        <p className="text-[10px] font-bold text-slate-400">Cargando archivos…</p>
      )}
    </div>
  );
});
