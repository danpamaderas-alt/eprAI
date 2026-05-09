import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useDebtStore } from '../../crm/store/useDebtStore';
import type { CustomerDebt, DebtMovement } from '../../crm/store/useDebtStore';
import { Search, Wallet, History, X, Edit2, Trash2, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

// --- UTILIDADES ---
// 🚀 OPTIMIZACIÓN: Custom hook para evitar re-renders excesivos en búsquedas
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('es-AR') : 'Sin registros';


// --- MODAL DE NUEVA DEUDA ---
// 🚀 OPTIMIZACIÓN: Envolvemos en memo para que no consuma recursos si está cerrado
const AddDebtModal = memo(({ debtors, onClose, onConfirm }: { 
  debtors: CustomerDebt[]; 
  onClose: () => void; 
  onConfirm: (id: string, amount: number, concept: string) => Promise<boolean>; 
}) => {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('Fiado / Pendiente');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!customerId || isNaN(amt) || amt <= 0) {
      Swal.fire('Atención', 'Completá cliente y monto válido.', 'warning');
      return;
    }
    const success = await onConfirm(customerId, amt, concept);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-black uppercase tracking-tighter mb-6 dark:text-white italic">📝 Cargar Cargo Manual</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar Cliente...</option>
            {debtors.map(d => <option key={d.id} value={d.id}>{d.name} ({ARS.format(d.balance)})</option>)}
          </select>
          <input type="number" placeholder="Monto $" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-black text-lg outline-none focus:ring-2 focus:ring-blue-500" value={amount} onChange={e => setAmount(e.target.value)} />
          <input type="text" placeholder="Concepto (Ej: Saldo anterior)" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" value={concept} onChange={e => setConcept(e.target.value)} />
          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Guardar Deuda</button>
          </div>
        </form>
      </div>
    </div>
  );
});

// --- COMPONENTE PRINCIPAL ---
export const CuentasCorrientes = memo(() => {
  const { debtors, fetchDebtors, addDebt, processPayment, deleteMovement, editMovement } = useDebtStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400); // 🚀 OPTIMIZACIÓN: Solo filtra cada 400ms

  const [payingCustomer, setPayingCustomer] = useState<CustomerDebt | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerDebt | null>(null);
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);

  useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  // 🚀 OPTIMIZACIÓN: Filtrado memorizado con debounce
  const filteredDebtors = useMemo(() => {
    return debtors.filter(d => 
      d.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    ).sort((a, b) => b.balance - a.balance);
  }, [debtors, debouncedSearch]);

  const totalEnLaCalle = useMemo(() => 
    debtors.reduce((acc, curr) => acc + (curr.balance > 0 ? curr.balance : 0), 0)
  , [debtors]);

  // Acciones blindadas
  const handleAddDebt = useCallback(async (id: string, amt: number, concept: string) => {
    try {
      await addDebt(id, amt, concept);
      return true;
    } catch (e) {
      Swal.fire('Error', 'No se pudo cargar la deuda.', 'error');
      return false;
    }
  }, [addDebt]);

  const handleProcessPayment = useCallback(async (id: string, amt: number, method: string) => {
    try {
      await processPayment(id, amt, method);
      setPayingCustomer(null);
    } catch (e) {
      Swal.fire('Error', 'No se pudo registrar el pago.', 'error');
    }
  }, [processPayment]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Cuentas Corrientes</h1>
          <p className="text-sm font-bold text-slate-500 uppercase">Radar de saldos y gestión de cobranzas</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 p-4 rounded-2xl flex flex-col items-end">
          <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Total en la calle</span>
          <span className="text-2xl font-black text-rose-700 dark:text-rose-500">{ARS.format(totalEnLaCalle)}</span>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar por nombre de cliente..." 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsAddDebtModalOpen(true)}
          className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-xl hover:bg-black active:scale-95 transition-all"
        >
          + Cargar Cargo Manual
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deudor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Actual</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Último Pago</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredDebtors.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="block font-black text-slate-800 dark:text-white uppercase truncate max-w-[200px]">{d.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">Cliente Raíces</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-lg font-black ${d.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {ARS.format(d.balance)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-500 uppercase">{formatDate(d.last_payment_date)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setPayingCustomer(d)} className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90" title="Registrar Pago">
                        <Wallet className="w-4 h-4" />
                      </button>
                      <button onClick={() => setHistoryCustomer(d)} className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90" title="Ver Historial">
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDebtors.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs italic">
                    {searchTerm ? 'No se encontraron deudores con ese nombre' : 'La calle está limpia. ¡Sin deudas pendientes! 👏'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENDER DE MODALES */}
      {isAddDebtModalOpen && (
        <AddDebtModal 
          debtors={debtors} 
          onClose={() => setIsAddDebtModalOpen(false)} 
          onConfirm={handleAddDebt} 
        />
      )}

      {/* Aquí irían tus componentes de Modal de Pago e Historial ya existentes */}
      {/* Importante: Mantenerlos en el mismo estilo que AddDebtModal */}
    </div>
  );
});

CuentasCorrientes.displayName = 'CuentasCorrientes';