import { useEffect, useState } from 'react';
import { useDebtStore, type Debt } from '../store/useDebtStore';
import Swal from 'sweetalert2';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const DebtDashboard = () => {
  const { debts, fetchDebts, addPayment, isLoading } = useDebtStore();
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  
  // Estados para el pago
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('EFECTIVO');
  const [businessUnit, setBusinessUnit] = useState('GENERAL');

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !payAmount) return;

    try {
      await addPayment(
        selectedDebt.id, 
        Number(payAmount), 
        payMethod, 
        businessUnit, 
        selectedDebt.customers?.name || 'Cliente'
      );
      
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pago registrado y enviado a Tesorería', showConfirmButton: false, timer: 2500 });
      setSelectedDebt(null);
      setPayAmount('');
    } catch (error) {
      Swal.fire('Error', 'No se pudo procesar el pago', 'error');
    }
  };

  const pendingDebts = debts.filter(d => d.status !== 'PAID');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Cuentas Corrientes</h1>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Gestión de saldos y cobros parciales.</p>
      </div>

      {selectedDebt && (
        <form onSubmit={handleCharge} className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-600/20 text-white animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-lg">Cobrar a: {selectedDebt.customers?.name}</h2>
            <button type="button" onClick={() => setSelectedDebt(null)} className="text-blue-200 hover:text-white font-bold">✕ Cerrar</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-1">Monto a Cobrar</label>
              <input type="number" max={selectedDebt.remaining_balance} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Máx: ${selectedDebt.remaining_balance}`} className="w-full p-3 rounded-xl bg-blue-700/50 border border-blue-500 text-white placeholder:text-blue-300 font-bold outline-none focus:bg-blue-700" required />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-1">Método</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full p-3 rounded-xl bg-blue-700/50 border border-blue-500 text-white font-bold outline-none">
                <option value="EFECTIVO">Efectivo</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="BANCO">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-1">Ingresa a Caja de:</label>
              <select value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className="w-full p-3 rounded-xl bg-blue-700/50 border border-blue-500 text-white font-bold outline-none">
                <option value="RAICES">Raíces</option>
                <option value="ROJO_SHOWROOM">Rojo Showroom</option>
                <option value="UNIFORMES">Uniformes</option>
                <option value="RJ_CO">RJ&Co.</option>
                <option value="BITA_IT">Bita IT</option>
                <option value="GENERAL">General</option>
              </select>
            </div>

            <button type="submit" className="w-full p-3 bg-white text-blue-600 font-black rounded-xl hover:bg-slate-100 transition-all shadow-lg">
              CONFIRMAR PAGO
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {isLoading ? (
           <p className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">Buscando deudores...</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deuda Total</th>
                <th className="py-4 px-6 text-[10px] font-black text-rose-500 uppercase tracking-widest">Saldo Pendiente</th>
                <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingDebts.map(debt => (
                <tr key={debt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-black text-sm text-slate-800 uppercase">{debt.customers?.name || '---'}</td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-xs text-slate-600">{debt.description}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{new Date(debt.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-400">{ARS.format(debt.total_amount)}</td>
                  <td className="py-4 px-6 font-black text-rose-600 text-base">{ARS.format(debt.remaining_balance)}</td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => setSelectedDebt(debt)} className="px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-lg uppercase tracking-widest hover:bg-blue-600 transition-colors">
                      Cobrar
                    </button>
                  </td>
                </tr>
              ))}
              {pendingDebts.length === 0 && (
                <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Nadie te debe plata en este momento 👏</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};