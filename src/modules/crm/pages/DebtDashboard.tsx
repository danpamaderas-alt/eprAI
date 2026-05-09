import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

interface Customer {
  id: string;
  name: string;
  company?: string;
  balance: number;
}

export const DebtDashboard = memo(() => {
  // 1. Usamos el Cerebro Central unificado
  const { customers, fetchAllCatalogs, registerPayment, isLoading } = useCatalogStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Estados para NUEVA DEUDA (Aumenta el saldo del cliente)
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Estados para COBRAR (Baja el saldo del cliente)
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('EFECTIVO');
  const [businessUnit, setBusinessUnit] = useState('GENERAL');

  // Al abrir la pantalla, refrescamos todo el catálogo
  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  // 🚀 OPTIMIZACIÓN: Función memorizada y validación estricta
  const handleCreateDebt = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(newAmount);

    if (!newCustomerId || isNaN(amountNum) || amountNum <= 0) {
      Swal.fire('Atención', 'Monto inválido o cliente sin seleccionar.', 'warning');
      return;
    }

    try {
      // Registramos un movimiento de DEUDA (pago negativo)
      await registerPayment(newCustomerId, -amountNum, newDesc.trim() || 'Saldo pendiente');
      
      Swal.fire({ 
        toast: true, position: 'top-end', icon: 'success', 
        title: 'Deuda cargada a la cuenta', showConfirmButton: false, timer: 2000 
      });
      setIsFormOpen(false);
      setNewCustomerId(''); 
      setNewAmount(''); 
      setNewDesc('');
    } catch {
      Swal.fire('Error', 'No se pudo registrar la deuda', 'error');
    }
  }, [newAmount, newCustomerId, newDesc, registerPayment]);

  // 🚀 OPTIMIZACIÓN: Función memorizada y validación estricta
  const handleCharge = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(payAmount);

    if (!selectedCustomer || isNaN(amountNum) || amountNum <= 0) {
      Swal.fire('Atención', 'Ingresá un monto válido a cobrar.', 'warning');
      return;
    }

    try {
      await registerPayment(
        selectedCustomer.id, 
        amountNum, 
        `Cobro: ${payMethod} - ${businessUnit}`
      );
      
      Swal.fire({ 
        toast: true, position: 'top-end', icon: 'success', 
        title: 'Cobro acreditado', showConfirmButton: false, timer: 2500 
      });
      setSelectedCustomer(null);
      setPayAmount('');
      setPayMethod('EFECTIVO');
    } catch {
      Swal.fire('Error', 'No se pudo procesar el pago', 'error');
    }
  }, [payAmount, selectedCustomer, payMethod, businessUnit, registerPayment]);

  // Filtramos clientes que deben o que coinciden con la búsqueda
  const debtors = useMemo(() => {
    return customers.filter(c => 
      (c.balance !== 0) && 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)); // 🚀 Extra: Ordenamos por el que más debe
  }, [customers, searchTerm]);

  // Helper para cerrar formularios limpiamente
  const closeChargeForm = useCallback(() => {
    setSelectedCustomer(null);
    setPayAmount('');
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Cuentas Corrientes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-widest">Control de saldos históricos y cobranzas.</p>
        </div>
        
        {!isFormOpen && !selectedCustomer && (
          <button 
            onClick={() => setIsFormOpen(true)} 
            className="px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + REGISTRAR DEUDA
          </button>
        )}
      </div>

      {/* FORMULARIO: CREAR DEUDA (Aumenta saldo) */}
      {isFormOpen && (
        <form onSubmit={handleCreateDebt} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-lg italic text-slate-900 dark:text-white">📝 Registrar Nuevo Cargo en Cuenta</h2>
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-rose-500 font-bold focus:outline-none">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cliente</label>
              <select value={newCustomerId} onChange={e => setNewCustomerId(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" required>
                <option value="" disabled>-- Seleccionar --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Monto a Debitar ($)</label>
              <input type="number" step="0.01" min="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Ej: 50000" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Concepto</label>
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ej: Saldo mercadería" className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" required />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button type="submit" className="px-8 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-black dark:hover:bg-slate-600 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all">CARGAR DEUDA</button>
          </div>
        </form>
      )}

      {/* FORMULARIO: COBRAR (Baja saldo) */}
      {selectedCustomer && (
        <form onSubmit={handleCharge} className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-600/20 text-white animate-in slide-in-from-top-4 border border-emerald-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-lg uppercase italic">Cobrar a: {selectedCustomer.name}</h2>
            <button type="button" onClick={closeChargeForm} className="text-emerald-200 hover:text-white font-bold focus:outline-none">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-emerald-100 uppercase mb-1 block">Monto que entrega</label>
              <input type="number" step="0.01" min="0.01" max={Math.abs(selectedCustomer.balance)} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Deuda: ${Math.abs(selectedCustomer.balance)}`} className="w-full p-3 rounded-xl bg-emerald-700/50 border border-emerald-500 text-white font-black outline-none focus:ring-2 focus:ring-white transition-all placeholder:text-emerald-300/50" required autoFocus />
            </div>
            <div>
              <label className="text-[10px] font-black text-emerald-100 uppercase mb-1 block">Método</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full p-3 rounded-xl bg-emerald-700/50 border border-emerald-500 text-white font-bold outline-none focus:ring-2 focus:ring-white transition-all">
                <option value="EFECTIVO">Efectivo</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="BANCO">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-emerald-100 uppercase mb-1 block">Caja Destino</label>
              <select value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className="w-full p-3 rounded-xl bg-emerald-700/50 border border-emerald-500 text-white font-bold outline-none focus:ring-2 focus:ring-white transition-all">
                <option value="RAICES">Raíces</option>
                <option value="ROJO_SHOWROOM">Rojo Showroom</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <button type="submit" className="w-full p-3 bg-white text-emerald-600 font-black rounded-xl shadow-lg hover:bg-slate-50 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300">
              CONFIRMAR COBRO
            </button>
          </div>
        </form>
      )}

      {/* BUSCADOR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <input 
          type="text" 
          placeholder="Buscar cliente deudor..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-transparent font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
        />
      </div>

      {/* TABLA DE SALDOS */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
        {isLoading ? (
            <p className="p-8 text-center text-slate-400 font-black uppercase animate-pulse tracking-widest">Actualizando saldos...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="py-4 px-6 text-[10px] font-black text-rose-500 uppercase tracking-widest">Deuda Acumulada</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {debtors.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                    <td className="py-4 px-6">
                      <p className="font-black text-slate-800 dark:text-white uppercase truncate max-w-[200px] md:max-w-xs">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{c.company || 'Particular'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black tracking-widest ${c.balance > 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {c.balance > 0 ? 'DEUDOR' : 'A FAVOR'}
                      </span>
                    </td>
                    <td className={`py-4 px-6 font-black text-lg ${c.balance > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                      {ARS.format(Math.abs(c.balance))}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => { setSelectedCustomer(c); setIsFormOpen(false); }} 
                        className="px-5 py-2 bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 opacity-100 md:opacity-0 group-hover:opacity-100"
                      >
                        COBRAR
                      </button>
                    </td>
                  </tr>
                ))}
                {debtors.length === 0 && (
                  <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No hay saldos pendientes en la calle 👏</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

DebtDashboard.displayName = 'DebtDashboard';