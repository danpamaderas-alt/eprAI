import React, { useEffect, useMemo } from 'react';
import { useSupplierStore } from '../store/useSupplierStore';
import Swal from 'sweetalert2';

export const SupplierDashboard = () => {
  const { suppliers, debts, isLoading, fetchSupplierData, addSupplier, addDebt, registerPartialPayment } = useSupplierStore();

  useEffect(() => { fetchSupplierData(); }, [fetchSupplierData]);

  const totals = useMemo(() => {
    const pending = debts
      .filter(d => d.status === 'PENDIENTE')
      .reduce((acc, d) => acc + (Number(d.amount) - Number(d.paid_amount || 0)), 0);
    const overdue = debts.filter(d => d.status === 'PENDIENTE' && new Date(d.due_date) < new Date()).length;
    return { pending, overdue };
  }, [debts]);

  const handleNewSupplier = async () => {
    const { value: form } = await Swal.fire({
      title: 'REGISTRAR PROVEEDOR',
      html: `<input id="s-name" class="swal2-input" placeholder="Nombre">
             <input id="s-cat" class="swal2-input" placeholder="Rubro (Telas, hilos, etc)">`,
      preConfirm: () => ({ 
        name: (document.getElementById('s-name') as HTMLInputElement).value,
        category: (document.getElementById('s-cat') as HTMLInputElement).value
      })
    });
    if (form?.name) await addSupplier(form);
  };

  const handleNewDebt = async () => {
    if (suppliers.length === 0) return Swal.fire('Atención', 'Primero registrá un proveedor', 'warning');
    const options = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const { value: form } = await Swal.fire({
      title: 'CARGAR DEUDA / FACTURA',
      html: `<select id="d-sup" class="swal2-input">${options}</select>
             <input id="d-desc" class="swal2-input" placeholder="Descripción">
             <input id="d-amt" type="number" class="swal2-input" placeholder="Monto total $">
             <input id="d-date" type="date" class="swal2-input">`,
      preConfirm: () => ({
        supplier_id: (document.getElementById('d-sup') as HTMLSelectElement).value,
        description: (document.getElementById('d-desc') as HTMLInputElement).value,
        amount: Number((document.getElementById('d-amt') as HTMLInputElement).value),
        due_date: (document.getElementById('d-date') as HTMLInputElement).value
      })
    });
    if (form?.amount) await addDebt(form);
  };

  if (isLoading) return <div className="p-8 text-white animate-pulse uppercase font-black">Sincronizando proveedores...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">🚚 Cuentas <span className="text-rose-500">por Pagar</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Gestión de facturas y pagos parciales a proveedores.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleNewSupplier} className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 transition-all">Nuevo Proveedor</button>
          <button onClick={handleNewDebt} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-500/20 hover:bg-rose-500 active:scale-95 transition-all">+ Cargar Factura</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Deuda Pendiente (Saldo Real)</p>
          <p className="text-5xl font-black text-white tracking-tighter">${totals.pending.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Facturas Vencidas</p>
            <p className="text-5xl font-black text-rose-500 tracking-tighter">{totals.overdue}</p>
          </div>
          {totals.overdue > 0 && <span className="text-5xl animate-bounce">⚠️</span>}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Proveedor</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Descripción</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Vencimiento</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Saldo Restante</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {debts.filter(d => d.status === 'PENDIENTE').map(debt => {
              const remaining = Number(debt.amount) - Number(debt.paid_amount || 0);
              return (
                <tr key={debt.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-6 font-black text-white uppercase text-sm">{debt.suppliers?.name}</td>
                  <td className="p-6 text-slate-400 font-bold text-xs uppercase">{debt.description}</td>
                  <td className={`p-6 text-xs font-black ${new Date(debt.due_date) < new Date() ? 'text-rose-500' : 'text-slate-400'}`}>
                    {new Date(debt.due_date).toLocaleDateString('es-AR')}
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-[9px] font-bold text-slate-600 uppercase">Total: ${Number(debt.amount).toLocaleString()}</p>
                    <p className="text-xl font-black text-white tracking-tighter">${remaining.toLocaleString()}</p>
                  </td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={async () => {
                        const { value: amount } = await Swal.fire({
                          title: 'REGISTRAR PAGO',
                          text: `Restan $${remaining.toLocaleString()} con ${debt.suppliers?.name}`,
                          input: 'number',
                          inputAttributes: { min: '1', max: remaining.toString() },
                          showCancelButton: true,
                          confirmButtonText: 'CONFIRMAR PAGO',
                          confirmButtonColor: '#10b981',
                          customClass: { popup: '!bg-slate-900 !text-white !rounded-[2rem] border border-slate-800' }
                        });
                        if (amount) await registerPartialPayment(debt.id, Number(amount), `${debt.suppliers?.name} - ${debt.description}`);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
                    >
                      Entregar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {debts.filter(d => d.status === 'PENDIENTE').length === 0 && (
          <div className="p-20 text-center text-slate-600 font-black uppercase text-xs tracking-widest">No hay deudas pendientes 🥳</div>
        )}
      </div>
    </div>
  );
};