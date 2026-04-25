import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore } from '../../store/useCatalogStore';
import { useTreasuryStore } from '../inventory/treasury/store/useTreasuryStore'; // ✅ IMPORTADO
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';

export const CurrentAccounts = () => {
  const { customers, fetchAllCatalogs } = useCatalogStore();
  const { addTransaction } = useTreasuryStore(); // ✅ FUNCIÓN CONECTADA
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const hasDebt = showAll ? true : Number(c.balance) > 0;
      const matchesSearch = c.name.toLowerCase().includes(filter.toLowerCase()) || 
                            (c.company && c.company.toLowerCase().includes(filter.toLowerCase()));
      return hasDebt && matchesSearch;
    });
  }, [customers, filter, showAll]);

  const totals = useMemo(() => {
    return customers.reduce((acc, c) => acc + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0);
  }, [customers]);

  const handleMovement = async (customer: any) => {
    const { value: formValues } = await Swal.fire({
      title: `Movimiento: ${customer.name}`,
      html: `
        <div class="text-left space-y-4 mt-2">
          <p class="text-sm font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
            Saldo Actual: <span class="text-lg text-slate-900 dark:text-white ml-2">$${Number(customer.balance || 0).toLocaleString('es-AR')}</span>
          </p>
          
          <label class="block text-[10px] font-black uppercase text-slate-400">Tipo de Movimiento</label>
          <select id="swal-type" class="swal2-select !w-full !m-0 !text-sm">
            <option value="CREDIT">🟢 Registrar Cobro (Entra plata a Caja)</option>
            <option value="DEBIT">🔴 Cargar Deuda Manual (Suma deuda al cliente)</option>
          </select>

          <label class="block text-[10px] font-black uppercase text-slate-400 mt-4">Monto ($)</label>
          <input id="swal-amount" type="number" min="1" class="swal2-input !w-full !m-0" placeholder="Ej: 15000">

          <div id="treasury-options">
            <label class="block text-[10px] font-black uppercase text-slate-400 mt-4">¿A qué cuenta ingresó?</label>
            <select id="swal-method" class="swal2-select !w-full !m-0 !text-sm">
              <option value="EFECTIVO">EFECTIVO</option>
              <option value="MERCADO_PAGO">MERCADO PAGO</option>
              <option value="BANCO">BANCO (TRANSFERENCIA)</option>
            </select>
          </div>

          <label class="block text-[10px] font-black uppercase text-slate-400 mt-4">Detalle / Referencia</label>
          <input id="swal-desc" type="text" class="swal2-input !w-full !m-0" placeholder="Ej: Pago de factura">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Movimiento',
      confirmButtonColor: '#2563eb',
      didOpen: () => {
        const typeSelect = document.getElementById('swal-type') as HTMLSelectElement;
        const treasuryDiv = document.getElementById('treasury-options') as HTMLDivElement;
        typeSelect.addEventListener('change', () => {
          treasuryDiv.style.display = typeSelect.value === 'CREDIT' ? 'block' : 'none';
        });
      },
      preConfirm: () => {
        const amt = Number((document.getElementById('swal-amount') as HTMLInputElement).value);
        if (!amt || amt <= 0) {
          Swal.showValidationMessage('Monto inválido');
          return false;
        }
        return {
          type: (document.getElementById('swal-type') as HTMLSelectElement).value,
          amount: amt,
          method: (document.getElementById('swal-method') as HTMLSelectElement).value,
          desc: (document.getElementById('swal-desc') as HTMLInputElement).value || 'Movimiento manual'
        }
      }
    });

    if (formValues) {
      try {
        // 1. Guardar en Supabase (Historial de Deuda)
        const { error: moveError } = await supabase.from('client_movements').insert([{
          customer_id: customer.id,
          type: formValues.type,
          amount: formValues.amount,
          description: formValues.desc
        }]);
        if (moveError) throw moveError;

        // 2. Actualizar saldo del cliente
        const currentBalance = Number(customer.balance || 0);
        const newBalance = formValues.type === 'DEBIT' ? currentBalance + formValues.amount : currentBalance - formValues.amount;
        const { error: custError } = await supabase.from('customers').update({ balance: newBalance }).eq('id', customer.id);
        if (custError) throw custError;

        // 3. ✅ CONEXIÓN A TESORERÍA: Si es un cobro, sumamos a la caja elegida
        if (formValues.type === 'CREDIT') {
          await addTransaction({
            amount: formValues.amount,
            description: `COBRO: ${customer.name} - ${formValues.desc}`,
            type: 'INCOME',
            category: 'COBRO_CLIENTE',
            business_unit: 'RAICES',
            payment_method: formValues.method,
            date: new Date().toISOString(),
            status: 'COMPLETED'
          });
        }

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Sincronizado', showConfirmButton: false, timer: 1500 });
        fetchAllCatalogs();
      } catch (error) {
        Swal.fire('Error', 'Falla en la sincronización', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Cuentas Corrientes</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Gestión de cobranzas y deudas</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-right min-w-[200px]">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Deuda Total en la Calle</span>
          <span className="text-2xl font-black text-rose-500">${totals.toLocaleString('es-AR')}</span>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-900/50">
          <input 
            type="text" placeholder="Buscar cliente..." 
            value={filter} onChange={e => setFilter(e.target.value)}
            className="flex-1 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-colors"
          />
          <button 
            onClick={() => setShowAll(!showAll)}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${showAll ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            {showAll ? 'Ocultar Saldo $0' : 'Ver Todos'}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="p-4">Cliente / Empresa</th>
                <th className="p-4 text-right">Saldo</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredCustomers.map(c => {
                const saldo = Number(c.balance || 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{c.company || 'Particular'}</p>
                    </td>
                    <td className={`p-4 text-right font-black ${saldo > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      ${Math.abs(saldo).toLocaleString('es-AR')}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${saldo > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {saldo > 0 ? 'Con Deuda' : 'Al Día'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleMovement(c)} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase tracking-tighter hover:bg-blue-600 transition-colors">
                        Movimiento ⚡
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};