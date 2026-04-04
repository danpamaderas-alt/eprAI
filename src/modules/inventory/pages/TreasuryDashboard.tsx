import { useMemo, useEffect, useState } from 'react';
import { TransactionForm } from '../treasury/components/TransactionForm';
import { TransactionTable } from '../treasury/components/TransactionTable';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';

// Función de formateo fuera del componente para optimizar rendimiento
const formatCurrency = (val: number) => 
  new Intl.NumberFormat('es-AR', { 
    style: 'currency', 
    currency: 'ARS', 
    maximumFractionDigits: 0 
  }).format(val);

export const TreasuryDashboard = () => {
  const { 
    transactions, 
    addTransaction, 
    deleteTransaction, 
    updateTransactionStatus, 
    fetchTransactions,
    isLoading 
  } = useTreasuryStore();

  const [showForm, setShowForm] = useState(false);

  // Sincronización con la nube al montar la pantalla
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Cálculo de Balances con lógica de alta precisión
  const balances = useMemo(() => {
    const calc = { TOTAL: 0, MERCADO_PAGO: 0, BANCO: 0, EFECTIVO: 0, PENDIENTE: 0 };
    
    transactions.forEach(tx => {
      const amount = Number(tx.amount) || 0;
      
      // Si está pendiente, va a la bolsa de pendientes sin afectar la liquidez real
      if (tx.status === 'PENDING') {
        calc.PENDIENTE += (tx.type === 'INCOME' ? amount : -amount);
        return;
      }

      // Solo sumamos ingresos y restamos egresos si están COMPLETED
      let val = 0;
      if (tx.type === 'INCOME') val = amount;
      if (tx.type === 'EXPENSE') val = -amount;
      // Nota: TRANSFER no afecta el TOTAL neto, solo balance entre cuentas

      calc.TOTAL += val;
      if (tx.accountId === 'MERCADO_PAGO') calc.MERCADO_PAGO += val;
      if (tx.accountId === 'BANCO') calc.BANCO += val;
      if (tx.accountId === 'EFECTIVO') calc.EFECTIVO += val;
    });
    
    return calc;
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tesorería</h1>
          <p className="text-slate-500 text-sm font-medium">Control de flujos y conciliación bancaria.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="group flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform duration-300">+</span>
            NUEVO MOVIMIENTO
          </button>
        )}
      </div>

      {/* FORMULARIO (Si está activo) */}
      {showForm && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <TransactionForm 
            onSubmitSuccess={(data) => { 
              addTransaction(data); 
              setShowForm(false); 
            }} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      )}

      {/* TARJETAS DE BALANCE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Liquidez Total */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6-xl opacity-10 group-hover:scale-110 transition-transform">🏦</div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Liquidez Real</p>
          <h3 className="text-3xl font-black">{formatCurrency(balances.TOTAL)}</h3>
        </div>

        {/* Mercado Pago */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mercado Pago</p>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{formatCurrency(balances.MERCADO_PAGO)}</h3>
        </div>

        {/* Banco */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banco Galicia</p>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{formatCurrency(balances.BANCO)}</h3>
        </div>

        {/* Caja Fuerte */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caja Fuerte (EFE)</p>
          </div>
          <h3 className="text-2xl font-black text-slate-800">{formatCurrency(balances.EFECTIVO)}</h3>
        </div>
      </div>

      {/* TABLA DE MOVIMIENTOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Libro Mayor Detallado</h2>
          {balances.PENDIENTE !== 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg animate-pulse">
              <span className="text-sm">⚠️</span>
              <span className="text-[10px] font-black uppercase">Pendientes: {formatCurrency(balances.PENDIENTE)}</span>
            </div>
          )}
        </div>

        {/* Estado de carga o Tabla */}
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando con la nube...</p>
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