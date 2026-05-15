import { useEffect, useMemo, useCallback, memo } from 'react';
import { useSupplierStore } from '../store/useSupplierStore';
import Swal from 'sweetalert2';

// 🚀 Formateador global para consistencia Raíces
const ARS = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

export const SupplierDashboard = memo(() => {
  const { suppliers, debts, isLoading, fetchSupplierData, addSupplier, addDebt, registerPartialPayment } = useSupplierStore();

  useEffect(() => { 
    fetchSupplierData(); 
  }, [fetchSupplierData]);

  // 🧠 CÁLCULOS MEMORIZADOS (Optimización de Rendimiento)
  const totals = useMemo(() => {
    const pending = debts
      .filter(d => d.status === 'PENDIENTE')
      .reduce((acc, d) => {
        const amount = Number.parseFloat(String(d.amount || 0));
        const paid = Number.parseFloat(String(d.paid_amount || 0));
        return acc + (amount - paid);
      }, 0);
      
    const overdue = debts.filter(d => {
      if (d.status !== 'PENDIENTE' || !d.due_date) return false;
      return new Date(d.due_date) < new Date();
    }).length;

    return { pending, overdue };
  }, [debts]);

  const handleNewSupplier = useCallback(async () => {
    const { value: form } = await Swal.fire({
      title: 'REGISTRAR PROVEEDOR',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Razón Social / Nombre</label>
            <input id="s-name" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !font-bold !rounded-xl" placeholder="Ej: Textiles Berisso">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Rubro Principal</label>
            <input id="s-cat" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !font-bold !rounded-xl" placeholder="Ej: Telas, Insumos, Logística">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'GUARDAR REGISTRO',
      confirmButtonColor: '#4f46e5',
      customClass: {
        popup: 'dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800',
        confirmButton: 'rounded-xl font-black text-xs px-6 py-3',
        cancelButton: 'rounded-xl font-bold text-xs px-6 py-3'
      },
      preConfirm: () => {
        const name = (document.getElementById('s-name') as HTMLInputElement).value.trim();
        const category = (document.getElementById('s-cat') as HTMLInputElement).value.trim();
        if (!name) {
          Swal.showValidationMessage('El nombre es obligatorio');
          return false;
        }
        return { name: name.toUpperCase(), category: category.toUpperCase() };
      }
    });

    if (form) {
      try {
        await addSupplier(form);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Proveedor guardado', showConfirmButton: false, timer: 1500 });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        Swal.fire('Error', `No se pudo registrar: ${msg}`, 'error');
      }
    }
  }, [addSupplier]);

  const handleNewDebt = useCallback(async () => {
    if (suppliers.length === 0) {
      return Swal.fire('Atención', 'Primero registrá un proveedor para asignar la deuda.', 'warning');
    }
    
    const options = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    const { value: form } = await Swal.fire({
      title: 'CARGAR FACTURA / DEUDA',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Proveedor</label>
            <select id="d-sup" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !font-bold !rounded-xl">${options}</select>
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Descripción del Gasto</label>
            <input id="d-desc" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !font-bold !rounded-xl" placeholder="Ej: Factura A - Hilos Negros">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Monto Total ($)</label>
              <input id="d-amt" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-rose-500 !font-black !rounded-xl" placeholder="0">
            </div>
            <div>
              <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Vencimiento</label>
              <input id="d-date" type="date" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-900 !border-slate-200 dark:!border-slate-700 !text-slate-900 dark:!text-white !font-bold !rounded-xl">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'CARGAR DEUDA',
      confirmButtonColor: '#e11d48',
      customClass: {
        popup: 'dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800',
        confirmButton: 'rounded-xl font-black text-xs px-6 py-3 shadow-lg shadow-rose-500/20'
      },
      preConfirm: () => {
        const supplier_id = (document.getElementById('d-sup') as HTMLSelectElement).value;
        const description = (document.getElementById('d-desc') as HTMLInputElement).value.trim();
        const amount = Number.parseFloat((document.getElementById('d-amt') as HTMLInputElement).value);
        const due_date = (document.getElementById('d-date') as HTMLInputElement).value;

        if (!amount || amount <= 0 || !description) {
          Swal.showValidationMessage('Completá monto y descripción válidos');
          return false;
        }
        return { supplier_id, description: description.toUpperCase(), amount, due_date };
      }
    });

    if (form) {
      try {
        await addDebt(form);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Deuda registrada', showConfirmButton: false, timer: 1500 });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error de conexión';
        Swal.fire('Error', `No se pudo cargar la factura: ${msg}`, 'error');
      }
    }
  }, [suppliers, addDebt]);

  if (isLoading) return <div className="p-8 h-screen flex items-center justify-center font-black text-slate-500 uppercase animate-pulse tracking-[0.5em] italic">Auditando Cuentas por Pagar...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl gap-6">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">🚚 Cuentas <span className="text-rose-500">por Pagar</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-3 italic">Gestión de Egresos y Compromisos con Proveedores.</p>
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={handleNewSupplier} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95">Nuevo Proveedor</button>
          <button type="button" onClick={handleNewDebt} className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-600/20 active:scale-95 transition-all">+ Cargar Factura</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-10 rounded-[3rem] shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Saldo Real Adeudado</p>
          <p className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{ARS.format(totals.pending)}</p>
        </div>
        
        <div className={`p-10 rounded-[3rem] border shadow-xl flex items-center justify-between transition-all ${totals.overdue > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
          <div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 italic">Facturas Vencidas</p>
            <p className="text-6xl font-black text-rose-600 dark:text-rose-500 tracking-tighter tabular-nums">{totals.overdue}</p>
          </div>
          {totals.overdue > 0 && <span className="text-7xl animate-bounce grayscale-0 opacity-80" aria-hidden="true">⚠️</span>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800">
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Proveedor / Rubro</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Concepto</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Vencimiento</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Saldo Restante</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800/50">
              {debts.filter(d => d.status === 'PENDIENTE').map(debt => {
                const totalAmt = Number.parseFloat(String(debt.amount || 0));
                const paidAmt = Number.parseFloat(String(debt.paid_amount || 0));
                const remaining = totalAmt - paidAmt;
                const isOverdue = debt.due_date ? new Date(debt.due_date) < new Date() : false;

                return (
                  <tr key={debt.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="p-8">
                      <p className="font-black text-slate-900 dark:text-white uppercase text-sm">{debt.suppliers?.name || 'S/N'}</p>
                      <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">{debt.suppliers?.category || 'S/C'}</p>
                    </td>
                    <td className="p-8">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed max-w-[200px]">{debt.description}</p>
                    </td>
                    <td className="p-8 text-center">
                      <span className={`text-[10px] font-black px-4 py-2 rounded-xl border uppercase tracking-widest ${isOverdue ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent'}`}>
                        {debt.due_date ? new Date(debt.due_date).toLocaleDateString('es-AR') : 'S/F'}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Total: {ARS.format(totalAmt)}</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{ARS.format(remaining)}</p>
                    </td>
                    <td className="p-8 text-center">
                      <button 
                        type="button"
                        onClick={async () => {
                          const { value: amount } = await Swal.fire({
                            title: 'REGISTRAR PAGO',
                            text: `Saldar deuda de ${ARS.format(remaining)} con ${debt.suppliers?.name}`,
                            input: 'number',
                            inputAttributes: { min: '1', max: remaining.toString() },
                            showCancelButton: true,
                            confirmButtonText: 'CONFIRMAR PAGO 💸',
                            confirmButtonColor: '#10b981',
                            customClass: { popup: 'dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800' }
                          });
                          if (amount) {
                            await registerPartialPayment(debt.id, Number.parseFloat(amount), `${debt.suppliers?.name} - ${debt.description}`);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                        Pagar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {debts.filter(d => d.status === 'PENDIENTE').length === 0 && (
            <div className="p-32 text-center">
               <span className="text-6xl opacity-10 block mb-4 italic" aria-hidden="true">🚚</span>
               <p className="text-slate-400 font-black uppercase text-xs tracking-[0.5em] italic">No hay compromisos de pago pendientes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SupplierDashboard.displayName = 'SupplierDashboard';