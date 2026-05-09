import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTreasuryStore, type Transaction } from '../treasury/store/useTreasuryStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import Swal from 'sweetalert2';

// 🚀 Formateador global para consistencia visual Raíces
const ARS = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

export const TreasuryDashboard = memo(() => {
  const { transactions, fetchTransactions, addTransaction, updateTransaction, deleteTransaction, isLoading } = useTreasuryStore();
  const { customers, fetchCustomers } = useCrmStore();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('GASTOS_GENERALES');
  const [businessUnit, setBusinessUnit] = useState<string>('GENERAL');
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');

  useEffect(() => {
    fetchTransactions();
    fetchCustomers();
  }, [fetchTransactions, fetchCustomers]);

  // 🧠 CÁLCULO DE SALDOS OPTIMIZADO
  const balances = useMemo(() => {
    let mp = 0; let banco = 0; let efectivo = 0; let total = 0;

    transactions.forEach(tx => {
      if (tx.status === 'COMPLETED' || !tx.status) {
        const val = tx.type === 'INCOME' ? Number(tx.amount) : -Number(tx.amount);
        total += val;
        
        // Normalizamos acceso a campos snake_case o camelCase de la DB
        const method = (tx.payment_method || tx.paymentMethod || 'EFECTIVO').toUpperCase();
        
        if (method === 'MERCADO_PAGO') mp += val;
        else if (method === 'BANCO') banco += val;
        else efectivo += val;
      }
    });

    return { mp, banco, efectivo, total };
  }, [transactions]);

  // DINERO EN CALLE BASADO EN CRM REAL
  const dineroEnCalle = useMemo(() => {
    return customers.reduce((acc, client) => acc + (Number(client.balance) || 0), 0);
  }, [customers]);

  const handleOpenEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setDescription(tx.description || '');
    setType(tx.type as 'INCOME' | 'EXPENSE');
    setCategory(tx.category || '');
    setBusinessUnit(tx.business_unit || tx.businessUnit || 'GENERAL');
    setPaymentMethod(tx.payment_method || tx.paymentMethod || 'EFECTIVO');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const resetForm = useCallback(() => {
    setEditingTx(null); setAmount(''); setDescription(''); setType('EXPENSE'); 
    setCategory('GASTOS_GENERALES'); setBusinessUnit('GENERAL'); setPaymentMethod('EFECTIVO');
    setIsFormOpen(false);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      const payload = {
        amount: Number(amount),
        description: description.toUpperCase(),
        type: type,
        category: category,
        business_unit: businessUnit,
        payment_method: paymentMethod,
        date: editingTx ? editingTx.date : new Date().toISOString(),
        status: 'COMPLETED'
      };

      if (editingTx) {
        // 🚀 MEJORA: Update directo en vez de delete/add para evitar pérdida de datos
        if (updateTransaction) {
          await updateTransaction(editingTx.id, payload);
        } else {
          // Fallback si el store no tiene update aún, pero advirtiendo
          await deleteTransaction(editingTx.id);
          await addTransaction(payload);
        }
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Movimiento Actualizado', showConfirmButton: false, timer: 2000 });
      } else {
        await addTransaction(payload);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Registro Exitoso', showConfirmButton: false, timer: 2000 });
      }
      resetForm();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error de conexión';
      Swal.fire({ icon: 'error', title: 'Error de Caja', text: msg });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-2">
      <header className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
            Tesorería <span className="text-blue-600">Real</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-3 italic">Control de flujo de fondos y disponibilidades por cuenta.</p>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)} 
            className="bg-slate-900 dark:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
          >
            + REGISTRAR MOVIMIENTO
          </button>
        )}
      </header>

      {/* RADIOGRAFÍA DE DISPONIBILIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Caja Consolidada</p>
          <p className={`text-2xl font-black mt-2 tabular-nums tracking-tighter ${balances.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {ARS.format(balances.total)}
          </p>
        </div>

        <div className="bg-[#009EE3]/5 dark:bg-[#009EE3]/10 p-6 rounded-[2rem] border border-[#009EE3]/20 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase text-[#009EE3] tracking-widest">Mercado Pago</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">{ARS.format(balances.mp)}</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Bancos</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">{ARS.format(balances.banco)}</p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/50 flex flex-col justify-between">
          <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Efectivo</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">{ARS.format(balances.efectivo)}</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-200 dark:border-amber-800/50 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Dinero en Calle</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-500 mt-2 tabular-nums tracking-tighter">{ARS.format(dineroEnCalle)}</p>
          <div className="absolute -right-2 -bottom-2 text-4xl opacity-5 group-hover:scale-110 transition-transform italic">CRM</div>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter">
              {editingTx ? '✏️ Ajustar Registro' : '💸 Nuevo Movimiento de Caja'}
            </h2>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-rose-500">✕</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select value={type} onChange={(e) => setType(e.target.value as any)} className={`p-4 rounded-2xl font-black text-xs outline-none border-2 transition-colors ${type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
              <option value="INCOME">⬆️ INGRESO (+)</option>
              <option value="EXPENSE">⬇️ EGRESO (-)</option>
            </select>
            <input type="number" placeholder="Monto $" value={amount} onChange={(e) => setAmount(e.target.value)} className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-black text-lg outline-none focus:border-blue-500 dark:bg-slate-950 dark:text-white" required />
            <input type="text" placeholder="Concepto (Ej: Pago Hilos, Seña Pedido)" value={description} onChange={(e) => setDescription(e.target.value)} className="md:col-span-2 p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-blue-500 dark:bg-slate-950 dark:text-white" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-xs font-black uppercase outline-none dark:bg-slate-950 dark:text-white">
              <option value="EFECTIVO">💵 EFECTIVO</option>
              <option value="MERCADO_PAGO">🔵 MERCADO PAGO</option>
              <option value="BANCO">🏦 BANCO (TRANSF.)</option>
            </select>
            <select value={businessUnit} onChange={(e) => setBusinessUnit(e.target.value)} className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-xs font-black uppercase outline-none dark:bg-slate-950 dark:text-white">
              <option value="GENERAL">🌐 GENERAL</option>
              <option value="RAICES">🌱 RAÍCES</option>
              <option value="ROJO_SHOWROOM">🔴 ROJO SHOWROOM</option>
              <option value="UNIFORMES">🏛️ UNIFORMES</option>
              <option value="RJ_CO">💼 RJ&Co.</option>
            </select>
            <input type="text" placeholder="Categoría (Ej: Servicios, Insumos)" value={category} onChange={(e) => setCategory(e.target.value.toUpperCase())} className="p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-black text-[10px] uppercase outline-none dark:bg-slate-950 dark:text-white placeholder:text-slate-500" />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t dark:border-slate-800">
            <button type="button" onClick={resetForm} className="px-8 py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
            <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
              {editingTx ? 'ACTUALIZAR DATOS' : 'CONFIRMAR REGISTRO'}
            </button>
          </div>
        </form>
      )}

      {/* TABLA DE MOVIMIENTOS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                <th className="py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">Concepto / Unidad</th>
                <th className="py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cuenta</th>
                <th className="py-5 px-8 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Monto Neto</th>
                <th className="py-5 px-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {transactions.map(tx => {
                const bUnit = tx.business_unit || tx.businessUnit || 'GENERAL';
                const pMethod = tx.payment_method || tx.paymentMethod || 'EFECTIVO';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-8 text-xs font-bold text-slate-500">
                      {new Date(tx.date).toLocaleDateString('es-AR')}
                    </td>
                    <td className="py-4 px-8">
                      <p className="font-black text-xs text-slate-900 dark:text-white uppercase leading-tight">{tx.description || 'Sin descripción'}</p>
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-tighter mt-1">{bUnit} • {tx.category || 'VARIOS'}</p>
                    </td>
                    <td className="py-4 px-8">
                      <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-lg uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                        {pMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`py-4 px-8 text-right font-black tabular-nums text-sm ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{ARS.format(tx.amount)}
                    </td>
                    <td className="py-4 px-8 text-right">
                      <div className="flex justify-end gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(tx)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors" title="Editar">✏️</button>
                        <button onClick={() => {
                          Swal.fire({ title: '¿Eliminar movimiento?', text: 'Esto alterará los saldos de caja.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#f43f5e' })
                          .then(res => { if(res.isConfirmed) deleteTransaction(tx.id); });
                        }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Borrar">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 && !isLoading && (
            <div className="py-24 text-center">
              <span className="text-5xl opacity-10 italic font-black">💵</span>
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.5em] mt-4">Historial Vacío</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TreasuryDashboard.displayName = 'TreasuryDashboard';