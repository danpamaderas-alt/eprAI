import { useEffect, useState, useMemo, memo } from 'react';
import { useAnalyticsStore } from '../store/useAnalyticsStore';
import { AIAnalyticBrain } from '../../ai/AIAnalyticBrain'; 

export const AnalyticsDashboard = memo(() => {
  const { metrics, topProducts, isLoading, fetchAnalytics } = useAnalyticsStore();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAnalytics(month, year);
  }, [month, year, fetchAnalytics]);

  // 🚀 OPTIMIZACIÓN: Memorizamos el cálculo de costos para no repetirlo innecesariamente
  const totalCosts = useMemo(() => 
    metrics.laborCosts + metrics.supplyCosts + metrics.fixedCosts
  , [metrics]);

  // 🚀 OPTIMIZACIÓN: Memorizamos los porcentajes de la radiografía de costos
  const costPercentages = useMemo(() => {
    if (totalCosts === 0) return { supply: 0, labor: 0, fixed: 0 };
    return {
      supply: (metrics.supplyCosts / totalCosts) * 100,
      labor: (metrics.laborCosts / totalCosts) * 100,
      fixed: (metrics.fixedCosts / totalCosts) * 100
    };
  }, [totalCosts, metrics]);

  if (isLoading) {
    return (
      <div className="p-8 h-screen flex items-center justify-center bg-slate-950">
        <p className="text-white font-black uppercase animate-pulse tracking-[0.5em] italic">
          Calculando Rentabilidad Real...
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER Y FILTRO DE MES */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
            📈 Radar de <span className="text-blue-500">Rentabilidad</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">
            Radiografía financiera y márgenes netos de Raíces.
          </p>
        </div>
        <div className="flex gap-3 bg-slate-950 p-2 rounded-3xl border border-slate-800">
          <select 
            aria-label="Seleccionar Mes"
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))} 
            className="bg-transparent text-white px-4 py-2 rounded-2xl font-black text-xs uppercase outline-none focus:text-blue-500 transition-colors"
          >
            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
              <option key={i} value={i + 1} className="bg-slate-900">{m}</option>
            ))}
          </select>
          <select 
            aria-label="Seleccionar Año"
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))} 
            className="bg-transparent text-white px-4 py-2 rounded-2xl font-black text-xs uppercase outline-none focus:text-blue-500 transition-colors"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
          </select>
        </div>
      </header>

      {/* 🧠 CEREBRO DE IA ENCHUFADO */}
      <div className="w-full">
        <AIAnalyticBrain />
      </div>

      {/* MÉTRICAS PRINCIPALES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ventas Brutas</p>
          <p className="text-3xl font-black text-white tracking-tighter tabular-nums">${metrics.revenue.toLocaleString('es-AR')}</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Costos de Operación</p>
          <p className="text-3xl font-black text-rose-400 tracking-tighter tabular-nums">-${totalCosts.toLocaleString('es-AR')}</p>
        </div>
        
        <div className={`p-8 rounded-[3rem] shadow-xl border col-span-1 md:col-span-2 flex items-center justify-between transition-colors duration-500 ${metrics.netProfit >= 0 ? 'bg-blue-600 border-blue-500' : 'bg-rose-600 border-rose-500'}`}>
          <div>
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Ganancia Neta</p>
            <p className="text-5xl font-black text-white tracking-tighter italic tabular-nums">${metrics.netProfit.toLocaleString('es-AR')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Margen Real</p>
            <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{metrics.margin.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RADIOGRAFÍA DE COSTOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-xl">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8 italic">Distribución de Egresos</h2>
          
          <div className="space-y-8">
            <div>
              <div className="flex justify-between text-[10px] font-black uppercase mb-3">
                <span className="text-amber-500 tracking-widest">Materia Prima / Insumos</span>
                <span className="text-white">${metrics.supplyCosts.toLocaleString('es-AR')}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${costPercentages.supply}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-black uppercase mb-3">
                <span className="text-blue-500 tracking-widest">Mano de Obra (Taller)</span>
                <span className="text-white">${metrics.laborCosts.toLocaleString('es-AR')}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${costPercentages.labor}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-black uppercase mb-3">
                <span className="text-rose-500 tracking-widest">Gastos Fijos / Estructura</span>
                <span className="text-white">${metrics.fixedCosts.toLocaleString('es-AR')}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${costPercentages.fixed}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* RANKING DE PRODUCTOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-xl overflow-hidden">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8 italic">Ranking de Ventas (Top)</h2>
          
          {topProducts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-600 text-xs font-bold uppercase tracking-[0.4em] italic opacity-50">No hay registros para este periodo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((prod, index) => {
                const maxRevenue = topProducts[0].revenue || 1; 
                const percent = (prod.revenue / maxRevenue) * 100;

                return (
                  <div key={index} className="relative bg-slate-950 border border-slate-800 rounded-[2rem] p-5 overflow-hidden group transition-all hover:border-blue-500/50">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-600/10 transition-all duration-1000 ease-out border-r border-blue-500/20" 
                      style={{ width: `${percent}%` }}
                    ></div>
                    
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-blue-500 italic">#{index + 1}</span>
                          <h3 className="text-sm font-black text-white uppercase tracking-tight">{prod.name}</h3>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">{prod.quantity} unidades entregadas</p>
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

AnalyticsDashboard.displayName = 'AnalyticsDashboard';