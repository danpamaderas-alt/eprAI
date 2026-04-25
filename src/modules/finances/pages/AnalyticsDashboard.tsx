import React, { useEffect, useState } from 'react';
import { useAnalyticsStore } from '../store/useAnalyticsStore';
import { AIAnalyticBrain } from '../../ai/AIAnalyticBrain'; // 🧠 LA RUTA MÁGICA DE LA IA

export const AnalyticsDashboard = () => {
  const { metrics, topProducts, isLoading, fetchAnalytics } = useAnalyticsStore();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchAnalytics(month, year);
  }, [month, year, fetchAnalytics]);

  const totalCosts = metrics.laborCosts + metrics.supplyCosts + metrics.fixedCosts;

  if (isLoading) return <div className="p-8 text-white font-black uppercase animate-pulse">Calculando Rentabilidad...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER Y FILTRO DE MES */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl gap-4">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">📈 Radar de <span className="text-indigo-500">Rentabilidad</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Radiografía financiera y márgenes netos reales.</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500">
            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase outline-none focus:border-indigo-500">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      {/* 🧠 CEREBRO DE IA ENCHUFADO */}
      <div className="w-full">
        <AIAnalyticBrain />
      </div>

      {/* MÉTRICAS PRINCIPALES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ingresos Brutos (Ventas)</p>
          <p className="text-3xl font-black text-white tracking-tighter">${metrics.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Costos Totales</p>
          <p className="text-3xl font-black text-rose-400 tracking-tighter">-${totalCosts.toLocaleString()}</p>
        </div>
        <div className={`p-6 rounded-[2rem] shadow-xl border col-span-1 md:col-span-2 flex items-center justify-between ${metrics.netProfit >= 0 ? 'bg-indigo-600 border-indigo-500' : 'bg-rose-600 border-rose-500'}`}>
          <div>
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Ganancia Neta (Bolsillo)</p>
            <p className="text-5xl font-black text-white tracking-tighter">${metrics.netProfit.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">Margen Real</p>
            <p className="text-4xl font-black text-white tracking-tighter">{metrics.margin.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RADIOGRAFÍA DE COSTOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Radiografía de Egresos</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-black uppercase mb-2">
                <span className="text-amber-500">Materia Prima / Insumos</span>
                <span className="text-white">${metrics.supplyCosts.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3">
                <div className="bg-amber-500 h-3 rounded-full" style={{ width: `${totalCosts > 0 ? (metrics.supplyCosts / totalCosts) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-black uppercase mb-2">
                <span className="text-blue-500">Mano de Obra (Talleristas)</span>
                <span className="text-white">${metrics.laborCosts.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${totalCosts > 0 ? (metrics.laborCosts / totalCosts) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-black uppercase mb-2">
                <span className="text-rose-500">Gastos Fijos / Impuestos</span>
                <span className="text-white">${metrics.fixedCosts.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3">
                <div className="bg-rose-500 h-3 rounded-full" style={{ width: `${totalCosts > 0 ? (metrics.fixedCosts / totalCosts) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* RANKING DE PRODUCTOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Productos Estrella (Top Ventas)</h2>
          
          {topProducts.length === 0 ? (
            <p className="text-slate-500 text-xs font-bold uppercase text-center mt-10">No hay ventas registradas este mes.</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((prod, index) => {
                const maxRevenue = topProducts[0].revenue; // Para escalar las barras
                const percent = (prod.revenue / maxRevenue) * 100;

                return (
                  <div key={index} className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden group">
                    {/* Barra de fondo */}
                    <div className="absolute top-0 left-0 h-full bg-indigo-500/10 transition-all" style={{ width: `${percent}%` }}></div>
                    
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-500">#{index + 1}</span>
                          <h3 className="text-sm font-black text-white uppercase">{prod.name}</h3>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{prod.quantity} unidades vendidas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-400 tracking-tighter">${prod.revenue.toLocaleString()}</p>
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
};