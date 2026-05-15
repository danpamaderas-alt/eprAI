import { useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';

export const DashboardInicio = memo(() => {
  // 🧠 CONEXIÓN CON LOS MOTORES CENTRALES
  const { inventory, fetchAllCatalogs } = useCatalogStore();
  const { balances, fetchBalances } = useCrmStore(); // ✅ FIX: Nombres corregidos según useCrmStore.ts
  const { transactions, fetchTransactions } = useTreasuryStore();

  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  // 🚀 OPTIMIZACIÓN: Carga masiva en paralelo para máxima velocidad
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // ✅ FIX: Consulta de órdenes refactorizada a async/await
        const fetchOrdersCount = async () => {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'PENDING');
          setPedidosPendientes(count || 0);
        };

        await Promise.all([
          fetchAllCatalogs(),
          fetchBalances(), // ✅ FIX: Nombre corregido
          fetchTransactions(),
          fetchOrdersCount()
        ]);
      } catch (error) {
        console.error("❌ [Dashboard] Error en sincronización:", error);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    loadDashboardData();
  }, [fetchAllCatalogs, fetchBalances, fetchTransactions]);

  // 🧮 MÉTRICAS MEMORIZADAS (Solo se recalculan si cambian los datos base)
  const totalStock = useMemo(() => 
    inventory?.reduce((sum, item) => sum + (item.stock_quantity || 0), 0) || 0
  , [inventory]);

  const ingresosMes = useMemo(() => {
    if (!transactions) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        const isValidStatus = tx.status === 'COMPLETED' || !tx.status;
        return isValidStatus && 
               tx.type === 'INCOME' && 
               txDate.getMonth() === currentMonth && 
               txDate.getFullYear() === currentYear;
      })
      .reduce((sum, tx) => sum + (Number.parseFloat(tx.amount.toString()) || 0), 0);
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* HEADER HOLDING */}
      <header className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10 rotate-12">
          <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 4.5l7.5 13.5h-15L12 6.5z"/>
          </svg>
        </div>
        <div className="relative z-10">
          <h1 className="text-5xl font-black tracking-tighter mb-2 italic">
            Raíces <span className="text-blue-500">ERP</span>
          </h1>
          <p className="text-slate-400 font-bold text-lg uppercase tracking-widest">
            Panel de Control Operativo
          </p>
        </div>
      </header>

      {/* KPIs REAL-TIME */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Ingresos Mes Actual</p>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {isLoadingCounts ? '...' : formatCurrency(ingresosMes)}
          </p>
          <div className="absolute -right-2 -bottom-2 text-6xl opacity-5 grayscale group-hover:grayscale-0 transition-all">💰</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Stock Disponible</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {totalStock} <span className="text-xs text-slate-400 uppercase">Prendas</span>
          </p>
          <div className="absolute -right-2 -bottom-2 text-6xl opacity-5 grayscale group-hover:grayscale-0 transition-all">📦</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Cartera CRM</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            {balances?.length || 0} <span className="text-xs text-slate-400 uppercase">Activos</span>
          </p>
          <div className="absolute -right-2 -bottom-2 text-6xl opacity-5 grayscale group-hover:grayscale-0 transition-all">🤝</div>
        </div>

        <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-1">Hoja de Ruta</p>
          <p className="text-3xl font-black text-white tabular-nums">
            {pedidosPendientes} <span className="text-xs text-slate-500 uppercase">Pendientes</span>
          </p>
          <div className="absolute -right-2 -bottom-2 text-6xl opacity-10 group-hover:scale-110 transition-all">📋</div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TENDENCIA VISUAL */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">📈 Tendencia Operativa</h2>
          <div className="h-64 flex items-end justify-between gap-4 px-2 pb-6 border-b border-slate-100 dark:border-slate-700 relative">
            {[40, 70, 45, 90, 65, 80, 100].map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-3 group">
                <div className="w-full bg-slate-100 dark:bg-slate-900/50 rounded-2xl relative overflow-hidden h-full">
                  <div 
                    className="absolute bottom-0 w-full bg-blue-600 rounded-2xl transition-all duration-1000 ease-out delay-300 group-hover:bg-blue-500" 
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase">Día {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ACCESOS HOLDING */}
        <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">⚡ Accesos Críticos</h2>
          
          <div className="space-y-4 flex-1">
            {/* ✅ FIX: Ruta corregida de /pos a /ventas para coincidir con Sidebar.tsx */}
            <Link to="/ventas" className="flex items-center gap-5 p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">💰</div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">Venta Directa</h3>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Punto de Venta</p>
              </div>
            </Link>

            <Link to="/inventario" className="flex items-center gap-5 p-5 rounded-3xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">📦</div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">Almacén Central</h3>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Stock & Insumos</p>
              </div>
            </Link>

            <Link to="/tesoreria" className="flex items-center gap-5 p-5 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">💵</div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">Caja y Bancos</h3>
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Tesorería Real</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
});

DashboardInicio.displayName = 'DashboardInicio';