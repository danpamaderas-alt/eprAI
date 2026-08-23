import { useEffect, useMemo, useState } from 'react';
import { Shirt, X } from 'lucide-react';
import { useSublimationStore } from '../../sublimation/store/useSublimationStore';
import { useBlankStore } from '../../blanks/store/useBlankStore';
import { useSublimationJobStore } from '../store/useSublimationJobStore';
import { useToastStore } from '../../../store/useToastStore';

interface Props {
  onClose: () => void;
}

export const NewSublimationJobModal = ({ onClose }: Props) => {
  const toast = useToastStore((s) => s.toast);
  const { designs, fetchDesigns } = useSublimationStore();
  const blanks = useBlankStore((s) => s.blanks);
  const fetchBlanks = useBlankStore((s) => s.fetchBlanks);
  const addJob = useSublimationJobStore((s) => s.addJob);

  const [designId, setDesignId] = useState('');
  const [blankId, setBlankId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchDesigns();
    void fetchBlanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const design = useMemo(() => designs.find((d) => d.id === designId), [designs, designId]);
  const blank = useMemo(() => blanks.find((b) => b.id === blankId), [blanks, blankId]);

  const effectivePrice =
    price !== '' && isFinite(parseFloat(price)) ? parseFloat(price) : null;

  const canSave = Boolean(designId) && !saving;

  const handleSubmit = async () => {
    if (!design) return;
    setSaving(true);
    try {
      await addJob({
        name: design.name,
        status: 'presupuestado',
        inputs: {
          source: 'repositorio',
          category: design.category,
          platform: design.platform,
          project_dest: design.project_dest,
        },
        design_id: design.id,
        blank_id: blankId || null,
        blank_label: blank
          ? `${blank.name}${blank.type ? ` · ${blank.type}` : ''}${blank.size ? ` · ${blank.size}` : ''}`.trim()
          : null,
        size_label: blank?.size ?? null,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        est_price_total: effectivePrice,
      });
      toast('Trabajo de sublimación creado desde el repositorio', { type: 'success' });
      onClose();
    } catch (err) {
      console.error(err);
      toast('No se pudo crear el trabajo', { type: 'error' });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
            <Shirt size={16} className="text-fuchsia-400" aria-hidden />
            Nuevo trabajo desde Repositorio
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Diseño del repositorio *</span>
            <select
              value={designId}
              onChange={(e) => setDesignId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-fuchsia-500 focus:outline-none"
            >
              <option value="">Seleccioná un diseño…</option>
              {designs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.category ? `(${d.category})` : ''}
                </option>
              ))}
            </select>
          </label>

          {design && (
            <div className="flex gap-3 text-[10px] font-bold text-slate-400 bg-slate-800/60 rounded-xl px-3 py-2">
              {design.platform && <span>🛒 {design.platform}</span>}
              {design.project_dest && <span>🎯 {design.project_dest}</span>}
              {design.dimensions && <span>📐 {design.dimensions}</span>}
            </div>
          )}

          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Producto base (blank)</span>
            <select value={blankId} onChange={(e) => setBlankId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-fuchsia-500 focus:outline-none">
              <option value="">Sin asignar</option>
              {blanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.type ? ` · ${b.type}` : ''}{b.size ? ` · ${b.size}` : ''}
                  {b.cost_price != null ? ` · $${Number(b.cost_price).toFixed(0)}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cantidad</span>
              <input type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white tabular-nums focus:border-fuchsia-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Precio venta est. ($)</span>
              <input type="number" min={0} step="100" placeholder="Opcional" value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder:text-slate-600 tabular-nums focus:border-violet-500 focus:outline-none" />
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
            Cancelar
          </button>
          <button disabled={!canSave} onClick={() => void handleSubmit()}
            className="flex-1 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:hover:bg-fuchsia-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
            {saving ? 'Creando…' : 'Crear trabajo'}
          </button>
        </div>
      </div>
    </div>
  );
};
