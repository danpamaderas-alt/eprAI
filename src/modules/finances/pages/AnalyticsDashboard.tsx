import { useEffect, useState, useMemo, memo, useCallback } from 'react';
import { useAnalyticsStore } from '../store/useAnalyticsStore';
import { AIAnalyticBrain } from '../../ai/AIAnalyticBrain';
import { Breadcrumbs } from '../../../shared/components/ui/Breadcrumbs';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import { ExportButton } from '../../../shared/components/ui/ExportButton';
import { CostDistributionChart } from '../../../shared/components/charts/CostDistributionChart';
import { KpiSkeleton } from '../../../shared/components/ui/Skeleton';

const AnalyticsContent = memo(() => {
  const { metrics, topProducts, isLoading, fetchAnalytics } = useAnalyticsStore();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAnalytics(month, year);
  }, [month, year, fetchAnalytics]);

  const totalCosts = useMemo(
    () => (metrics?.laborCosts || 0) + (metrics?.supplyCosts || 0) + (metrics?.fixedCosts || 0),
    [metrics],
  );

  const costChartData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Insumos', value: metrics.supplyCosts || 0 },
      { name: 'Mano Obra', value: metrics.laborCosts || 0 },
      { name: 'Fijos', value: metrics.fixedCosts || 0 },
    ];
  }, [metrics]);

  const maxRevenue = useMemo(
    () => (topProducts.length > 0 ? (topProducts[0].revenue || 1) : 1),
    [topProducts],
  );

  const handleExportCSV = useCallback(() => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Ventas Brutas', metrics?.revenue || 0],
      ['Costos Insumos', metrics?.supplyCosts || 0],
      ['Costos Mano Obra', metrics?.laborCosts || 0],
      ['Costos Fijos', metrics?.fixedCosts || 0],
      ['Costo Total', totalCosts],
      ['Ganancia Neta', metrics?.netProfit || 0],
      ['Margen Real', `${(metrics?.margin || 0).toFixed(1)}%`],
      [],
      ['Producto,Unidades,Ingreso'],
      ...topProducts.map(p => [p.name, p.quantity, p.revenue].join(',')),
    ];
    const csv = rows.map(r => (Array.isArray(r) ? r.join(',') : r)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${month}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics, topProducts, totalCosts, month, year]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <Breadcrumbs items={[{ label: 'Analytics' }]} />

      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
            Radar de <span className="text-blue-500">Rentabilidad</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">
            Radiografía financiera y márgenes netos de Raíces.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <ExportButton onExportCSV={handleExportCSV} />
          <div className="flex gap-3 bg-slate-950 p-2 rounded-3xl border border-slate-800">
            <select
              aria-label="Seleccionar Mes"
              value={month}
              onChange={(e) => setMonth(Number.parseInt(e.target.value, 10))}
              className="bg-transparent text-white px-4 py-2 rounded-2xl font-black text-xs uppercase outline-none focus:text-blue-500 transition-colors"
            >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                <option key={m} value={i + 1} className="bg-slate-900">{m}</option>
              ))}
            </select>
            <select
              aria-label="Seleccionar Año"
              value={year}
              onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
              className="bg-transparent text-white px-4 py-2 rounded-2xl font-black text-xs uppercase outline-none focus:text-blue-500 transition-colors"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="w-full">
        <AIAnalyticBrain />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ventas Brutas</p>
          <p className="text-3xl font-black text-white tracking-tighter tabular-nums">${(metrics?.revenue || 0).toLocaleString('es-AR')}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Costos de Operación</p>
          <p className="text-3xl font-black text-rose-400 tracking-tighter tabular-nums">-${totalCosts.toLocaleString('es-AR')}</p>
        </div>

        <div className={`p-8 rounded-[3rem] shadow-xl border col-span-1 md:col-span-2 flex items-center justify-between transition-colors duration-500 ${(metrics?.netProfit || 0) >= 0 ? 'bg-blue-600 border-blue-500' : 'bg-rose-600 border-rose-500'}`}>
          <div>
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Ganancia Neta</p>
            <p className="text-5xl font-black text-white tracking-tighter tabular-nums">${(metrics?.netProfit || 0).toLocaleString('es-AR')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Margen Real</p>
            <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{(metrics?.margin || 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CostDistributionChart data={costChartData} />

        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-xl overflow-hidden">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Ranking de Ventas (Top)</h2>

          {topProducts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-600 text-xs font-bold uppercase tracking-[0.4em] opacity-50">No hay registros para este periodo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((prod, index) => {
                const percent = (prod.revenue / maxRevenue) * 100;
                return (
                  <div key={prod.name} className="relative bg-slate-950 border border-slate-800 rounded-[2rem] p-5 overflow-hidden group transition-all hover:border-blue-500/50">
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-600/10 transition-all duration-1000 ease-out border-r border-blue-500/20"
                      style={{ width: `${percent}%` }}
                    />
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-blue-500">#{index + 1}</span>
                          <h3 className="text-sm font-black text-white uppercase tracking-tight">{prod.name}</h3>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{prod.quantity} unidades entregadas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-emerald-400 tracking-tighter tabular-nums">${prod.revenue.toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AnalyticsContent.displayName = 'AnalyticsContent';

export const AnalyticsDashboard = memo(() => (
  <ErrorBoundary>
    <AnalyticsContent />
  </ErrorBoundary>
));

AnalyticsDashboard.displayName = 'AnalyticsDashboard';
