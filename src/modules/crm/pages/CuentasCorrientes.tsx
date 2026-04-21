import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebtStore } from '../../crm/store/useDebtStore';
import type { CustomerDebt } from '../../crm/store/useDebtStore';
import { Search, Wallet, History, X } from 'lucide-react';
import Swal from 'sweetalert2';

// --------------------------------------------------------------------------
// 1. UTILIDADES Y HOOKS (Deberían ir en archivos separados en un entorno real)
// --------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

const formatDate = (dateString: string | null) => 
  dateString ? new Date(dateString).toLocaleDateString('es-AR') : 'Sin registros';

// --------------------------------------------------------------------------
// 2. COMPONENTES AISLADOS (Single Responsibility Principle)
// --------------------------------------------------------------------------

const PaymentModal = React.memo(({ 
  customer, 
  onClose, 
  onConfirm 
}: { 
  customer: CustomerDebt; 
  onClose: () => void; 
  onConfirm: (id: string, amount: number) => Promise<boolean>; 
}) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    const amount = Number(paymentAmount);
    
    // Validación Crítica de Seguridad
    if (isNaN(amount) || amount <= 0) {
      Swal.fire('Error', 'El monto debe ser un número mayor a 0', 'error');
      return;
    }

    setIsProcessing(true);
    const success = await onConfirm(customer.id, amount);
    setIsProcessing(false);
    
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase">Registrar Entrega</h3>
          <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-rose-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
            <p className="font-black text-slate-900 dark:text-white uppercase">{customer.name}</p>
            <p className="text-xl font-black text-rose-500 mt-2">Deuda: {formatCurrency(customer.total_debt)}</p>
          </div>

          <div>
            <label htmlFor="amountInput" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto a entregar ($)</label>
            <input 
              id="amountInput"
              autoFocus
              type="number" 
              step="0.01"
              min="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              disabled={isProcessing}
              className="w-full mt-1 px-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-2xl font-black outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl uppercase text-xs hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase text-xs shadow-lg shadow-emerald-500/30 hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const DebtorRow = React.memo(({ debtor, onSelect }: { debtor: CustomerDebt; onSelect: (d: CustomerDebt) => void }) => (
  <tr className="hover:bg-white dark:hover:bg-slate-800 transition-colors group">
    <td className="px-6 py-4">
      <div className="flex flex-col">
        <span className="font-black text-slate-900 dark:text-white text-sm uppercase">{debtor.name}</span>
        <span className="text-[10px] text-slate-400 font-bold">{debtor.phone || 'Sin teléfono'}</span>
      </div>
    </td>
    <td className="px-6 py-4 text-right">
      <span className={`text-lg font-black tabular-nums ${debtor.total_debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
        {formatCurrency(debtor.total_debt)}
      </span>
    </td>
    <td className="px-6 py-4 text-center">
      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full uppercase">
        {formatDate(debtor.last_payment_date)}
      </span>
    </td>
    <td className="px-6 py-4 text-right">
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => onSelect(debtor)}
          className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm"
          title="Registrar Pago"
        >
          <Wallet className="w-4 h-4" />
        </button>
        <button 
          className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
          title="Ver Historial"
        >
          <History className="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
));

// --------------------------------------------------------------------------
// 3. COMPONENTE PRINCIPAL
// --------------------------------------------------------------------------

export const CuentasCorrientes = () => {
  const { debtors, fetchDebtors, registerPayment, isLoading } = useDebtStore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDebt | null>(null);

  useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  const filteredDebtors = useMemo(() => {
    if (!debouncedSearchTerm) return debtors.sort((a, b) => b.total_debt - a.total_debt);
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return debtors
      .filter(d => d.name.toLowerCase().includes(lowerSearch))
      .sort((a, b) => b.total_debt - a.total_debt);
  }, [debtors, debouncedSearchTerm]);

  // Handler memoizado para evitar re-renders en DebtorRow
  const handleSelectCustomer = useCallback((customer: CustomerDebt) => {
    setSelectedCustomer(customer);
  }, []);

  // Lógica de negocio separada de la UI
  const handleProcessPayment = useCallback(async (customerId: string, amount: number): Promise<boolean> => {
    const customer = debtors.find(d => d.id === customerId);
    if (!customer) return false;

    if (amount > customer.total_debt) {
      const confirm = await Swal.fire({
        title: '¿Saldo a favor?',
        text: `El pago supera la deuda actual. El cliente quedará con saldo a favor.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, registrar'
      });
      if (!confirm.isConfirmed) return false;
    }

    try {
      await registerPayment(customerId, amount);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pago registrado', showConfirmButton: false, timer: 2000 });
      return true;
    } catch (err) {
      Swal.fire('Error', 'Fallo de transacción en el servidor', 'error');
      return false;
    }
  }, [debtors, registerPayment]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">CUENTAS CORRIENTES</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gestión de cobros y saldos</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Saldo Actual</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Último Pago</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                <tr><td colSpan={4} className="p-10 text-center animate-pulse font-bold text-slate-400">Cargando deudores...</td></tr>
              ) : filteredDebtors.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center font-bold text-slate-400">No se encontraron resultados</td></tr>
              ) : (
                filteredDebtors.map(d => (
                  <DebtorRow key={d.id} debtor={d} onSelect={handleSelectCustomer} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <PaymentModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
          onConfirm={handleProcessPayment} 
        />
      )}
    </div>
  );
};