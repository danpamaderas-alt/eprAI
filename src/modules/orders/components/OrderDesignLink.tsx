import { useEffect, useState } from 'react';
import { ScanSearch, ShieldAlert, ImageOff } from 'lucide-react';
import { useSublimationStore } from '../../sublimation/store/useSublimationStore';
import {
  PRODUCT_PRESETS,
  loadImageInfo,
  evaluatePreset,
  VERDICT_LABELS,
  type PreflightVerdict,
} from '../../sublimation/utils/printPreflight';

export interface OrderDesignMeta {
  designId: string | null;
  productName: string | null;
  verdict: PreflightVerdict | null;
  clientApproved: boolean;
}

interface OrderDesignLinkProps {
  value: OrderDesignMeta;
  onChange: (patch: Partial<OrderDesignMeta>) => void;
}

const INPUT_CLASS =
  'w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-blue-500';

export const OrderDesignLink = ({ value, onChange }: OrderDesignLinkProps) => {
  const { designs, fetchDesigns } = useSublimationStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [dpiInfo, setDpiInfo] = useState<{ w: number; h: number; pxW: number; pxH: number } | null>(null);

  useEffect(() => {
    if (!designs || designs.length === 0) void fetchDesigns();
  }, [designs, fetchDesigns]);

  const selected = designs?.find((d) => d.id === value.designId) || null;

  useEffect(() => {
    let alive = false;
    const run = async () => {
      const src = selected?.imagen;
      const preset = value.productName
        ? PRODUCT_PRESETS.find((p) => p.label === value.productName) ?? null
        : null;
      if (!src || !preset) {
        setDpiInfo(null);
        setAnalysisError(null);
        return;
      }
      setAnalyzing(true);
      setAnalysisError(null);
      try {
        const info = await loadImageInfo(src);
        if (!alive) return;
        const r = evaluatePreset(info, preset);
        setDpiInfo({ pxW: info.widthPx, pxH: info.heightPx, w: r.effectiveDpiW, h: r.effectiveDpiH });
        onChange({ verdict: r.verdict });
      } catch (e) {
        if (!alive) return;
        setDpiInfo(null);
        setAnalysisError((e as Error).message);
      } finally {
        if (alive) setAnalyzing(false);
      }
    };
    alive = true;
    void run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, value.productName]);

  const podLocked =
    designs?.some((d) => d.id === value.designId && d.pod_permitido === false) ?? false;

  const licenseUnknown = !!selected && selected.pod_permitido !== true;

  const handleDesignChange = (id: string) => {
    onChange({
      designId: id || null,
      productName: id ? value.productName : null,
      verdict: null,
      clientApproved: false,
    });
    if (!id) {
      setDpiInfo(null);
      setAnalysisError(null);
    }
  };

  const handleProductChange = (label: string) => {
    onChange({ ...value, productName: label || null, verdict: null });
  };

  return (
    <div
      className={`rounded-3xl p-6 space-y-4 border transition-colors ${
        podLocked
          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
          : 'bg-violet-50 dark:bg-violet-950/10 border-violet-100 dark:border-violet-900/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
          🎨 Diseño a Producir
        </h3>
        {analyzing && (
          <span className="text-[10px] font-black text-slate-400 animate-pulse uppercase">
            Analizando...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={value.designId || ''}
          onChange={(e) => handleDesignChange(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Sin diseño del repositorio</option>
          {(designs || [])
            .filter((d) => d.pod_permitido !== false)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.pod_permitido ? ' ✅' : ''}
              </option>
            ))}
        </select>
        <select
          value={value.productName || ''}
          onChange={(e) => handleProductChange(e.target.value)}
          disabled={!value.designId}
          className={`${INPUT_CLASS} disabled:opacity-40`}
        >
          <option value="">Producto destino...</option>
          {PRODUCT_PRESETS.map((p) => (
            <option key={p.id} value={p.label}>
              {p.label} ({p.widthCm}×{p.heightCm} cm)
            </option>
          ))}
        </select>
      </div>

      {podLocked && (
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/30 border border-rose-300">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
            Este diseño tiene licencia Personal y NO puede venderse impreso (candado POD).
          </p>
        </div>
      )}

      {licenseUnknown && !podLocked && (
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            Licencia sin confirmar para venta. Confirmala en el repositorio antes de producir.
          </p>
        </div>
      )}

      {analysisError && (
        <p className="flex items-center gap-2 text-[11px] font-bold text-rose-500">
          <ImageOff className="w-3.5 h-3.5" /> {analysisError}
        </p>
      )}

      {value.designId && !value.productName && (
        <p className="text-[11px] font-bold text-slate-400">
          Elegí el producto destino para verificar la calidad de impresión.
        </p>
      )}

      {dpiInfo && dpiInfo.w > 0 && value.productName && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${
            value.verdict
              ? VERDICT_LABELS[value.verdict].className
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              Preflight · {dpiInfo.pxW}×{dpiInfo.pxH} px
            </p>
            <p className="font-black text-sm">
              {value.verdict ? VERDICT_LABELS[value.verdict].label : '—'} ·{' '}
              {dpiInfo.w}×{dpiInfo.h} DPI efectivos
            </p>
          </div>
          <ScanSearch className="w-5 h-5 shrink-0 opacity-40" />
        </div>
      )}

      {value.verdict === 'bad' && (
        <label className="flex items-start gap-3 cursor-pointer select-none p-4 rounded-2xl bg-rose-100 dark:bg-rose-900/30 border-2 border-dashed border-rose-400">
          <input
            type="checkbox"
            checked={value.clientApproved}
            onChange={(e) => onChange({ ...value, clientApproved: e.target.checked })}
            className="mt-0.5 w-4 h-4 accent-rose-600 shrink-0"
          />
          <span className="text-[11px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-300">
            El diseño va a salir pixelado a este tamaño. El cliente vio la advertencia y aprobó
            imprimir de todos modos.
          </span>
        </label>
      )}
    </div>
  );
};
