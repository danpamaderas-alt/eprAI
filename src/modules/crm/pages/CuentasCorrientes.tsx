import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebtStore } from '../../crm/store/useDebtStore';
import type { CustomerDebt, DebtMovement } from '../../crm/store/useDebtStore';
import { Search, Wallet, History, X, Edit2, Trash2, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

// --- UTILIDADES ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('es-AR') : 'Sin registros';


// --- MODAL DE NUEVA DEUDA ---
const AddDebtModal = ({ debtors, onClose, onConfirm }: { debtors: CustomerDebt[]; onClose: () => void; onConfirm: (id: string, amount: number, concept: string) => Promise<boolean>; }) => {
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('Fiado / Retiro de Mercadería');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    if (!customerId) { Swal.fire('Error', 'Selecciona un cliente', 'error'); return; }
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) { Swal.fire('Error', 'El monto debe ser mayor a 0', 'error'); return; }

    setIsProcessing(true);
    const success = await onConfirm(customerId, numAmount, concept);
    setIsProcessing(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-rose-500"/> Nuevo Cargo</h3>
          <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Cliente</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required disabled={isProcessing} className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none text-slate-900 dark:text-white">
              <option value="" disabled>Elegir cliente del CRM...</option>
              {/* Mostramos TODOS los clientes acá, incluso los de saldo 0 */}
              {debtors.map(d => <option key={d.id} value={d.id}>{d.name} (Saldo actual: {formatCurrency(d.total_debt)})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto de la deuda ($)</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" disabled={isProcessing} required className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xl font-black outline-none focus:border-rose-500 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto / Detalle</label>
            <input type="text" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: Remeras surtidas" disabled={isProcessing} required className="w-full mt-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none text-slate-900 dark:text-white" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={isProcessing} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-xs shadow-lg hover:bg-rose-500 active:scale-95 transition-all disabled:opacity-50">{isProcessing ? 'Procesando...' : 'Guardar Cargo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- MODAL DE PAGOS ---
const PaymentModal = React.memo(({ customer, onClose, onConfirm }: { customer: CustomerDebt; onClose: () => void; onConfirm: (id: string, amount: number) => Promise<boolean>; }) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) { Swal.fire('Error', 'El monto debe ser mayor a 0', 'error'); return; }

    setIsProcessing(true);
    const success = await onConfirm(customer.id, amount);
    setIsProcessing(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white">Registrar Entrega</h3>
          <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
            <p className="font-black text-slate-900 dark:text-white uppercase">{customer.name}</p>
            <p className="text-xl font-black text-rose-500 mt-2">Deuda: {formatCurrency(customer.total_debt)}</p>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto a entregar ($)</label>
            <input autoFocus type="number" step="0.01" min="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" disabled={isProcessing} required className="w-full mt-1 px-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-2xl font-black outline-none focus:border-emerald-500 transition-all disabled:opacity-50 text-slate-900 dark:text-white" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={isProcessing} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase text-xs shadow-lg hover:bg-emerald-500 transition-all">{isProcessing ? 'Procesando...' : 'Confirmar Pago'}</button>
          </div>
        </form>
      </div>
    </div>
  );
});


// --- MODAL DE HISTORIAL ---
const HistoryModal = ({ customer, onClose, onDelete, onEdit }: { customer: CustomerDebt; onClose: () => void; onDelete: (id: string) => Promise<void>; onEdit: (id: string, amount: number, concept: string) => Promise<void>; }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editConcept, setEditConcept] = useState('');

  const startEdit = (mov: DebtMovement) => { setEditingId(mov.id); setEditAmount(mov.amount.toString()); setEditConcept(mov.concept || ''); };

  const handleSaveEdit = async () => {
    if (!editingId || !editAmount) return;
    try {
      await onEdit(editingId, Number(editAmount), editConcept);
      setEditingId(null);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Editado', showConfirmButton: false, timer: 2000 });
    } catch {
      Swal.fire('Error', 'No se pudo guardar la edición', 'error');
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({ title: '¿Eliminar movimiento?', text: "Esto alterará la deuda actual del cliente.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, eliminar' })
    .then((result) => { if (result.isConfirmed) onDelete(id); });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white">Historial de Movimientos</h3>
            <p className="text-xs font-bold text-slate-500 uppercase">{customer.name} - Saldo: {formatCurrency(customer.total_debt)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {customer.movements?.length === 0 && <p className="text-center text-slate-400 font-bold py-8">No hay movimientos registrados.</p>}
          {customer.movements?.map((mov) => (
            <div key={mov.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              {editingId === mov.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                  <input type="text" value={editConcept} onChange={(e) => setEditConcept(e.target.value)} className="flex-1 p-2 border rounded-xl text-sm font-bold bg-slate-50 text-slate-900" placeholder="Concepto" />
                  <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-32 p-2 border rounded-xl text-sm font-bold bg-slate-50 text-slate-900" placeholder="Monto" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black">Guardar</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-xs font-black">X</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${mov.type === 'CARGO' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{mov.type}</span>
                      <span className="text-xs font-bold text-slate-400">{formatDate(mov.created_at)}</span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">{mov.concept || 'Sin descripción'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-black tabular-nums ${mov.type === 'CARGO' ? 'text-rose-500' : 'text-emerald-500'}`}>{mov.type === 'CARGO' ? '+' : '-'}{formatCurrency(mov.amount)}</span>
                    <div className="flex gap-1 border-l pl-4 border-slate-200 dark:border-slate-700">
                      <button onClick={() => startEdit(mov)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(mov.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---
export const CuentasCorrientes = () => {
  const { debtors, fetchDebtors, registerPayment, addDebt, deleteMovement, editMovement, isLoading } = useDebtStore();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [payingCustomer, setPayingCustomer] = useState<CustomerDebt | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerDebt | null>(null);
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);

  useEffect(() => { fetchDebtors(); }, [fetchDebtors]);

  useEffect(() => {
    if (historyCustomer?.id) {
      const updated = debtors.find(d => d.id === historyCustomer.id);
      if (updated) setHistoryCustomer(updated);
    }
  }, [debtors, historyCustomer?.id]);

  const filteredDebtors = useMemo(() => {
    // 🚨 EL FILTRO MÁGICO: Solo mostramos clientes que NO estén en cero
    let activeDebtors = debtors.filter(d => d.total_debt !== 0);

    if (!debouncedSearchTerm) return activeDebtors.sort((a, b) => b.total_debt - a.total_debt);
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return activeDebtors
      .filter(d => d.name.toLowerCase().includes(lowerSearch))
      .sort((a, b) => b.total_debt - a.total_debt);
  }, [debtors, debouncedSearchTerm]);

  const handleProcessPayment = useCallback(async (customerId: string, amount: number): Promise<boolean> => {
    try {
      await registerPayment(customerId, amount);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pago registrado', showConfirmButton: false, timer: 2000 });
      return true;
    } catch {
      Swal.fire('Error', 'Fallo de transacción en el servidor', 'error');
      return false;
    }
  }, [registerPayment]);

  const handleProcessDebt = useCallback(async (customerId: string, amount: number, concept: string): Promise<boolean> => {
    try {
      await addDebt(customerId, amount, concept);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cargo agregado', showConfirmButton: false, timer: 2000 });
      return true;
    } catch (err: any) {
      console.error("Error atrapado en pantalla:", err);
      // 🚨 Ahora el cartel te va a decir exactamente por qué falla
      Swal.fire('Error de Base de Datos', err.message || 'Mirá la consola para más detalles', 'error');
      return false;
    }
  }, [addDebt]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">CUENTAS CORRIENTES</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Gestión de cobros y saldos activos</p>
        </div>
        
        {/* ✅ BOTÓN GLOBAL PARA NUEVA DEUDA */}
        <button onClick={() => setIsAddDebtModalOpen(true)} className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all active:scale-95 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          + Nuevo Cargo
        </button>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input type="text" placeholder="Buscar entre los deudores..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
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
                <tr><td colSpan={4} className="p-10 text-center font-bold text-slate-400 uppercase text-xs tracking-widest">No hay clientes con deuda activa</td></tr>
              ) : (
                filteredDebtors.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 dark:text-white text-sm uppercase">{d.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{d.phone || 'Sin teléfono'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-lg font-black tabular-nums ${d.total_debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{formatCurrency(d.total_debt)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full uppercase">{formatDate(d.last_payment_date)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPayingCustomer(d)} className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm" title="Registrar Pago"><Wallet className="w-4 h-4" /></button>
                        <button onClick={() => setHistoryCustomer(d)} className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm" title="Ver Historial y Editar"><History className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payingCustomer && <PaymentModal customer={payingCustomer} onClose={() => setPayingCustomer(null)} onConfirm={handleProcessPayment} />}
      {historyCustomer && <HistoryModal customer={historyCustomer} onClose={() => setHistoryCustomer(null)} onDelete={deleteMovement} onEdit={editMovement} />}
      
      {/* ✅ SE MUESTRA EL MODAL GENERAL DE DEUDA */}
      {isAddDebtModalOpen && <AddDebtModal debtors={debtors} onClose={() => setIsAddDebtModalOpen(false)} onConfirm={handleProcessDebt} />}
    </div>
  );
};