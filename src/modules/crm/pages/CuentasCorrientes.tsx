import { useState, useMemo, useEffect } from 'react';
import { useCrmStore } from '../store/useCrmStore';
import { useDebtStore } from '../store/useDebtStore';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';
import Swal from 'sweetalert2';

export const CuentasCorrientes = () => {
  const { customers, fetchCustomers } = useCrmStore();
  const { movements, fetchMovements, addMovement, isLoading } = useDebtStore();
  const { addTransaction } = useTreasuryStore(); // ¡Para mandar la plata a la caja!

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchMovements();
  }, [fetchCustomers, fetchMovements]);

  // 🧠 CALCULAR DEUDA POR CLIENTE
  const customerBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    
    // Sumar cargos y restar pagos
    movements.forEach(m => {
      if (!balances[m.customer_id]) balances[m.customer_id] = 0;
      balances[m.customer_id] += m.amount; 
    });

    // Crear array final combinando datos del CRM
    return customers.map((c: any) => ({
      ...c,
      balance: balances[c.id] || 0
    })).filter(c => c.balance > 0 || c.name.toLowerCase().includes(searchTerm.toLowerCase())); // Mostrar solo los que deben, o si los buscamos
  }, [customers, movements, searchTerm]);

  // Total en la calle (Plata que te deben en total)
  const totalInStreet = customerBalances.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);

  // 💸 REGISTRAR UN PAGO (Abono)
  const handleRegisterPayment = async (customer: any) => {
    const { value: formValues } = await Swal.fire({
      title: `Cobrar a ${customer.name}`,
      html: `
        <div class="text-left mt-2">
          <p class="text-sm text-slate-500 mb-4">Deuda actual: <strong class="text-rose-500">$${customer.balance.toLocaleString('es-AR')}</strong></p>
          
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Monto que entrega ($)</label>
          <input id="swal-amount" type="number" min="1" class="swal2-input w-full !mx-0 font-black text-2xl text-emerald-600" placeholder="0">
          
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1 mt-4 block">¿A dónde ingresa la plata?</label>
          <select id="swal-account" class="swal2-input w-full !mx-0 text-sm font-bold">
            <option value="EFECTIVO">💵 Caja Efectivo</option>
            <option value="MERCADO_PAGO">📱 Mercado Pago</option>
            <option value="BANCO">🏦 Banco Nación</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Registrar Pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' },
      preConfirm: () => {
        const amount = (document.getElementById('swal-amount') as HTMLInputElement).value;
        const account = (document.getElementById('swal-account') as HTMLSelectElement).value;
        
        if (!amount || Number(amount) <= 0) {
          Swal.showValidationMessage('Ingresá un monto válido');
          return false;
        }
        return { amount: Number(amount), account };
      }
    });

    if (formValues) {
      try {
        const timestamp = new Date().toISOString();

        // 1. Bajar la deuda del cliente (Monto negativo porque es un pago)
        await addMovement({
          customer_id: customer.id,
          date: timestamp,
          amount: -formValues.amount,
          concept: `Abono en ${formValues.account.replace('_', ' ')}`,
          type: 'PAYMENT'
        });

        // 2. 🔥 Mandar la plata a la Tesorería
        await addTransaction({
          date: timestamp,
          description: `Cobro Cta. Cte: ${customer.name}`,
          category: 'COBRO_CUENTA_CORRIENTE',
          type: 'INCOME',
          businessUnit: 'GENERAL', // O la que prefieras por defecto
          paymentMethod: formValues.account as any,
          amount: formValues.amount,
          status: 'COMPLETED'
        });

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pago registrado exitosamente', showConfirmButton: false, timer: 2000 });
      } catch (error) {
        Swal.fire('Error', 'Hubo un problema al registrar el pago.', 'error');
      }
    }
  };

  // 📝 FIAR (Agregar deuda manualmente - Ej: Se llevó algo sin pasar por Punto de Venta)
  const handleAddDebt = async (customer: any) => {
    const { value: formValues } = await Swal.fire({
      title: `Agregar Deuda a ${customer.name}`,
      html: `
        <div class="text-left mt-2">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Monto a deber ($)</label>
          <input id="swal-debt-amount" type="number" min="1" class="swal2-input w-full !mx-0 font-black text-2xl text-rose-600" placeholder="0">
          
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1 mt-4 block">Concepto / Detalle</label>
          <input id="swal-debt-concept" type="text" class="swal2-input w-full !mx-0 text-sm font-bold" placeholder="Ej: Remeras fiadas">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sumar Deuda',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#f43f5e',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' },
      preConfirm: () => {
        const amount = (document.getElementById('swal-debt-amount') as HTMLInputElement).value;
        const concept = (document.getElementById('swal-debt-concept') as HTMLInputElement).value;
        
        if (!amount || Number(amount) <= 0 || !concept) {
          Swal.showValidationMessage('Ingresá un monto y un concepto');
          return false;
        }
        return { amount: Number(amount), concept };
      }
    });

    if (formValues) {
      try {
        await addMovement({
          customer_id: customer.id,
          date: new Date().toISOString(),
          amount: formValues.amount, // Positivo porque aumenta la deuda
          concept: formValues.concept,
          type: 'CHARGE'
        });
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Deuda sumada', showConfirmButton: false, timer: 2000 });
      } catch (error) {
        Swal.fire('Error', 'Hubo un problema al registrar la deuda.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Cuentas Corrientes</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Gestión de Cobranzas y Fiados</p>
        </div>
        
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 px-6 py-3 rounded-2xl flex flex-col items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Total en la calle</span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400">${totalInStreet.toLocaleString('es-AR')}</span>
        </div>
      </header>

      {/* BUSCADOR */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">🔍</div>
          <input 
            type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* TABLA DE DEUDORES */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Calculando Saldos...</div>
        ) : customerBalances.filter(c => c.balance > 0).length === 0 && !searchTerm ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 m-8 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-4xl block mb-2 opacity-50">🙌</span>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Nadie te debe plata actualmente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="py-5 px-6">Cliente</th>
                  <th className="py-5 px-6">Contacto</th>
                  <th className="py-5 px-6 text-right">Saldo Deudor</th>
                  <th className="py-5 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {customerBalances.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    <td className="py-4 px-6 align-middle">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 dark:text-white text-sm uppercase leading-tight">{c.name}</span>
                        {c.notes && <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{c.notes}</span>}
                      </div>
                    </td>

                    <td className="py-4 px-6 align-middle">
                      <span className="text-xs font-bold text-slate-500">{c.phone || 'S/T'}</span>
                    </td>

                    <td className="py-4 px-6 align-middle text-right">
                      {c.balance > 0 ? (
                        <span className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                          ${c.balance.toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-slate-400">Al día</span>
                      )}
                    </td>
                    
                    <td className="py-4 px-6 text-center align-middle">
                      <div className="flex items-center justify-center gap-2">
                        {c.balance > 0 && (
                          <button onClick={() => handleRegisterPayment(c)} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-500 hover:text-white text-emerald-700 text-[10px] font-black rounded-xl transition-all uppercase shadow-sm">
                            💵 Cobrar
                          </button>
                        )}
                        <button onClick={() => handleAddDebt(c)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 text-[10px] font-black rounded-xl transition-all uppercase shadow-sm" title="Sumar Fiado manual">
                          📝 Fiar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};