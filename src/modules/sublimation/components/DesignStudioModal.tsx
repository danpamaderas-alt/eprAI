import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Wand2,
  Scissors,
  Shirt,
  PenTool,
  Upload,
  Link2,
  Library,
  Download,
  Save,
  ScanSearch,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { useToastStore } from '../../../store/useToastStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useSublimationStore } from '../store/useSublimationStore';
import {
  PRODUCT_PRESETS,
  TARGET_DPI,
  loadImageInfo,
  evaluatePrint,
  VERDICT_LABELS,
  type ImageInfo,
} from '../utils/printPreflight';
import {
  vectorizeImage,
  downloadSVG,
  downloadDataUrl,
} from '../utils/vectorize';
import type { SublimationDesign } from '../types';

interface DesignStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDesign?: SublimationDesign | null;
}

type SourceMode = 'repo' | 'url' | 'file';
type BusyAction = 'analyze' | 'remove_bg' | 'mockup' | 'vectorize' | null;

interface StudioResult {
  kind: 'png' | 'svg';
  label: string;
  dataUrl?: string;
  svg?: string;
}

const MAX_API_SIDE = 1536;
const MAX_SAVE_CHARS = 4_000_000;

export const DesignStudioModal = ({
  isOpen,
  onClose,
  initialDesign,
}: DesignStudioModalProps) => {
  const designs = useSublimationStore((s) => s.designs);
  const addDesign = useSublimationStore((s) => s.addDesign);
  const session = useAuthStore((s) => s.session);
  const toast = useToastStore((s) => s.toast);

  const [mode, setMode] = useState<SourceMode>('repo');
  const [selectedId, setSelectedId] = useState<string>(initialDesign?.id ?? '');
  const [urlInput, setUrlInput] = useState(initialDesign?.imagen ?? '');
  const [src, setSrc] = useState<string | null>(initialDesign?.imagen ?? null);
  const [srcLabel, setSrcLabel] = useState(
    initialDesign ? initialDesign.name.toLowerCase().slice(0, 40) : 'diseño',
  );
  const [info, setImageInfo] = useState<ImageInfo | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPresetId, setCustomPresetId] = useState('');
  const [mockupProductId, setMockupProductId] = useState(PRODUCT_PRESETS[0].id);
  const [vectorColors, setVectorColors] = useState(16);
  const [result, setResult] = useState<StudioResult | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const report = useMemo(
    () =>
      info
        ? evaluatePrint(
            info,
            customPresetId ? PRODUCT_PRESETS.find((p) => p.id === customPresetId) : undefined,
          )
        : null,
    [info, customPresetId],
  );

  const analyze = useCallback(async (target: string) => {
    setBusy('analyze');
    setError(null);
    try {
      const next = await loadImageInfo(target);
      setImageInfo(next);
    } catch {
      setError('No se pudo cargar la imagen. Probá con otro enlace o subila como archivo.');
    } finally {
      setBusy(null);
    }
  }, []);

  const applySource = useCallback(
    (nextSrc: string | null, label?: string) => {
      if (objectUrlRef.current && nextSrc !== objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setSrc(nextSrc);
      setImageInfo(null);
      setResult(null);
      setError(null);
      if (label)
        setSrcLabel(label.toLowerCase().replace(/\.[a-z0-9]+$/i, '').slice(0, 40));
      else setSrcLabel('diseño');
      if (nextSrc) void analyze(nextSrc);
    },
    [analyze],
  );

  const handlePickRepo = (id: string) => {
    setSelectedId(id);
    const design = designs.find((d) => d.id === id);
    if (!design?.imagen) return;
    applySource(design.imagen, design.name);
  };

  const handleLoadUrl = () => {
    const value = urlInput.trim();
    if (!value) return;
    applySource(value, 'desde enlace');
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('El archivo debe ser una imagen.', { type: 'error' });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setMode('file');
    applySource(objectUrl, file.name);
  };

  const prepareForApi = async (
    target: string,
  ): Promise<{ imageBase64: string; mimeType: string }> => {
    let img: HTMLImageElement;
    try {
      img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('load'));
        image.src = target;
      });
    } catch {
      throw new Error(
        'La imagen no permite procesamiento directo por su origen (CORS). Descargala y subila como archivo.',
      );
    }
    const scale = Math.min(1, MAX_API_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no permite procesar el lienzo.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch {
      throw new Error(
        'La imagen no permite procesamiento directo por su origen (CORS). Descargala y subila como archivo.',
      );
    }
    return { imageBase64: dataUrl.split(',')[1] ?? '', mimeType: 'image/png' };
  };

  const callDesignTool = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/design-tools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as
      | { imageBase64?: string; mimeType?: string; error?: string }
      | null;
    if (!response.ok) throw new Error(data?.error ?? 'No se pudo procesar la imagen.');
    if (!data?.imageBase64) throw new Error('El servicio no devolvió ninguna imagen.');
    return `data:${data.mimeType ?? 'image/png'};base64,${data.imageBase64}`;
  };

  const runAiAction = async (action: 'remove_bg' | 'mockup') => {
    if (!src) return;
    setBusy(action);
    setError(null);
    try {
      const payload = await prepareForApi(src);
      const product = PRODUCT_PRESETS.find((p) => p.id === mockupProductId);
      const dataUrl = await callDesignTool({
        action,
        ...payload,
        product: action === 'mockup' ? product?.label : undefined,
      });
      setResult({
        kind: 'png',
        label: action === 'remove_bg' ? 'fondo transparente' : `mockup ${product?.label ?? ''}`,
        dataUrl,
      });
      toast('Imagen generada con IA', { type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar la imagen.';
      setError(message);
      toast(message, { type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleVectorize = async () => {
    if (!src) return;
    setBusy('vectorize');
    setError(null);
    try {
      const svg = await vectorizeImage(src, { colors: vectorColors });
      setResult({ kind: 'svg', label: 'vectorizado', svg });
      toast('Diseño vectorizado', { type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo vectorizar la imagen.';
      setError(message);
      toast(message, { type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const filename = `${srcLabel}-${result.label.replace(/\s+/g, '-')}`;
    if (result.kind === 'svg' && result.svg) downloadSVG(result.svg, filename);
    else if (result.dataUrl) downloadDataUrl(result.dataUrl, `${filename}.png`);
  };

  const handleSaveToRepository = async () => {
    if (!result?.dataUrl) return;
    if (result.dataUrl.length > MAX_SAVE_CHARS) {
      toast('La imagen es demasiado grande para guardarla en el repositorio. Descargala.', {
        type: 'error',
      });
      return;
    }
    try {
      await addDesign({
        name: `${srcLabel} (${result.label.trim()})`,
        category: 'General',
        status: 'Nuevo',
        imagen: result.dataUrl,
        background: result.label.includes('transparente') ? 'Transparente' : undefined,
      });
      toast('Variante guardada en el repositorio', { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('No se pudo guardar en el repositorio', { type: 'error' });
    }
  };

  const isBusyAi = busy === 'remove_bg' || busy === 'mockup';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Estudio de Diseños"
      showCancel={false}
      width="max-w-4xl"
    >
      {/* Selector de origen */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { id: 'repo', label: 'Repositorio', icon: Library },
          { id: 'url', label: 'Enlace', icon: Link2 },
          { id: 'file', label: 'Archivo', icon: Upload },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
              mode === id
                ? 'bg-fuchsia-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'repo' && (
        <select
          value={selectedId}
          onChange={(e) => handlePickRepo(e.target.value)}
          className="w-full px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 cursor-pointer"
        >
          <option value="">Elegí un diseño del repositorio…</option>
          {designs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.platform ? ` · ${d.platform}` : ''}
            </option>
          ))}
        </select>
      )}

      {mode === 'url' && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadUrl()}
            placeholder="https://…/diseno.png"
            className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          />
          <button
            type="button"
            onClick={handleLoadUrl}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Cargar
          </button>
        </div>
      )}

      {mode === 'file' && (
        <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-fuchsia-500 hover:text-fuchsia-500 cursor-pointer transition-colors">
          <Upload className="w-4 h-4" aria-hidden="true" />
          Tocá para elegir una imagen (PNG/JPG/WebP)
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}

      {/* Vista previa + resultado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Original</p>
          <div className="aspect-square rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center relative">
            {src ? (
              <img src={src} alt="Original" className="w-full h-full object-contain" />
            ) : (
              <ScanSearch className="w-10 h-10 text-slate-300 dark:text-slate-700" aria-hidden="true" />
            )}
            {busy === 'analyze' && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center">
                <Spinner className="w-6 h-6 text-fuchsia-500" />
              </div>
            )}
          </div>

          {/* Preflight */}
          {report && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <ScanSearch className="w-3 h-3" aria-hidden="true" />
                  Preflight · {info?.widthPx}×{info?.heightPx}px
                </p>
                <select
                  value={customPresetId}
                  onChange={(e) => setCustomPresetId(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-300 cursor-pointer"
                >
                  <option value="">Todos los productos</option>
                  {PRODUCT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              {(customPresetId ? report.verdict ? [report.verdict] : [] : report.presets).map(
                (v) => (
                  <div key={v.preset.id} className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="font-bold text-slate-600 dark:text-slate-300 truncate">
                      {v.preset.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border font-black uppercase tracking-wide ${VERDICT_LABELS[v.verdict].className}`}>
                      {v.effectiveDpiW}×{v.effectiveDpiH} DPI · {VERDICT_LABELS[v.verdict].label}
                    </span>
                  </div>
                ),
              )}
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Máximo a {TARGET_DPI} DPI: {report.maxPrintCm.widthCm} × {report.maxPrintCm.heightCm} cm
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Resultado</p>
          <div className="aspect-square rounded-3xl border border-slate-200 dark:border-slate-800 bg-checker flex items-center justify-center overflow-hidden relative">
            {isBusyAi || busy === 'vectorize' ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Spinner className="w-8 h-8 text-fuchsia-500" />
                <span className="text-[9px] font-black uppercase tracking-widest">Procesando…</span>
              </div>
            ) : result ? (
              result.kind === 'svg' && result.svg ? (
                <img
                  src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(result.svg)))}`}
                  alt="Resultado vectorizado"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <img src={result.dataUrl} alt="Resultado" className="w-full h-full object-contain" />
              )
            ) : (
              <Wand2 className="w-10 h-10 text-slate-300 dark:text-slate-700" aria-hidden="true" />
            )}
          </div>

          {result && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                {result.kind === 'svg' ? 'Descargar SVG' : 'Descargar PNG'}
              </button>
              {result.kind === 'png' && (
                <button
                  type="button"
                  onClick={handleSaveToRepository}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  Guardar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* Herramientas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <button
          type="button"
          onClick={() => runAiAction('remove_bg')}
          disabled={!src || isBusyAi || busy === 'vectorize'}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-fuchsia-600/20 transition-all active:scale-95"
        >
          {busy === 'remove_bg' ? <Spinner className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" aria-hidden="true" />}
          Quitar fondo (IA)
        </button>

        <div className="flex gap-2 items-stretch">
          <select
            value={mockupProductId}
            onChange={(e) => setMockupProductId(e.target.value)}
            className="flex-1 min-w-0 px-2 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500"
          >
            {PRODUCT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => runAiAction('mockup')}
            disabled={!src || isBusyAi || busy === 'vectorize'}
            title="Generar mockup con IA"
            className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            {busy === 'mockup' ? <Spinner className="w-3.5 h-3.5" /> : <Shirt className="w-3.5 h-3.5" aria-hidden="true" />}
            Mockup
          </button>
        </div>

        <div className="flex gap-2 items-stretch">
          <div className="flex items-center px-3 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1">
            <PenTool className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <input
              type="number"
              min={2}
              max={32}
              value={vectorColors}
              onChange={(e) =>
                setVectorColors(Math.max(2, Math.min(32, parseInt(e.target.value || '16', 10))))
              }
              title="Cantidad de colores del vector"
              className="w-12 bg-transparent text-[11px] font-black text-slate-700 dark:text-slate-200 focus:outline-none text-center"
            />
            <span className="text-[8px] font-black uppercase text-slate-400">col.</span>
          </div>
          <button
            type="button"
            onClick={handleVectorize}
            disabled={!src || isBusyAi || busy === 'vectorize'}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {busy === 'vectorize' ? <Spinner className="w-3.5 h-3.5" /> : <PenTool className="w-3.5 h-3.5" aria-hidden="true" />}
            Vectorizar
          </button>
        </div>
      </div>

      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
        El preflight y la vectorización se procesan en tu navegador. Quitar fondo y Mockup usan IA
        vía el servidor. Si una imagen remota bloquea el procesamiento (CORS), descargala y cargala
        desde Archivo.
      </p>
    </Modal>
  );
};
