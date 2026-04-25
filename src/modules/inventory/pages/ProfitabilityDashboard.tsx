import { useMemo, useEffect } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { AIAnalyticBrain } from '../../ai/AIAnalyticBrain';

export const ProfitabilityDashboard = () => {
  const { products, inventory, fetchAllCatalogs, customers, isLoading } = useCatalogStore();
  const { transactions, fetchTransactions } = useTreasuryStore();

  useEffect(() => {
    fetchAllCatalogs();
    fetchTransactions();
  }, [fetchAllCatalogs, fetchTransactions]);

  const metrics = useMemo(() => {
    // Calculamos la guita real que hay en las cuentas
    const cashBalance = transactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    
    // Calculamos cuánto nos deben los clientes (Santiago, Corrientes, etc.)
    const totalDebt = customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    
    // Calculamos cuánto valdría vender todo lo que está terminado en el estante
    let facturacionPotencial = 0;
    products.forEach(p => {
      const variants = inventory.filter(v => v.product_id === p.id);
      variants.forEach(v => {
        facturacionPotencial += ((v.finished_quantity || 0) * (p.price || 0));
      });
    });

    return { cashBalance, totalDebt, facturacionPotencial };
  }, [products, inventory, transactions, customers]);

  if (isLoading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Cargando radar financiero...</div>;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-700">
      <header>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">
          Radar de <span className="text-blue-600">Rentabilidad</span>
        </h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">
          Holder Raíces • Inteligencia de Negocios
        </p>
      </header>
      
      {/* 🧠 EL CEREBRO DE IA (Solo una vez y bien destacado) */}
      <div className="mb-10">
        <AIAnalyticBrain />
      </div>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Caja Real */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-blue-500 transition-colors">Caja Real (Tesorería)</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
            ${metrics.cashBalance.toLocaleString('es-AR')}
          </p>
        </div>

        {/* Deuda B2B */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-rose-500 transition-colors">Deuda a Cobrar (B2B)</p>
          <p className="text-4xl font-black text-rose-500 tracking-tighter">
            ${metrics.totalDebt.toLocaleString('es-AR')}
          </p>
        </div>

        {/* Potencial de Stock */}
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02]">
          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Venta de Stock Terminado</p>
          <p className="text-4xl font-black tracking-tighter">
            ${metrics.facturacionPotencial.toLocaleString('es-AR')}
          </p>
        </div>

      </div>

      {/* Espacio para gráficos o reportes adicionales */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Los datos se actualizan automáticamente al registrar movimientos en Tesorería o Ventas.
        </p>
      </div>
    </div>
  );
};