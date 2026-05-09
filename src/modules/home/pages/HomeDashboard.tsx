import { useEffect, useMemo, memo } from 'react';
import { useOrderStore } from '../../orders/store/useOrderStore';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useNavigate } from 'react-router-dom';

const ARS = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

export const HomeDashboard = memo(() => {
  const navigate = useNavigate();
  const { orders, fetchOrders, isLoading: loadingOrders } = useOrderStore();
  const { customers, fetchAllCatalogs, isLoading: loadingCatalog } = useCatalogStore();

  useEffect(() => {
    // 🚀 Sincronización inicial paralela
    fetchOrders();
    fetchAllCatalogs();
  }, [fetchOrders, fetchAllCatalogs]);

  // 🧠 LÓGICA MAESTRA: Diagnóstico en tiempo real del Holding
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Ingresos: Suma de señas de pedidos actuales
    const totalIncome = orders.reduce((acc, o) => acc + (Number(o.advancePayment) || 0), 0);
    
    // 2. SALDO EN LA CALLE: Suma total de los balances de las cuentas corrientes
    const totalInStreet = customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    
    const urgentCount = orders.filter(o => 
      o.status !== 'DELIVERED' && 
      o.status !== 'CANCELLED' && 
      o.dueDate <= today
    ).length;

    const partialCount = orders.filter(o => o.status === 'PARTIAL').length;
    
    return {
      totalIncome,
      totalInStreet,
      urgentCount,
      partialCount
    };
  }, [orders, customers]);

  const isLoading = loadingOrders || loadingCatalog;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* CABECERA HOLDING */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2">Bienvenido al Centro de Control</p>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic uppercase">
            Raíces <span className="text-blue-600">Holding</span>
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado del Sistema</p>
          <p className="text-[10px] font-black text-emerald-500 uppercase flex items-center justify-end gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Sincronizado con Supabase
          </p>
        </div>
      </header>

      {/* RADIOGRAFÍA FINANCIERA (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos (Señas)</p>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {ARS.format(stats.totalIncome)}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo en la calle</p>
          <h3 className="text-3xl font-black text-rose-600 dark:text-rose-500 tabular-nums">
            {ARS.format(stats.totalInStreet)}
          </h3>
        </div>

        <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Pedidos Urgentes</p>
            <h3 className="text-3xl font-black text-white tabular-nums">{stats.urgentCount}</h3>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-4xl opacity-20 group-hover:scale-110 transition-transform">🚨</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Entregas Parciales</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{stats.partialCount}</h3>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-4xl opacity-5 group-hover:scale-110 transition-transform">🚚</div>
        </div>

      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[50px] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Actividad de Hoja de Ruta</h3>
          <button 
            onClick={() => navigate('/pedidos')}
            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
          >
            Ver todos los pedidos →
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.5em] animate-pulse">Escaneando transacciones...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {orders.slice(0, 4).map(o => (
              <div key={o.id} className="flex justify-between items-center p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">📦</div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-none">{o.customerName}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Pedido #{o.id?.substring(0,8).toUpperCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-500 tabular-nums">
                    {o.advancePayment > 0 ? `+ ${ARS.format(o.advancePayment)}` : ARS.format(0)}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seña Recibida</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
});

HomeDashboard.displayName = 'HomeDashboard';