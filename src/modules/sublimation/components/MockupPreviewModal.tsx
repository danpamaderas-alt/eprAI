import { useEffect, useRef, useState } from 'react';
import { Share2, Download, Copy, X, Loader2 } from 'lucide-react';
import type { SublimationDesign } from '../types';
import { useToastStore } from '../../../store/useToastStore';
import {
  MOCKUP_PRODUCTS,
  MOCKUP_COLORS,
  renderMockup,
  loadImageCached,
  canvasToPngBlob,
  blobToShareFile,
} from '../utils/mockupCanvas';

interface MockupPreviewModalProps {
  design: SublimationDesign | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRODUCT_BY_DEST: Record<string, string> = {
  'Taza 11oz': 'taza',
  'Taza 15oz': 'taza',
  Tumbler: 'botella',
  Termo: 'botella',
  Camiseta: 'remera',
  Mousepad: 'mousepad',
  Llavero: 'llavero',
};

const SLIDER_CLASS =
  'w-full accent-violet-500 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 appearance-none cursor-pointer';

export const MockupPreviewModal = ({ design, isOpen, onClose }: MockupPreviewModalProps) => {
  const toast = useToastStore((s) => s.toast);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [productId, setProductId] = useState(
    () => PRODUCT_BY_DEST[design?.project_dest ?? ''] ?? 'taza',
  );
  const [color, setColor] = useState('#ffffff');
  const [scale, setScale] = useState(0.9);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isOpen || !design?.imagen || !canvasRef.current) return;
    let alive = false;
    const run = async () => {
      const product = MOCKUP_PRODUCTS.find((p) => p.id === productId) ?? MOCKUP_PRODUCTS[0];
      setRendering(true);
      try {
        await loadImageCached(design.imagen as string);
        if (!alive || !canvasRef.current) return;
        await renderMockup(canvasRef.current, {
          product,
          productColor: color,
          designSrc: design.imagen as string,
          scale,
          offsetX,
          offsetY,
          rotation,
        });
      } catch (err) {
        console.error('renderMockup error:', err);
      } finally {
        if (alive) setRendering(false);
      }
    };
    alive = true;
    void run();
    return () => {
      alive = false;
    };
  }, [isOpen, design, productId, color, scale, offsetX, offsetY, rotation]);

  if (!isOpen || !design) return null;

  const src = design.imagen;

  const getPngBlob = async (): Promise<Blob> => {
    if (!canvasRef.current) throw new Error('Mockup no renderizado todavía.');
    const blob = await canvasToPngBlob(canvasRef.current);
    if (!blob) throw new Error('No se pudo generar la imagen.');
    return blob;
  };

  const handleShare = async () => {
    setExporting(true);
    try {
      const blob = await getPngBlob();
      const file = blobToShareFile(blob, `mockup-${design.name.replace(/\W+/g, '-').toLowerCase()}.png`);
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Mockup ${design.name}` });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast('Descargado. Adjuntalo en el chat de WhatsApp.', { type: 'info' });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        toast(
          /^https?:/i.test(src ?? '') && (err as Error).name === 'SecurityError'
            ? 'La imagen es externa y bloquea la exportación. Descargala al repositorio primero.'
            : (err as Error).message || 'No se pudo exportar el mockup.',
          { type: 'error' },
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await getPngBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mockup-${design.name.replace(/\W+/g, '-').toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast('No se pudo descargar el mockup.', { type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleCopy = async () => {
    setExporting(true);
    try {
      const blob = await getPngBlob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Mockup copiado al portapapeles', { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('El navegador bloqueó el portapapeles. Usá Compartir o Descargar.', { type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white italic">
            📱 Mockup para Cliente
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 rounded-full transition-all"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          <div className="space-y-3">
            <div className="relative rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              {!src && (
                <div className="aspect-square flex items-center justify-center text-sm font-bold text-slate-400 p-8 text-center">
                  Este diseño no tiene imagen guardada.
                </div>
              )}
              <canvas
                ref={canvasRef}
                className={`w-full aspect-square object-contain ${src ? '' : 'hidden'}`}
              />
              {(rendering || exporting) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/40">
                  <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShare}
                disabled={!src || exporting}
                className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                <Share2 className="w-4 h-4" /> Compartir
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!src || exporting}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 dark:bg-blue-600 hover:opacity-90 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-opacity"
              >
                <Download className="w-4 h-4" /> PNG
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!src || exporting}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                <Copy className="w-4 h-4" /> Copiar
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Producto</p>
              <div className="flex flex-wrap gap-2">
                {MOCKUP_PRODUCTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProductId(p.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      productId === p.id
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Color</p>
              <div className="flex flex-wrap gap-2.5">
                {MOCKUP_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    onClick={() => setColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      color === c.value
                        ? 'border-violet-500 scale-110 ring-2 ring-violet-500/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {[
                { label: `Tamaño ${Math.round(scale * 100)}%`, value: scale, set: setScale, min: 0.2, max: 1.4, step: 0.01 },
                { label: `Horizontal ${offsetX}`, value: offsetX, set: setOffsetX, min: -1, max: 1, step: 0.02 },
                { label: `Vertical ${offsetY}`, value: offsetY, set: setOffsetY, min: -1, max: 1, step: 0.02 },
                { label: `Rotación ${rotation}°`, value: rotation, set: setRotation, min: -30, max: 30, step: 1 },
              ].map((s) => (
                <label key={s.label} className="block space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className={SLIDER_CLASS}
                  />
                </label>
              ))}
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              💡 <b className="text-slate-500 dark:text-slate-300">Tip WhatsApp:</b> en celular usá
              «Compartir» para mandarlo directo al chat del cliente. En PC descargá el PNG y adjuntalo.
              Todo se genera en tu dispositivo — sin IA ni créditos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
