import React, { useEffect, useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore'; // ✅ CONECTAMOS LA ÚNICA VERDAD DE LA AGENDA
import Swal from 'sweetalert2';

export const FinancialDashboard = () => {
  const { expenses, orders, isLoading: isFinanceLoading, fetchFinances, addExpense } = useFinanceStore();
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore(); // ✅ TRAEMOS LA BASE REAL DE CLIENTES

  useEffect(() => {
    fetchFinances();
    fetchAllCatalogs();
    fetchCustomers(); // ✅ ACTUALIZAMOS SALDOS DE VERDAD
  }, [fetchFinances, fetchAllCatalogs, fetchCustomers]);

  // 🧠 CÁLCULO 1: FLUJO DE CAJA Y DINERO EN CALLE (VERSIÓN ALINEADA A TESORERÍA)
  const { totalIncome, totalExpenses, netBalance, totalInStreet } = useMemo(() => {
    let income = 0;
    
    // 🚀 LECTURA DIRECTA: Sumamos el saldo (balance) de todos los clientes activos. 
    // Igual que lo armamos en la otra pantalla.
    const inStreet = customers.reduce((acc, client) => acc + (Number(client.balance) || 0), 0);

    // CAJA: Sumamos cobros y señas
    orders.forEach(order => {
      const total = Number(order.total_amount || 0);
      const advance = Number(order.advance_payment || 0);

      if (order.status === 'COMPLETED') {
        income += total;
      } else if (order.status !== 'CANCELLED') {
        income += advance; 
      }
    });

    const outgoings = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

    return { 
      totalIncome: income, 
      totalExpenses: outgoings, 
      netBalance: income - outgoings,
      totalInStreet: inStreet
    };
  }, [expenses, orders, customers]);

  // 🧠 CÁLCULO 2: VALUACIÓN DE STOCK Y RENTABILIDAD
  const { stockCost, stockValue, projectedProfit, avgMargin } = useMemo(() => {
    let cost = 0;
    let sale = 0;

    inventory.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product && item.stock_quantity > 0) {
        cost += (Number(product.cost_price) || 0) * item.stock_quantity;
        sale += (Number(product.price) || 0) * item.stock_quantity;
      }
    });

    const profit = sale - cost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;

    return { 
      stockCost: cost, 
      stockValue: sale, 
      projectedProfit: profit, 
      avgMargin: margin.toFixed(2) 
    };
  }, [inventory, products]);

  // 🎨 ALERTA PARA REGISTRAR GASTOS
  const handleAddExpense = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'REGISTRAR GASTO',
      html: `
        <div class="text-left space-y-4 mt-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Monto gastado ($)</label>
            <input id="ex-amount" type="number" class="swal2-input !w-full !m-0 !mt-1 !h-16 !bg-slate-950 !border !border-slate-800 !text-rose-400 !rounded-2xl !text-center !font-black !text-3xl focus:!border-rose-500 !transition-all" placeholder="0">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Descripción corta</label>
            <input id="ex-desc" class="swal2-input !w-full !m-0 !mt-1 !h-12 !bg-slate-950 !border !border-slate-800 !text-white !rounded-xl !text-sm !font-bold focus:!border-indigo-500 !transition-all" placeholder="Ej: Compra 5m DTF">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 ml-1">Categoría</label>
            <select id="ex-cat" class="swal2-input !w-full !m-0 !mt-1 !h-12 !bg-slate-950 !border !border-slate-800 !text-white !rounded-xl !text-sm !font-bold focus:!border-indigo-500 !transition-all">
              <option value="INSUMOS">Insumos y Materia Prima</option>
              <option value="SERVICIOS">Servicios (Luz, Internet)</option>
              <option value="IMPUESTOS">Impuestos / Contables</option>
              <option value="MAQUINARIA">Mantenimiento Maquinaria</option>
              <option value="OTROS">Otros Gastos</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'DESCONTAR DE CAJA', cancelButtonText: 'CANCELAR',
      buttonsStyling: false,
      customClass: {
        popup: '!bg-slate-900 !border !border-slate-800 !rounded-[2rem] !shadow-2xl',
        title: '!text-white !font-black !text-2xl !tracking-tighter pt-4',
        htmlContainer: '!mx-8 !mb-8',
        actions: '!w-full !px-8 !pb-8 !m-0 flex flex-col gap-3',
        confirmButton: 'w-full bg-rose-600 hover:bg-rose-500 text-white font-black px-6 py-4 rounded-2xl uppercase text-xs tracking-widest transition-all active:scale-95',
        cancelButton: 'w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black px-6 py-4 rounded-2xl uppercase text-xs tracking-widest transition-all'
      },
      preConfirm: () => {
        const amount = Number((document.getElementById('ex-amount') as HTMLInputElement).value);
        const description = (document.getElementById('ex-desc') as HTMLInputElement).value;
        const category = (document.getElementById('ex-cat') as HTMLSelectElement).value;
        if (!amount || !description) { Swal.showValidationMessage('Completá el monto y la descripción'); return false; }
        return { amount, description, category, expense_date: new Date().toISOString().split('T')[0] };
      }
    });

    if (formValues) {
      await addExpense(formValues);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Gasto registrado', showConfirmButton: false, timer: 1500, customClass: { popup: '!bg-slate-900 !text-white !rounded-xl border border-slate-800' } });
    }
  };

  if (isFinanceLoading) return <div className="p-8 text-slate-400 font-black animate-pulse uppercase">Calculando métricas...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-10">
      
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">📈 Centro <span className="text-blue-500">Financiero</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Visión 360 de capital, deudas a cobrar y valuación de stock.</p>
        </div>
        <button onClick={handleAddExpense} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all">
          - Registrar Gasto
        </button>
      </header>

      {/* SECCIÓN 1: CAJA Y CALLE */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Efectivo Cobrado</p>
          <p className="text-3xl font-black text-white tracking-tighter">${totalIncome.toLocaleString()}</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Gastos Operativos</p>
          <p className="text-3xl font-black text-white tracking-tighter">${totalExpenses.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl ring-2 ring-amber-500/20">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1">🛣️ Dinero en Calle</p>
          <p className="text-3xl font-black text-white tracking-tighter">${totalInStreet.toLocaleString()}</p>
          <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Sincronizado con Cuentas Corrientes</p>
        </div>

        <div className={`p-6 rounded-[2rem] shadow-xl border ${netBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>Saldo Neto (Caja)</p>
          <p className={`text-4xl font-black tracking-tighter ${netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            ${netBalance.toLocaleString()}
          </p>
        </div>
      </section>

      {/* SECCIÓN 2: VALUACIÓN DE STOCK Y RENTABILIDAD */}
      <section>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Valuación de Mercadería Física</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Inversión (Costo)</p>
              <p className="text-2xl font-black text-white tracking-tighter">${stockCost.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Plata parada en estantería</p>
            </div>

            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Valor Venta Proyectado</p>
              <p className="text-2xl font-black text-blue-400 tracking-tighter">${stockValue.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Si se vende todo hoy</p>
            </div>

            <div className="pl-6 border-l border-slate-800">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ganancia Estimada</p>
              <p className="text-3xl font-black text-emerald-400 tracking-tighter">${projectedProfit.toLocaleString()}</p>
            </div>

            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Margen Promedio (%)</p>
              <div className="flex items-end gap-1">
                <p className="text-3xl font-black text-indigo-400 tracking-tighter">{avgMargin}%</p>
              </div>
              <div className="w-full bg-slate-950 h-2 mt-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(Number(avgMargin), 100)}%` }}></div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECCIÓN 3: PATRIMONIO NETO DE LA EMPRESA */}
      <section className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl font-black italic">RAÍCES</div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-2">Patrimonio Total Estimado</h2>
            <p className="text-6xl font-black text-white tracking-tighter">
              ${(netBalance + totalInStreet + stockCost).toLocaleString()}
            </p>
            <p className="text-indigo-200 text-[10px] font-bold uppercase mt-2 italic">Valor de la empresa (Plata en caja + Deudas a cobrar + Costo del stock actual).</p>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4: ÚLTIMOS GASTOS */}
      <section>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Últimos Gastos Registrados</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          {expenses.length === 0 ? (
            <p className="text-center text-slate-500 font-bold text-xs uppercase py-4">No hay egresos registrados.</p>
          ) : (
            <div className="space-y-3">
              {expenses.slice(0, 10).map(exp => (
                <div key={exp.id} className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800/50 rounded-2xl hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center text-xl font-black">-</div>
                    <div>
                      <p className="text-sm font-black text-white">{exp.description}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{exp.category} | {exp.expense_date}</p>
                    </div>
                  </div>
                  <p className="text-lg font-black text-rose-400 tracking-tighter">-${Number(exp.amount).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};