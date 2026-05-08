import { useState, useEffect, useMemo } from 'react';
import { useTreasuryStore, type Transaction } from '../treasury/store/useTreasuryStore';
import { useCrmStore } from '../../crm/store/useCrmStore'; // <-- MAGIA: Traemos la agenda real
import Swal from 'sweetalert2';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const TreasuryDashboard = () => {
  const { transactions, fetchTransactions, addTransaction, deleteTransaction, isLoading } = useTreasuryStore();
  // Traemos los clientes para calcular el dinero en calle real
  const { customers, fetchCustomers } = useCrmStore();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('GASTOS_GENERALES');
  const [businessUnit, setBusinessUnit] = useState<'GENERAL' | 'ROJO_SHOWROOM' | 'RAICES' | 'UNIFORMES' | 'RJ_CO' | 'BITA_IT'>('GENERAL');
  const [paymentMethod, setPaymentMethod] = useState<'MERCADO_PAGO' | 'BANCO' | 'EFECTIVO'>('EFECTIVO');

  useEffect(() => {
    fetchTransactions();
    fetchCustomers(); // Actualizamos los clientes de fondo
  }, [fetchTransactions, fetchCustomers]);

  const balances = useMemo(() => {
    let mp = 0; let banco = 0; let efectivo = 0; let total = 0;

    transactions.forEach(tx => {
      if (tx.status === 'COMPLETED' || !tx.status) {
        const value = tx.type === 'INCOME' ? tx.amount : -tx.amount;
        total += value;
        
        const method = (tx.paymentMethod || (tx as any).payment_method || 'EFECTIVO').toUpperCase();
        
        if (method === 'MERCADO_PAGO') mp += value;
        else if (method === 'BANCO') banco += value;
        else efectivo += value;
      }
    });

    return { mp, banco, efectivo, total };
  }, [transactions]);

  // CÁLCULO EXACTO DEL DINERO EN CALLE BASADO EN LA AGENDA
  const dineroEnCalle = useMemo(() => {
    return customers.reduce((acc, client) => acc + (Number(client.balance) || 0), 0);
  }, [customers]);

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setDescription(tx.description || '');
    setType(tx.type as 'INCOME' | 'EXPENSE');
    setCategory(tx.category || '');
    setBusinessUnit((tx.businessUnit || (tx as any).business_unit || 'GENERAL') as any);
    setPaymentMethod((tx.paymentMethod || (tx as any).payment_method || 'EFECTIVO') as any);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingTx(null); setAmount(''); setDescription(''); setType('EXPENSE'); 
    setCategory('GASTOS_GENERALES'); setBusinessUnit('GENERAL'); setPaymentMethod('EFECTIVO');
    setIsFormOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      const payload = {
        amount: Number(amount),
        description: description,
        type: type,
        category: category,
        business_unit: businessUnit,
        payment_method: paymentMethod,
        date: editingTx ? editingTx.date : new Date().toISOString(),
        status: 'COMPLETED'
      };

      if (editingTx) {
        await deleteTransaction(editingTx.id);
        await addTransaction(payload);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Movimiento Editado', showConfirmButton: false, timer: 2000 });
      } else {
        await addTransaction(payload);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Movimiento Registrado', showConfirmButton: false, timer: 2000 });
      }
      resetForm();
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Error de Supabase', text: error.message || 'Revisa la consola para más detalles.' });
      console.error("Error completo al guardar:", error);
    }
  };

  const handleDelete = (id: string) => {
    Swal.fire({ title: '¿Eliminar movimiento?', text: 'Esto recalculará tu caja.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' })
    .then(async (res) => {
      if (res.isConfirmed) {
        await deleteTransaction(id);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 2000 });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white italic">Tesorería General</h1>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Flujo de fondos y cuentas</p>
        </div>
        {!isFormOpen && (
          <button onClick={() => setIsFormOpen(true)} className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all">
            + REGISTRAR MOVIMIENTO
          </button>
        )}
      </div>

      {/* GRILLA DE 5 TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        
        {/* TOTAL EN CAJA */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Caja Total</p>
          <p className={`text-3xl lg:text-2xl xl:text-3xl font-black mt-2 tabular-nums tracking-tighter ${balances.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{ARS.format(balances.total)}</p>
        </div>

        {/* MERCADO PAGO */}
        <div className="bg-[#009EE3]/10 p-6 rounded-3xl border border-[#009EE3]/20 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-[#009EE3] tracking-widest">Mercado Pago</p>
          <p className="text-2xl lg:text-xl xl:text-2xl font-black text-slate-900 mt-2 tabular-nums">{ARS.format(balances.mp)}</p>
        </div>

        {/* BANCO */}
        <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Banco</p>
          <p className="text-2xl lg:text-xl xl:text-2xl font-black text-slate-900 mt-2 tabular-nums">{ARS.format(balances.banco)}</p>
        </div>

        {/* EFECTIVO */}
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Efectivo</p>
          <p className="text-2xl lg:text-xl xl:text-2xl font-black text-slate-900 mt-2 tabular-nums">{ARS.format(balances.efectivo)}</p>
        </div>

        {/* DINERO EN CALLE (CALCULADO DIRECTO DE LA AGENDA) */}
        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 flex flex-col justify-between shadow-sm">
          <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Dinero en Calle</p>
          <p className="text-3xl lg:text-2xl xl:text-3xl font-black text-amber-700 mt-2 tabular-nums tracking-tighter">{ARS.format(dineroEnCalle)}</p>
        </div>

      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 space-y-4">
          <h2 className="text-xl font-black italic text-slate-900">{editingTx ? '✏️ Editar Movimiento' : '💸 Nuevo Movimiento'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select value={type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as 'INCOME' | 'EXPENSE')} className={`p-3 rounded-xl font-black text-xs outline-none border ${type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
              <option value="INCOME">INGRESO (+)</option>
              <option value="EXPENSE">EGRESO (-)</option>
            </select>
            <input type="number" placeholder="Monto $" value={amount} onChange={(e) => setAmount(e.target.value)} className="p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 text-slate-900 bg-white placeholder:text-slate-400" required />
            <input type="text" placeholder="Descripción (Ej: Pago Luz)" value={description} onChange={(e) => setDescription(e.target.value)} className="md:col-span-2 p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 text-slate-900 bg-white placeholder:text-slate-400" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={paymentMethod} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as "MERCADO_PAGO" | "BANCO" | "EFECTIVO")} className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none text-slate-900 bg-white">
              <option value="EFECTIVO">EFECTIVO</option>
              <option value="MERCADO_PAGO">MERCADO PAGO</option>
              <option value="BANCO">BANCO (TRANSFERENCIA)</option>
            </select>
            <select value={businessUnit} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBusinessUnit(e.target.value as 'GENERAL' | 'ROJO_SHOWROOM' | 'RAICES' | 'UNIFORMES' | 'RJ_CO' | 'BITA_IT')} className="p-3 rounded-xl border border-slate-200 text-xs font-bold outline-none text-slate-900 bg-white">
              <option value="GENERAL">GENERAL</option>
              <option value="ROJO_SHOWROOM">ROJO SHOWROOM</option>
              <option value="RAICES">RAÍCES</option>
              <option value="UNIFORMES">UNIFORMES</option>
              <option value="RJ_CO">RJ&Co.</option>
              <option value="BITA_IT">BITA IT</option>
            </select>
            <input type="text" placeholder="Categoría (Ej: Proveedores)" value={category} onChange={(e) => setCategory(e.target.value)} className="p-3 rounded-xl border border-slate-200 font-bold text-xs outline-none text-slate-900 bg-white placeholder:text-slate-400" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetForm} className="px-6 py-2 text-xs font-black uppercase text-slate-400">Cancelar</button>
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-500/30">Guardar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading && <p className="p-4 text-center text-slate-400 font-bold">Cargando movimientos...</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción / Unidad</th>
                <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cuenta</th>
                <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-6 text-xs font-bold text-slate-500">{new Date(tx.date).toLocaleDateString('es-AR')}</td>
                  <td className="py-3 px-6">
                    <p className="font-black text-xs text-slate-800">{tx.description || 'Sin descripción'}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{(tx.businessUnit || (tx as any).business_unit || 'GENERAL')} • {(tx.category || 'VARIOS')}</p>
                  </td>
                  <td className="py-3 px-6">
                    <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-widest">
                      {(tx.paymentMethod || (tx as any).payment_method || 'EFECTIVO').replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`py-3 px-6 text-right font-black tabular-nums ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{ARS.format(tx.amount)}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(tx)} className="text-slate-400 hover:text-blue-500">✏️</button>
                      <button onClick={() => handleDelete(tx.id)} className="text-slate-400 hover:text-rose-500">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Aún no hay movimientos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};