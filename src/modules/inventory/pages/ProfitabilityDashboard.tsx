import { useMemo, useEffect, memo, useCallback } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { AIAnalyticBrain } from '../../ai/AIAnalyticBrain';

// 🚀 Formateador global para consistencia en todo el Holding
const ARS = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

export const ProfitabilityDashboard = memo(() => {
  const { products, inventory, fetchAllCatalogs, customers, isLoading: loadingCatalog } = useCatalogStore();
  const { transactions, fetchTransactions, isLoading: loadingTreasury } = useTreasuryStore();

  // 🚀 OPTIMIZACIÓN: Carga en paralelo para eliminar tiempos de espera secuenciales
  const initRadar = useCallback(async () => {
    await Promise.all([
      fetchAllCatalogs(),
      fetchTransactions()
    ]);
  }, [fetchAllCatalogs, fetchTransactions]);

  useEffect(() => {
    initRadar();
  }, [initRadar]);

  // 🧠 CÁLCULOS MAESTROS MEMORIZADOS
  const metrics = useMemo(() => {
    // 1. Caja Real: Consideramos solo transacciones completadas para mayor precisión
    const cashBalance = transactions
      .filter(t => t.status === 'COMPLETED' || !t.status)
      .reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0);
    
    // 2. Dinero en Calle: Basado en saldos de Cuentas Corrientes del CRM
    const totalDebt = customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    
    // 3. Potencial de Venta: Valuación del stock terminado listo para entrega
    let facturacionPotencial = 0;
    products.forEach(p => {
      const variants = inventory.filter(v => v.product_id === p.id);
      variants.forEach(v => {
        facturacionPotencial += ((Number(v.finished_quantity) || 0) * (Number(p.price) || 0));
      });
    });

    return { cashBalance, totalDebt, facturacionPotencial };
  }, [products, inventory, transactions, customers]);

  const isLoading = loadingCatalog || loadingTreasury;

  if (isLoading) {
    return (
      <div className="p-8 h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-400 font-black uppercase animate-pulse tracking-[0.4em] italic">
          Sincronizando Radar Financiero...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-1">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">
          Radar de <span className="text-blue-600">Rentabilidad</span>
        </h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">
          Holder Raíces • Inteligencia de Negocios en Tiempo Real
        </p>
      </header>
      
      {/* 🧠 CEREBRO DE IA */}
      <div className="mb-6">
        <AIAnalyticBrain />
      </div>

      {/* TARJETAS DE IMPACTO FINANCIERO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Caja Real (Tesorería) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover:text-blue-500 transition-colors">Caja Real (Tesorería)</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">
            {ARS.format(metrics.cashBalance)}
          </p>
        </div>

        {/* Deuda B2B (CRM) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover:text-rose-500 transition-colors">Deuda a Cobrar (Cta. Cte.)</p>
          <p className="text-4xl font-black text-rose-500 tracking-tighter tabular-nums">
            {ARS.format(metrics.totalDebt)}
          </p>
        </div>

        {/* Potencial de Venta (Stock) */}
        <div className="bg-slate-900 dark:bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/20 transition-all hover:scale-[1.01] relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-blue-200 dark:text-blue-100 uppercase tracking-widest mb-3">Valor de Stock Terminado</p>
            <p className="text-4xl font-black tracking-tighter tabular-nums">
              {ARS.format(metrics.facturacionPotencial)}
            </p>
          </div>
          <div className="absolute right-0 bottom-0 p-4 opacity-10 text-6xl italic font-black">📦</div>
        </div>

      </div>

      <footer className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic">
          Datos auditados — Sincronización automática con Tesorería, Ventas e Inventario.
        </p>
      </footer>
    </div>
  );
});

ProfitabilityDashboard.displayName = 'ProfitabilityDashboard';