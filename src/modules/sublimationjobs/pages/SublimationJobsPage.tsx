import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shirt,
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
import { useSublimationJobStore } from '../store/useSublimationJobStore';
import {
  SUBLIMATION_JOB_STATUSES,
  SUBLIMATION_JOB_STATUS_LABELS,
  SUBLIMATION_JOB_STATUS_STYLES,
  SUBLIMATION_NEXT_STATUS,
  type SublimationJobStatus,
} from '../types';
import type { SublimationJob } from '../types';
import { useToastStore } from '../../../store/useToastStore';
import { Spinner } from '../../../shared/components/ui/Spinner';
import { formatDate } from '../../../shared/utils/format';
import { NewSublimationJobModal } from '../components/NewSublimationJobModal';
import { DeliverSublimationJobModal } from '../components/DeliverSublimationJobModal';
import { useBlankStore } from '../../blanks/store/useBlankStore';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);

const ACTIVE_STATUSES: SublimationJobStatus[] = ['en_cola', 'imprimiendo'];

const nextLabel = (st: SublimationJobStatus): string => {
  const next = SUBLIMATION_NEXT_STATUS[st];
  return next ? `Avanzar a ${SUBLIMATION_JOB_STATUS_LABELS[next]}` : 'Avanzar';
};

export const SublimationJobsPage = () => {
  const toast = useToastStore((s) => s.toast);
  const { jobs, isLoading, error, fetchJobs, setStatus, completeJob, deleteJob } =
    useSublimationJobStore();
  const blanks = useBlankStore((s) => s.blanks);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showNewJob, setShowNewJob] = useState(false);
  const [deliverTarget, setDeliverTarget] = useState<SublimationJob | null>(null);

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
    const activos = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status as SublimationJobStatus)).length;
    const completados = jobs.filter((j) => j.status === 'completado' || j.status === 'entregado');
    const fallidos = jobs.filter((j) => j.status === 'fallido');
    const costoReal = completados.reduce((s, j) => s + Number(j.actual_cost_total ?? 0), 0);
    const costoEst = jobs.reduce((s, j) => s + Number(j.est_cost_total ?? j.est_price_total ?? 0), 0);
    return {
      activos,
      completados: completados.length,
      costoReal,
      costoEst,
      tasaFallos: jobs.length > 0 ? (fallidos.length / jobs.length) * 100 : 0,
      fallidos: fallidos.length,
    };
  }, [jobs]);

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? jobs : jobs.filter((j) => j.status === statusFilter)),
    [jobs, statusFilter],
  );

  const handleAdvance = async (job: SublimationJob) => {
    const next = SUBLIMATION_NEXT_STATUS[job.status as SublimationJobStatus];
    if (!next) return;
    if (next === 'completado') {
      await handleComplete(job);
      return;
    }
    try {
      await setStatus(job.id, next);
      toast(`Trabajo pasado a "${SUBLIMATION_JOB_STATUS_LABELS[next]}"`, { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('No se pudo actualizar el estado', { type: 'error' });
    }
  };

  const handleComplete = async (job: SublimationJob) => {
    const blank = blanks.find((b) => b.id === job.blank_id);
    const suggested =
      blank?.cost_price != null ? Number(blank.cost_price) * job.quantity : Number(job.est_cost_total ?? 0);

    const res = await Swal.fire({
      title: 'Completar trabajo',
      html: `
        <p style="font-size:12px;color:#64748b;margin-bottom:12px">${job.name}</p>
        <input id="sj-cost" type="number" min="0" step="0.01" class="swal2-input" placeholder="Costo real ($)"
          value="${Math.round(suggested)}" />
        <textarea id="sj-notes" class="swal2-textarea" placeholder="Notas (opcional): fallos, retoques..."></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Completar',
      confirmButtonColor: '#c026d3',
      preConfirm: () => {
        const c = parseFloat(
          (document.getElementById('sj-cost') as HTMLInputElement | null)?.value.replace(',', '.') ?? '',
        );
        const notes = (document.getElementById('sj-notes') as HTMLTextAreaElement | null)?.value ?? '';
        if (!isFinite(c) || c < 0) {
          Swal.showValidationMessage('Ingresá el costo real.');
          return null;
        }
        return { cost: c, notes };
      },
    });

    if (!res.isConfirmed || !res.value) return;

    try {
      await completeJob(job.id, {
        actual_cost_total: res.value.cost,
        actual_notes: res.value.notes || undefined,
      });
      toast('Trabajo completado', { type: 'success' });
    } catch (err) {
      console.error(err);
      toast('No se pudo completar el trabajo', { type: 'error' });
    }
  };

  const handleFail = async (job: SublimationJob) => {
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
      await useSublimationJobStore.getState().updateJob(job.id, {
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
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-600/30 shrink-0">
            <Shirt size={28} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
              Producción Sublimación
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Cola de trabajos: diseño + producto base, estados y costo real vs estimado.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/calculadora-sublimacion"
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
          >
            Calculadora
          </Link>
          <button
            onClick={() => setShowNewJob(true)}
            className="flex items-center gap-2 px-5 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors"
          >
            <Plus size={14} aria-hidden /> Desde repositorio
          </button>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Activos', value: String(kpis.activos), cls: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
          { label: 'Completados', value: String(kpis.completados), cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Costo real acum.', value: fmt(kpis.costoReal), cls: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
          {
            label: 'Tasa de fallos',
            value: `${kpis.tasaFallos.toFixed(0)}%`,
            cls: kpis.fallidos > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-slate-400 bg-slate-800 border-slate-700',
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
        {['ALL', ...SUBLIMATION_JOB_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${
              statusFilter === s
                ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/25'
                : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'Todos' : SUBLIMATION_JOB_STATUS_LABELS[s as SublimationJobStatus]}
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
            Creá uno desde el Repositorio de Diseños con «Desde repositorio» o enviá un presupuesto desde la Calculadora.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => {
            const st = job.status as SublimationJobStatus;
            const canAdvance = Boolean(SUBLIMATION_NEXT_STATUS[st]);
            const isDone = st === 'completado' || st === 'entregado';
            return (
              <div
                key={job.id}
                className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4 bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">
                    {job.name}
                    {job.sublimation_designs && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-md bg-fuchsia-500/15 border border-fuchsia-500/30 text-[9px] font-black uppercase text-fuchsia-300 align-middle">
                        🎨 {job.sublimation_designs.name}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                    {job.created_at ? formatDate(job.created_at) : '—'} · {job.quantity}× pieza
                    {job.blank_label ? ` · ${job.blank_label}` : ''}
                  </p>
                  {st === 'entregado' && (
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-fuchsia-400/90 mt-1">
                      <Receipt size={11} aria-hidden /> Venta registrada · Remito generado
                    </p>
                  )}
                  {isDone && job.actual_cost_total != null && (
                    <p className="text-[10px] font-bold text-emerald-500/80 mt-0.5 tabular-nums">
                      Costo real: ${Number(job.actual_cost_total).toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase">Precio est.</p>
                    <p className="text-xs font-black text-fuchsia-300 tabular-nums">
                      {job.est_price_total != null ? fmt(Number(job.est_price_total)) : '—'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase ${SUBLIMATION_JOB_STATUS_STYLES[st] ?? SUBLIMATION_JOB_STATUS_STYLES.presupuestado}`}
                  >
                    {SUBLIMATION_JOB_STATUS_LABELS[st] ?? st}
                  </span>
                </div>

                <div className="flex gap-1.5 shrink-0 md:ml-2">
                  {st === 'completado' && (
                    <button
                      onClick={() => setDeliverTarget(job)}
                      title="Entregar: registra venta y genera remito"
                      className="flex items-center gap-1.5 px-3 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg transition-colors text-[9px] font-black uppercase"
                    >
                      <Truck size={14} aria-hidden />
                      Entregar
                    </button>
                  )}
                  {canAdvance && (
                    <button
                      onClick={() => void handleAdvance(job)}
                      title={nextLabel(st)}
                      className="p-2 bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-300 rounded-lg transition-colors"
                    >
                      <ChevronRight size={14} aria-hidden />
                    </button>
                  )}
                  {!isDone && st !== 'fallido' && (
                    <>
                      <button
                        onClick={() => void handleComplete(job)}
                        title="Completar (registra costo real)"
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
        Al completar se registra el costo real (producto base × cantidad); al entregar se registra la venta y se genera el remito.
        {kpis.fallidos > 0 && (
          <span className="flex items-center gap-1 text-rose-500/80">
            <AlertOctagon size={12} /> Revisá los trabajos fallidos del período.
          </span>
        )}
      </p>

      {/* MODALES */}
      {showNewJob && <NewSublimationJobModal onClose={() => setShowNewJob(false)} />}
      {deliverTarget && (
        <DeliverSublimationJobModal
          job={jobs.find((j) => j.id === deliverTarget.id) ?? deliverTarget}
          onClose={() => setDeliverTarget(null)}
        />
      )}
    </div>
  );
};
