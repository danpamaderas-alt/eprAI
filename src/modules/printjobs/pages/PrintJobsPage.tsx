import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Factory,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  PackageOpen,
  Scale,
  AlertOctagon,
  Truck,
  Receipt,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { usePrintJobStore } from '../store/usePrintJobStore';
import {
  PRINT_JOB_STATUSES,
  PRINT_JOB_STATUS_LABELS,
  PRINT_JOB_STATUS_STYLES,
  NEXT_STATUS,
  type PrintJob3DStatus,
} from '../types';
import type { PrintJob3D } from '../types';
import { useToastStore } from '../../../store/useToastStore';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { formatDate, hoursToTime, timeToHours } from '../../../shared/utils/format';
import { NewJobFromRepoModal } from '../components/NewJobFromRepoModal';
import { DeliverJobModal } from '../components/DeliverJobModal';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);

const ACTIVE_STATUSES: PrintJob3DStatus[] = ['en_cola', 'imprimiendo'];

const nextLabel = (st: PrintJob3DStatus): string => {
  const next = NEXT_STATUS[st];
  return next ? `Avanzar a ${PRINT_JOB_STATUS_LABELS[next]}` : 'Avanzar';
};

export const PrintJobsPage = () => {
  const toast = useToastStore((s) => s.toast);
  const { jobs, isLoading, error, fetchJobs, setStatus, completeJob, deleteJob } =
    usePrintJobStore();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showNewJob, setShowNewJob] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<PrintJob3D | null>(null);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: jobs.length };
    jobs.forEach((j) => {
      c[j.status] = (c[j.status] || 0) + 1;
    });
    return c;
  }, [jobs]);

  const kpis = useMemo(() => {
    const activos = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status as PrintJob3DStatus)).length;
    const completados = jobs.filter((j) => j.status === 'completado' || j.status === 'entregado');
    const fallidos = jobs.filter((j) => j.status === 'fallido');
    const gramosImpresos = completados.reduce((s, j) => s + Number(j.actual_weight_g ?? j.est_weight_g ?? 0), 0);
    const conReal = completados.filter((j) => j.actual_time_h != null && j.est_time_h);
    const desvioTiempo =
      conReal.length > 0
        ? conReal.reduce(
            (s, j) => s + ((Number(j.actual_time_h) - Number(j.est_time_h)) / Number(j.est_time_h)) * 100,
            0,
          ) / conReal.length
        : null;
    return {
      activos,
      completados: completados.length,
      gramosImpresos,
      tasaFallos: jobs.length > 0 ? (fallidos.length / jobs.length) * 100 : 0,
      desvioTiempo,
      fallidos: fallidos.length,
    };
  }, [jobs]);

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? jobs : jobs.filter((j) => j.status === statusFilter)),
    [jobs, statusFilter],
  );

  const handleAdvance = async (job: PrintJob3D) => {
    const next = NEXT_STATUS[job.status as PrintJob3DStatus];
    if (!next) return;
    if (next === 'completado') {
      await handleComplete(job);
      return;
    }
    try {
      await setStatus(job.id, next);
      toast(`Trabajo pasado a "${PRINT_JOB_STATUS_LABELS[next]}"`, { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('No se pudo actualizar el estado', { type: 'error' });
    }
  };

  const handleComplete = async (job: PrintJob3D) => {
    const res = await Swal.fire({
      title: 'Completar trabajo',
      html: `
        <p style="font-size:12px;color:#64748b;margin-bottom:12px">${job.name}</p>
        <input id="pj-weight" type="number" min="0" step="0.1" class="swal2-input" placeholder="Peso real usado (g)"
          value="${Math.round(Number(job.est_weight_g ?? 0))}" />
        <input id="pj-time" type="text" inputmode="numeric" class="swal2-input" placeholder="Tiempo real HH:MM"
          value="${hoursToTime(Number(job.est_time_h ?? 0))}" />
        <textarea id="pj-notes" class="swal2-textarea" placeholder="Notas (opcional): fallos, post-procesado..."></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Completar y descontar filamento',
      confirmButtonColor: '#7c3aed',
      preConfirm: () => {
        const w = parseFloat(
          (document.getElementById('pj-weight') as HTMLInputElement | null)?.value.replace(',', '.') ?? '',
        );
        const t = timeToHours((document.getElementById('pj-time') as HTMLInputElement | null)?.value ?? '');
        const notes = (document.getElementById('pj-notes') as HTMLTextAreaElement | null)?.value ?? '';
        if (!isFinite(w) || w <= 0) {
          Swal.showValidationMessage('Ingresá el peso real en gramos.');
          return null;
        }
        return { weight: w, time: isFinite(t) ? t : Number(job.est_time_h ?? 0), notes };
      },
    });

    if (!res.isConfirmed || !res.value) return;

    try {
      await completeJob(job.id, {
        actual_weight_g: res.value.weight,
        actual_time_h: res.value.time,
        actual_notes: res.value.notes || undefined,
      });
      toast(
        job.filament_id
          ? `Completado · descontados ${res.value.weight}g del rollo`
          : 'Trabajo completado',
        { type: 'success' },
      );
    } catch (err) {
      console.error(err);
      toast('No se pudo completar el trabajo', { type: 'error' });
    }
  };

  const handleFail = async (job: PrintJob3D) => {
    const res = await Swal.fire({
      title: 'Marcar como fallido',
      input: 'textarea',
      inputPlaceholder: '¿Qué salió mal? (opcional)',
      showCancelButton: true,
      confirmButtonText: 'Marcar fallido',
      confirmButtonColor: '#e11d48',
    });
    if (!res.isConfirmed) return;
    try {
      await usePrintJobStore.getState().updateJob(job.id, {
        status: 'fallido',
        actual_notes: (res.value as string | undefined) || null,
      });
      toast('Trabajo marcado como fallido', { type: 'info' });
    } catch (err) {
      console.error(err);
      toast('No se pudo actualizar el trabajo', { type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await Swal.fire({
      title: '¿Eliminar trabajo?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#e11d48',
    });
    if (!res.isConfirmed) return;
    try {
      await deleteJob(id);
      toast('Trabajo eliminado', { type: 'info' });
    } catch (err) {
      console.error(err);
      toast('No se pudo eliminar', { type: 'error' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
            <Factory size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
              Producción 3D
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Cola de trabajos: estados, consumo real de filamento y comparativa estimado vs real.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/calculadora-3d"
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
          >
            Calculadora
          </Link>
          <button
            onClick={() => setShowNewJob(true)}
            className="flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
          >
            <Plus size={14} aria-hidden /> Desde repositorio
          </button>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Activos', value: String(kpis.activos), cls: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
          { label: 'Completados', value: String(kpis.completados), cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Gramos impresos', value: `${Math.round(kpis.gramosImpresos)}g`, cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
          { label: 'Tasa de fallos', value: `${kpis.tasaFallos.toFixed(0)}%`, cls: kpis.fallidos > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-800 border-slate-700' },
          {
            label: 'Desvío tiempo real',
            value: kpis.desvioTiempo == null ? '—' : `${kpis.desvioTiempo > 0 ? '+' : ''}${kpis.desvioTiempo.toFixed(0)}%`,
            cls: kpis.desvioTiempo != null && Math.abs(kpis.desvioTiempo) > 15
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-slate-400 bg-slate-800 border-slate-700',
          },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.cls}`}>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70 block">{k.label}</span>
            <p className="text-lg font-black tabular-nums mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex gap-1 overflow-x-auto">
        {['ALL', ...PRINT_JOB_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${
              statusFilter === s
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/25'
                : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'Todos' : PRINT_JOB_STATUS_LABELS[s as PrintJob3DStatus]}
            <span className="ml-1 opacity-60">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* LISTA */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-sm font-bold text-rose-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center bg-slate-900 rounded-3xl border border-slate-800">
          <PackageOpen size={36} className="mx-auto text-slate-600 mb-3" aria-hidden />
          <p className="text-sm font-bold text-slate-400">Sin trabajos en esta vista</p>
          <p className="text-xs text-slate-600 font-bold mt-1">
            Creá uno desde el Repositorio 3D con «Desde repositorio» o enviá un presupuesto desde la Calculadora.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => {
            const st = job.status as PrintJob3DStatus;
            const canAdvance = Boolean(NEXT_STATUS[st]);
            const isDone = st === 'completado' || st === 'entregado';
            const desvio =
              isDone && job.actual_time_h != null && job.est_time_h
                ? ((Number(job.actual_time_h) - Number(job.est_time_h)) / Number(job.est_time_h)) * 100
                : null;
            return (
              <div
                key={job.id}
                className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">
                    {job.name}
                    {job.print_models && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-[9px] font-black uppercase text-indigo-300 align-middle">
                        🧊 {job.print_models.name}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                    {job.created_at ? formatDate(job.created_at) : '—'} · {job.quantity}× pieza
                    {job.printer_name ? ` · ${job.printer_name}` : ''}
                    {job.filament_label ? ` · 🧶 ${job.filament_label}` : ''}
                  </p>
                  {st === 'entregado' && (
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400/90 mt-1">
                      <Receipt size={11} aria-hidden /> Venta registrada · Remito generado
                    </p>
                  )}
                  {isDone && job.actual_cost_total != null && (
                    <p className="text-[10px] font-bold text-emerald-500/80 mt-0.5 tabular-nums">
                      Costo real material: ${Number(job.actual_cost_total).toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase">Peso est.</p>
                    <p className="text-xs font-black text-slate-300 tabular-nums">
                      {job.est_weight_g != null ? `${Math.round(Number(job.est_weight_g))}g` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase">Tiempo</p>
                    <p className={`text-xs font-black tabular-nums ${desvio != null && desvio > 15 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {hoursToTime(Number(job.actual_time_h ?? job.est_time_h ?? 0))}
                      {isDone && job.actual_time_h != null && (
                        <span className="text-[9px] ml-1 opacity-70">real</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase">Precio est.</p>
                    <p className="text-xs font-black text-violet-300 tabular-nums">
                      {job.est_price_total != null ? fmt(Number(job.est_price_total)) : '—'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase ${PRINT_JOB_STATUS_STYLES[st] ?? PRINT_JOB_STATUS_STYLES.presupuestado}`}
                  >
                    {PRINT_JOB_STATUS_LABELS[st] ?? st}
                  </span>
                </div>

                <div className="flex gap-1.5 shrink-0 md:ml-2">
                  {st === 'completado' && (
                    <button
                      onClick={() => setDeliverTarget(job)}
                      title="Entregar: registra venta y genera remito"
                      className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors text-[9px] font-black uppercase"
                    >
                      <Truck size={14} aria-hidden />
                      Entregar
                    </button>
                  )}
                  {canAdvance && (
                    <button
                      onClick={() => void handleAdvance(job)}
                      title={nextLabel(st)}
                      className="p-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 rounded-lg transition-colors"
                    >
                      <ChevronRight size={14} aria-hidden />
                    </button>
                  )}
                  {!isDone && st !== 'fallido' && (
                    <>
                      <button
                        onClick={() => void handleComplete(job)}
                        title="Completar (descuenta filamento)"
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg transition-colors"
                      >
                        <CheckCircle2 size={14} aria-hidden />
                      </button>
                      <button
                        onClick={() => void handleFail(job)}
                        title="Marcar fallido"
                        className="p-2 bg-rose-600/10 hover:bg-rose-600/30 text-rose-400 rounded-lg transition-colors"
                      >
                        <XCircle size={14} aria-hidden />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => void handleDelete(job.id)}
                    title="Eliminar"
                    aria-label="Eliminar trabajo"
                    className="p-2 bg-slate-800 hover:bg-rose-600/30 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nota al pie */}
      <p className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
        <Scale size={12} aria-hidden />
        Al completar se descuenta filamento y registra el costo real; al entregar se registra la venta y se genera el remito.
        <Clock size={12} className="ml-2" aria-hidden />
        El desvío de tiempo compara lo estimado vs lo real para ajustar futuros presupuestos.
        {kpis.fallidos > 0 && (
          <span className="flex items-center gap-1 text-rose-500/80">
            <AlertOctagon size={12} /> Revisá los trabajos fallidos del período.
          </span>
        )}
      </p>

      {/* MODALES */}
      {showNewJob && <NewJobFromRepoModal onClose={() => setShowNewJob(false)} />}
      {deliverTarget && (
        <DeliverJobModal
          job={jobs.find((j) => j.id === deliverTarget.id) ?? deliverTarget}
          onClose={() => setDeliverTarget(null)}
        />
      )}
    </div>
  );
};
