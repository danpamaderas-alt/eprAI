import { useState } from 'react';
import { Banknote, ArrowRightLeft, BookOpen, Truck, X, Check } from 'lucide-react';
import { usePrintJobStore, type DeliverJobData } from '../store/usePrintJobStore';
import { useToastStore } from '../../../store/useToastStore';
import { hoursToTime } from '../../../shared/utils/format';
import type { PrintJob3D } from '../types';

interface Props {
  job: PrintJob3D;
  onClose: () => void;
}

const PAYMENT_OPTIONS: { value: DeliverJobData['payment_method']; label: string; icon: typeof Banknote }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: ArrowRightLeft },
  { value: 'CTA_CTE', label: 'Cta. Cte.', icon: BookOpen },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const DeliverJobModal = ({ job, onClose }: Props) => {
  const toast = useToastStore((s) => s.toast);
  const deliverJob = usePrintJobStore((s) => s.deliverJob);

  const [payment, setPayment] = useState<DeliverJobData['payment_method']>('EFECTIVO');
  const [total, setTotal] = useState(
    job.est_price_total != null ? String(Math.round(Number(job.est_price_total))) : '',
  );
  const [customer, setCustomer] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const specs: string[] = [];
  if (job.printer_name) specs.push(`Impresora: ${job.printer_name}`);
  if (job.filament_label) specs.push(`Material: ${job.filament_label}`);
  if (job.actual_weight_g != null) specs.push(`Peso real: ${Math.round(Number(job.actual_weight_g))}g`);
  if (job.actual_time_h != null) specs.push(`Tiempo real: ${hoursToTime(Number(job.actual_time_h))}`);
  if (job.actual_cost_total != null) specs.push(`Costo material: ${fmt(Number(job.actual_cost_total))}`);

  const totalValue = parseFloat(total);
  const canSave = isFinite(totalValue) && totalValue > 0 && !saving;

  const handleDeliver = async () => {
    setSaving(true);
    try {
      const res = await deliverJob(job.id, {
        payment_method: payment,
        total: totalValue,
        customer: customer.trim() || null,
      });
      setDone(res.remitoNumber);
      toast(`Entregado · Venta registrada y remito ${res.remitoNumber}`, { type: 'success' });
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'No se pudo registrar la entrega', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
            <Truck size={16} className="text-violet-400" aria-hidden />
            Entregar trabajo
          </h2>
          {!done && (
            <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>

        {done ? (
          <div className="p-6 text-center space-y-4">
            <Check size={36} className="mx-auto text-emerald-400" aria-hidden />
            <p className="text-sm font-bold text-white">Trabajo entregado</p>
            <p className="text-xs text-slate-400 font-bold">
              Venta registrada · Remito <span className="text-violet-300">{done}</span> generado con el detalle de impresión.
            </p>
            <button onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
              Listo
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 space-y-4">
              <div className="bg-slate-800/60 rounded-xl px-4 py-3">
                <p className="text-sm font-black text-white">{job.name}{job.quantity > 1 ? ` ×${job.quantity}` : ''}</p>
                {specs.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {specs.map((s) => (
                      <li key={s} className="text-[10px] font-bold text-slate-400">{s}</li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Método de pago</span>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setPayment(value)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                        payment === value
                          ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white hover:border-slate-600'
                      }`}>
                      <Icon size={14} aria-hidden />
                      <span className="text-[9px] font-black uppercase">{label}</span>
                    </button>
                  ))}
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total cobrado ($)</span>
                  <input type="number" min={0} step="100" value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white tabular-nums focus:border-violet-500 focus:outline-none" />
                </label>
                <label className="block">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cliente</span>
                  <input type="text" placeholder="Mostrador" value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none" />
                </label>
              </div>

              <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                Al entregar se registra la venta en Finanzas y se genera un remito DELIVERED con el detalle técnico de la pieza.
              </p>
            </div>

            <div className="flex gap-3 px-6 py-4 mt-2 border-t border-slate-800">
              <button onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
                Cancelar
              </button>
              <button disabled={!canSave} onClick={() => void handleDeliver()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors">
                <Truck size={13} aria-hidden />
                {saving ? 'Registrando…' : 'Confirmar entrega'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
