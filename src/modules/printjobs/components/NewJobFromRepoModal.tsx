import { useEffect, useMemo, useState } from 'react';
import { Factory, X } from 'lucide-react';
import { usePrintModelStore } from '../../printrepo/store/usePrintModelStore';
import { useFilamentStore } from '../../filaments/store/useFilamentStore';
import { usePrintJobStore } from '../store/usePrintJobStore';
import { useToastStore } from '../../../store/useToastStore';
import { hoursToTime, timeToHours } from '../../../shared/utils/format';

interface Props {
  onClose: () => void;
}

export const NewJobFromRepoModal = ({ onClose }: Props) => {
  const toast = useToastStore((s) => s.toast);
  const { models, fetchModels } = usePrintModelStore();
  const filaments = useFilamentStore((s) => s.filaments);
  const fetchFilaments = useFilamentStore((s) => s.fetchFilaments);
  const addJob = usePrintJobStore((s) => s.addJob);

  const [modelId, setModelId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [printerName, setPrinterName] = useState('');
  const [filamentId, setFilamentId] = useState('');
  const [price, setPrice] = useState('');
  const [weightOverride, setWeightOverride] = useState('');
  const [timeOverride, setTimeOverride] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchModels();
    void fetchFilaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const model = useMemo(() => models.find((m) => m.id === modelId), [models, modelId]);

  // Estimaciones desde el modelo × cantidad (editables como override)
  const effectiveWeight =
    weightOverride !== ''
      ? parseFloat(weightOverride)
      : model?.estimated_grams != null
        ? Number(model.estimated_grams) * (parseInt(quantity, 10) || 1)
        : NaN;
  const effectiveHours =
    timeOverride !== ''
      ? timeToHours(timeOverride)
      : model?.estimated_time_hours != null
        ? Number(model.estimated_time_hours) * (parseInt(quantity, 10) || 1)
        : NaN;

  const canSave = Boolean(modelId) && !saving;

  const handleSubmit = async () => {
    if (!model) return;
    setSaving(true);
    try {
      const filament = filaments.find((f) => f.id === filamentId);
      await addJob({
        name: model.name,
        status: 'presupuestado',
        inputs: {
          source: 'repositorio',
          category: model.category,
          material_modelo: model.material,
          estimated_grams_modelo: model.estimated_grams,
          estimated_time_hours_modelo: model.estimated_time_hours,
        },
        printer_name: printerName.trim() || null,
        filament_id: filamentId || null,
        filament_label: filament
          ? `${filament.brand} ${filament.material} ${filament.color_name ?? ''}`.replace(/\s+/g, ' ').trim()
          : null,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        est_weight_g: isFinite(effectiveWeight) ? effectiveWeight : null,
        est_time_h: isFinite(effectiveHours) ? Number(effectiveHours.toFixed(2)) : null,
        est_price_total: price !== '' && isFinite(parseFloat(price)) ? parseFloat(price) : null,
        model_id: model.id,
      });
      toast('Trabajo creado desde el repositorio', { type: 'success' });
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
            <Factory size={16} className="text-orange-400" aria-hidden />
            Nuevo trabajo desde Repositorio
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Modelo del repositorio *</span>
            <select
              value={modelId}
              onChange={(e) => { setModelId(e.target.value); setWeightOverride(''); setTimeOverride(''); }}
              className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="">Seleccioná un modelo…</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.category ? `(${m.category})` : ''}
                </option>
              ))}
            </select>
          </label>

          {model && (
            <div className="flex gap-3 text-[10px] font-bold text-slate-400 bg-slate-800/60 rounded-xl px-3 py-2">
              {model.material && <span>🧵 {model.material}</span>}
              {model.estimated_grams != null && <span>⚖️ {Math.round(Number(model.estimated_grams))}g c/u</span>}
              {model.estimated_time_hours != null && <span>⏱️ {hoursToTime(Number(model.estimated_time_hours))} c/u</span>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cantidad</span>
              <input type="number" min={1} value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setWeightOverride(''); setTimeOverride(''); }}
                className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white tabular-nums focus:border-orange-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Impresora</span>
              <input type="text" placeholder="Ej: Ender 3 V2" value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder:text-slate-600 focus:border-orange-500 focus:outline-none" />
            </label>
          </div>

          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Filamento del inventario</span>
            <select value={filamentId} onChange={(e) => setFilamentId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-orange-500 focus:outline-none">
              <option value="">Sin asignar</option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.brand} {f.material} {f.color_name ?? ''} · {Math.round(f.remaining_g)}g restantes
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Peso total est. (g)</span>
              <input type="number" min={0} step="0.1"
                placeholder={isFinite(effectiveWeight) ? String(Math.round(effectiveWeight * 10) / 10) : 'auto'}
                value={weightOverride}
                onChange={(e) => setWeightOverride(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder:text-slate-600 tabular-nums focus:border-orange-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tiempo total (HH:MM)</span>
              <input type="text" inputMode="numeric"
                placeholder={isFinite(effectiveHours) ? hoursToTime(effectiveHours) : 'auto'}
                value={timeOverride}
                onChange={(e) => setTimeOverride(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder:text-slate-600 tabular-nums focus:border-orange-500 focus:outline-none" />
            </label>
          </div>

          <label className="block">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Precio de venta estimado ($)</span>
            <input type="number" min={0} step="100" placeholder="Opcional" value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder:text-slate-600 tabular-nums focus:border-violet-500 focus:outline-none" />
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
            Cancelar
          </button>
          <button disabled={!canSave} onClick={() => void handleSubmit()}
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
            {saving ? 'Creando…' : 'Crear trabajo'}
          </button>
        </div>
      </div>
    </div>
  );
};
