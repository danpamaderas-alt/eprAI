import { useMemo, useEffect, useState } from 'react';
import { TransactionForm } from '../treasury/components/TransactionForm';
import { TransactionTable } from '../treasury/components/TransactionTable';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';

const ARS_FORMATTER = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

const formatCurrency = (val: number): string => ARS_FORMATTER.format(val);

export const TreasuryDashboard = () => {
  const { 
    transactions = [], 
    addTransaction, 
    deleteTransaction, 
    updateTransactionStatus, 
    fetchTransactions,
    isLoading 
  } = useTreasuryStore();

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const balances = useMemo(() => {
    const calc = { TOTAL: 0, MERCADO_PAGO: 0, BANCO: 0, EFECTIVO: 0, PENDIENTE: 0 };
    
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const amount = Number(tx.amount) || 0;
      const isIncome = tx.type === 'INCOME';
      const val = isIncome ? amount : -amount;

      if (tx.status === 'PENDING') {
        calc.PENDIENTE += val;
        continue; 
      }

      calc.TOTAL += val;
      
      switch (tx.paymentMethod) {
        case 'MERCADO_PAGO': calc.MERCADO_PAGO += val; break;
        case 'BANCO': calc.BANCO += val; break;
        case 'EFECTIVO': calc.EFECTIVO += val; break;
      }
    }
    
    return calc;
  }, [transactions]);

  const handleAddTransaction = async (data: any) => {
    try {
      await addTransaction(data);
      setShowForm(false);
    } catch (error) {
      console.error('[Treasury Error] Falla al registrar movimiento:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {/* MODO OSCURO: dark:text-white */}
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic transition-colors">Tesorería</h1>
          {/* MODO OSCURO: dark:text-slate-400 */}
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-widest mt-1 transition-colors">Control de flujos y conciliación bancaria.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="group flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform duration-300" aria-hidden="true">+</span>
            NUEVO MOVIMIENTO
          </button>
        )}
      </div>

      {showForm && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <TransactionForm 
            onSubmitSuccess={handleAddTransaction} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TARJETA TOTAL: Ya era oscura, la hacemos apenitas más profunda con dark:bg-slate-950 */}
        <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group border-l-8 border-blue-500 transition-colors duration-300">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Liquidez Real</p>
          <h3 className="text-3xl font-black">{formatCurrency(balances.TOTAL)}</h3>
        </div>

        {/* TARJETAS COMUNES: Pasan de bg-white a dark:bg-slate-800 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-8 border-sky-400 transition-colors duration-300">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mercado Pago</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(balances.MERCADO_PAGO)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-8 border-emerald-500 transition-colors duration-300">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Banco Galicia</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(balances.BANCO)}</h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-8 border-amber-500 transition-colors duration-300">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Caja Fuerte (EFE)</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">{formatCurrency(balances.EFECTIVO)}</h3>
        </div>
      </div>

      {/* CONTENEDOR DE LA TABLA: Pasa a dark:bg-slate-800 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/80 transition-colors duration-300">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Libro Mayor Detallado</h2>
          
          {balances.PENDIENTE !== 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg animate-pulse transition-colors" role="alert">
              <span className="text-[10px] font-black uppercase">Pendientes: {formatCurrency(balances.PENDIENTE)}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" aria-hidden="true"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando con Supabase...</p>
          </div>
        ) : (
          <TransactionTable 
            data={transactions} 
            onDelete={deleteTransaction} 
            onUpdateStatus={updateTransactionStatus} 
          />
        )}
      </div>
    </div>
  );
};