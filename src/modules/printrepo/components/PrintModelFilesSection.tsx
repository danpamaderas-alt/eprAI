import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileCode2, FileUp, Loader2, Trash2, Boxes } from 'lucide-react';
import Swal from 'sweetalert2';
import { usePrintModelFileStore } from '../store/usePrintModelFileStore';
import { usePrintModelStore } from '../store/usePrintModelStore';
import { useToastStore } from '../../../store/useToastStore';
import { hoursToTime } from '../../../shared/utils/format';
import { readGcodeStats, type GcodeStats } from '../utils/gcodeStats';
import type { PrintModelFile, PrintModelFileKind, PrintModelInput } from '../types';

const fmtSize = (bytes: number | null): string => {
  if (bytes == null) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtFormat = (f: PrintModelFile): string =>
  (f.format ?? f.file_name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? 'bin').toUpperCase();

const ORIGINAL_ACCEPT = '.stl,.3mf,.step,.stp,.obj';

interface Props {
  modelId: string;
}

export const PrintModelFilesSection = memo(function PrintModelFilesSection({ modelId }: Props) {
  const toast = useToastStore((s) => s.toast);
  const updateModel = usePrintModelStore((s) => s.updateModel);
  const navigate = useNavigate();
  const { files, isLoading, error, fetchFiles, attachFile, removeFile, getSignedDownloadUrl } =
    usePrintModelFileStore();
  const [uploading, setUploading] = useState<PrintModelFileKind | null>(null);
  const [printerName, setPrinterName] = useState('');
  const originalInputRef = useRef<HTMLInputElement>(null);
  const gcodeInputRef = useRef<HTMLInputElement>(null);

  const modelFiles = useMemo(() => files.filter((f) => f.model_id === modelId), [files, modelId]);
  const originals = modelFiles.filter((f) => f.kind === 'original');
  const gcodes = modelFiles.filter((f) => f.kind === 'gcode');

  // Impresoras ya usadas en cualquier modelo → sugerencias del datalist
  const knownPrinters = useMemo(
    () =>
      Array.from(
        new Set(
          files
            .filter((f) => f.kind === 'gcode' && f.printer_name)
            .map((f) => f.printer_name as string),
        ),
      ).sort(),
    [files],
  );

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

  /** Lee peso/tiempo del G-code y ofrece actualizar el modelo o calcular costo directo. */
  const extractAndOfferStats = async (file: File): Promise<string> => {
    let stats: GcodeStats;
    try {
      stats = await readGcodeStats(file);
    } catch (err) {
      console.error('lectura de stats del gcode:', err);
      return '';
    }
    const parts: string[] = [];
    if (stats.timeSeconds != null && stats.timeSeconds > 60) {
      parts.push(hoursToTime(stats.timeSeconds / 3600));
    }
    if (stats.grams != null && stats.grams > 0) parts.push(`${stats.grams} g`);
    if (parts.length === 0) return '';

    try {
      const res = await Swal.fire({
        title: 'Datos detectados en el G-code',
        html: `<b>${parts.join(' · ')}</b>`,
        icon: 'info',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Actualizar modelo',
        denyButtonText: 'Calcular costo',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#7c3aed',
        denyButtonColor: '#4f46e5',
      });
      if (res.isConfirmed) {
        const patch: Partial<PrintModelInput> = {};
        if (stats.timeSeconds != null && stats.timeSeconds > 60) {
          patch.estimated_time_hours = +(stats.timeSeconds / 3600).toFixed(2);
        }
        if (stats.grams != null && stats.grams > 0) patch.estimated_grams = stats.grams;
        await updateModel(modelId, patch);
        toast('Estimaciones del modelo actualizadas', { type: 'success' });
      } else if (res.isDenied) {
        const model = usePrintModelStore.getState().models.find((m) => m.id === modelId);
        const params = new URLSearchParams();
        params.set('fromModel', modelId);
        params.set('name', model?.name ?? file.name.replace(/\.[^.]+$/, ''));
        if (stats.grams != null && stats.grams > 0) params.set('weight', String(stats.grams));
        if (stats.timeSeconds != null && stats.timeSeconds > 60) {
          params.set('time', hoursToTime(stats.timeSeconds / 3600));
        }
        void navigate(`/calculadora-3d?${params.toString()}`);
        return '';
      }
    } catch (err) {
      console.error(err);
    }
    return ` · ${parts.join(' · ')}`;
  };

  const handlePick = async (kind: PrintModelFileKind, file: File | undefined) => {
    if (!file) return;

    let printer: string | null = null;
    if (kind === 'gcode') {
      printer = printerName.trim();
      // Si no escribió la impresora antes, preguntar DESPUÉS de elegir el archivo
      if (!printer) {
        const res = await Swal.fire({
          title: '¿Para qué impresora es este G-code?',
          input: 'text',
          inputValue: knownPrinters[0] ?? '',
          inputPlaceholder: 'Ej: Ender 3 V2',
          showCancelButton: true,
          confirmButtonText: 'Guardar G-code',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#7c3aed',
          inputValidator: (v) => (!v || v.trim() === '' ? 'Escribí el nombre de la impresora' : null),
        });
        if (!res.isConfirmed) return;
        printer = (res.value as string).trim();
        setPrinterName(printer);
      }
    }

    setUploading(kind);
    try {
      await attachFile({ modelId, file, kind, printerName: printer });
      let extra = '';
      if (kind === 'gcode') extra = await extractAndOfferStats(file);
      toast(
        kind === 'gcode'
          ? `G-code guardado para «${printer}»${extra}`
          : `${(file.name.split('.').pop() ?? 'archivo').toUpperCase()} adjuntado`,
        { type: 'success' },
      );
      setPrinterName('');
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Error al subir el archivo', { type: 'error' });
    } finally {
      setUploading(null);
      if (originalInputRef.current) originalInputRef.current.value = '';
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

      {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

      {/* ORIGINALES (STL / 3MF / STEP / OBJ) */}
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider pt-1">
        Originales · STL · 3MF · STEP · OBJ
      </p>
      {originals.map((f) => (
        <div key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <Boxes className="w-4 h-4 text-brand-500 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{f.file_name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="px-1 py-0.5 mr-1 rounded bg-brand-600/10 text-brand-600 dark:text-brand-400">{fmtFormat(f)}</span>
                {fmtSize(f.size_bytes)}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={() => void handleDownload(f.storage_path, f.file_name)}
              title="Descargar"
              aria-label={`Descargar ${f.file_name}`}
              className="p-2 rounded-lg bg-brand-600/10 hover:bg-brand-600/20 text-brand-600 dark:text-brand-400 transition-colors">
              <Download size={14} aria-hidden />
            </button>
            <button type="button" onClick={() => void handleDelete(f.id, f.file_name)}
              title="Quitar archivo"
              aria-label={`Eliminar ${f.file_name}`}
              className="p-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 transition-colors">
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => originalInputRef.current?.click()}
        disabled={uploading != null}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-brand-500 text-slate-500 dark:text-slate-400 hover:text-brand-500 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
      >
        {uploading === 'original' ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <FileUp size={12} aria-hidden />}
        Adjuntar archivo original
      </button>
      <input ref={originalInputRef} type="file" accept={ORIGINAL_ACCEPT} className="hidden"
        onChange={(e) => void handlePick('original', e.target.files?.[0])} />

      {/* G-CODES POR IMPRESORA */}
      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider pt-1">
        G-codes por impresora / bandeja
      </p>
      {gcodes.map((g) => (
        <div key={g.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <FileCode2 className="w-4 h-4 text-violet-500 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{g.file_name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="px-1 py-0.5 mr-1 rounded bg-violet-600/10 text-violet-500">{g.printer_name ?? 'sin impresora'}</span>
                {fmtSize(g.size_bytes)}
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
          placeholder="Impresora (opcional: se pregunta después)"
          list="printers-known-list"
          aria-label="Nombre de la impresora para el G-code"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500"
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
      <datalist id="printers-known-list">
        {knownPrinters.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <input ref={gcodeInputRef} type="file" className="hidden"
        onChange={(e) => void handlePick('gcode', e.target.files?.[0])} />

      {isLoading && modelFiles.length === 0 && (
        <p className="text-[10px] font-bold text-slate-400">Cargando archivos…</p>
      )}
    </div>
  );
});
