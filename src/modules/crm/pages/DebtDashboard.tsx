import { useEffect, useState, useMemo } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const DebtDashboard = () => {
  // 1. Usamos el Cerebro Central unificado
  const { customers, fetchAllCatalogs, registerPayment, isLoading } = useCatalogStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
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

  // 2. FUNCIÓN PARA REGISTRAR DEUDA (DEBIT)
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || !newAmount) return;

    try {
      // Usamos una función genérica que crearemos en el store o registramos el "pago negativo"
      // Para simplificar, registramos un movimiento de DEUDA
      await registerPayment(newCustomerId, -Number(newAmount), newDesc || 'Saldo pendiente');
      
      Swal.fire({ 
        toast: true, position: 'top-end', icon: 'success', 
        title: 'Deuda cargada a la cuenta', showConfirmButton: false, timer: 2000 
      });
      setIsFormOpen(false);
      setNewCustomerId(''); setNewAmount(''); setNewDesc('');
    } catch (error) {
      Swal.fire('Error', 'No se pudo registrar la deuda', 'error');
    }
  };

  // 3. FUNCIÓN PARA REGISTRAR PAGO (CREDIT)
  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !payAmount) return;

    try {
      await registerPayment(
        selectedCustomer.id, 
        Number(payAmount), 
        `Cobro: ${payMethod} - ${businessUnit}`
      );
      
      Swal.fire({ 
        toast: true, position: 'top-end', icon: 'success', 
        title: 'Cobro acreditado', showConfirmButton: false, timer: 2500 
      });
      setSelectedCustomer(null);
      setPayAmount('');
    } catch (error) {
      Swal.fire('Error', 'No se pudo procesar el pago', 'error');
    }
  };

  // Filtramos clientes que deben o que coinciden con la búsqueda
  const debtors = useMemo(() => {
    return customers.filter(c => 
      (c.balance !== 0) && 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

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
            className="px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all"
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
            <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-rose-500 font-bold">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Cliente</label>
              <select value={newCustomerId} onChange={e => setNewCustomerId(e.target.value)} className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:text-white font-bold outline-none" required>
                <option value="">-- Seleccionar --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Monto a Debitar ($)</label>
              <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Ej: 50000" className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:text-white font-bold" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Concepto</label>
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ej: Saldo mercadería" className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:text-white font-bold" required />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
             <button type="submit" className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg">CARGAR DEUDA</button>
          </div>
        </form>
      )}

      {/* FORMULARIO: COBRAR (Baja saldo) */}
      {selectedCustomer && (
        <form onSubmit={handleCharge} className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-600/20 text-white animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-lg uppercase italic">Cobrar a: {selectedCustomer.name}</h2>
            <button type="button" onClick={() => setSelectedCustomer(null)} className="text-emerald-200 hover:text-white font-bold">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-emerald-100 uppercase mb-1 block">Monto que entrega</label>
              <input type="number" max={selectedCustomer.balance} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Deuda: ${selectedCustomer.balance}`} className="w-full p-3 rounded-xl bg-emerald-700 border-none text-white font-bold outline-none" required />
            </div>
            <div>
              <label className="text-[10px] font-black text-emerald-100 uppercase mb-1 block">Método</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full p-3 rounded-xl bg-emerald-700 border-none text-white font-bold">
                <option value="EFECTIVO">Efectivo</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="BANCO">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-emerald-100 uppercase mb-1 block">Caja Destino</label>
              <select value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className="w-full p-3 rounded-xl bg-emerald-700 border-none text-white font-bold">
                <option value="RAICES">Raíces</option>
                <option value="ROJO_SHOWROOM">Rojo Showroom</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
            <button type="submit" className="w-full p-3 bg-white text-emerald-600 font-black rounded-xl shadow-lg hover:bg-slate-100 transition-all">
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
          className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* TABLA DE SALDOS */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
        {isLoading ? (
            <p className="p-8 text-center text-slate-400 font-black uppercase">Actualizando saldos...</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase">Cliente</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase">Estado</th>
                <th className="py-4 px-6 text-[10px] font-black text-rose-500 uppercase">Deuda Acumulada</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {debtors.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-black text-slate-800 dark:text-white uppercase">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{c.company || 'Particular'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black ${c.balance > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {c.balance > 0 ? 'DEUDOR' : 'A FAVOR'}
                    </span>
                  </td>
                  <td className={`py-4 px-6 font-black text-lg ${c.balance > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                    {ARS.format(Math.abs(c.balance))}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => { setSelectedCustomer(c); setIsFormOpen(false); }} 
                      className="px-5 py-2 bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:scale-105 transition-all shadow-md"
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
        )}
      </div>
    </div>
  );
};