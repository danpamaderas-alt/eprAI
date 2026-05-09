import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase'; // 🚀 IMPORT DIRECTO PARA LAS VISTAS
import { useCatalogStore } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

export const FinancialDashboard = () => {
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();
  
  // Estados para los datos reales de la DB
  const [treasuryMetrics, setTreasuryMetrics] = useState({ income: 0, expenses: 0, net: 0 });
  const [moneyInStreet, setMoneyInStreet] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAllCatalogs();
    fetchRealTimeFinances();
  }, [fetchAllCatalogs]);

  // 🚀 FUNCIÓN CLAVE: Trae los números finales procesados por la DB
  const fetchRealTimeFinances = async () => {
    setIsLoading(true);
    try {
      // 1. Traemos el resumen de la tabla 'treasury' (Caja Real)
      const { data: tData } = await supabase.from('v_treasury_summary').select('*').single();
      
      // 2. Traemos el Dinero en Calle (Suma de saldos de Cuentas Corrientes)
      const { data: cData } = await supabase.from('v_customer_balances').select('current_balance');

      if (tData) {
        setTreasuryMetrics({
          income: tData.total_income,
          expenses: tData.total_expense,
          net: tData.net_balance
        });
      }

      if (cData) {
        const totalCalle = cData.reduce((acc, curr) => 
          curr.current_balance > 0 ? acc + Number(curr.current_balance) : acc, 0
        );
        setMoneyInStreet(totalCalle);
      }
    } catch (error) {
      console.error("Error sincronizando:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🧠 VALUACIÓN DE STOCK (Se mantiene igual, es lógica de catálogo)
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
    return { stockCost: cost, stockValue: sale, projectedProfit: profit, avgMargin: margin.toFixed(2) };
  }, [inventory, products]);

const handleAddExpense = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'REGISTRAR GASTO OPERATIVO',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400">Monto del Gasto ($)</label>
            <input id="ex-amount" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-rose-400 !text-2xl !font-black" placeholder="0.00">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400">¿En qué se fue la plata?</label>
            <input id="ex-desc" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-white !text-sm" placeholder="Ej: Hilos, botones, factura de luz...">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400">Categoría</label>
            <select id="ex-cat" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-950 !border-slate-800 !text-white !text-sm">
              <option value="INSUMOS">Materia Prima / Insumos</option>
              <option value="SERVICIOS">Servicios (Luz, Internet)</option>
              <option value="MAQUINARIA">Mantenimiento</option>
              <option value="OTROS">Varios / Otros</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'DESCONTAR DE CAJA',
      cancelButtonText: 'CANCELAR',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'bg-rose-600 text-white font-black px-6 py-4 rounded-xl uppercase text-xs tracking-widest w-full mb-2',
        cancelButton: 'bg-slate-800 text-slate-400 font-black px-6 py-4 rounded-xl uppercase text-xs tracking-widest w-full'
      },
      preConfirm: () => {
        const amount = Number((document.getElementById('ex-amount') as HTMLInputElement).value);
        const description = (document.getElementById('ex-desc') as HTMLInputElement).value;
        const category = (document.getElementById('ex-cat') as HTMLSelectElement).value;

        if (!amount || !description) {
          Swal.showValidationMessage('Por favor, completá monto y descripción');
          return false;
        }
        return { amount, description, category };
      }
    });

    if (formValues) {
      try {
        // 🚀 INSERCIÓN DIRECTA EN LA TABLA TREASURY
        const { error } = await supabase.from('treasury').insert([{
          amount: formValues.amount,
          description: formValues.description,
          category: formValues.category,
          type: 'EXPENSE', // 👈 Esto es lo que hace que reste en la vista
          date: new Date().toISOString()
        }]);

        if (error) throw error;

        // ✅ REFRESCAMOS LOS NÚMEROS DEL DASHBOARD
        fetchRealTimeFinances(); 

        Swal.fire({
          icon: 'success',
          title: 'Gasto Registrado',
          text: `Se descontaron $${formValues.amount.toLocaleString()} de la caja real.`,
          timer: 2000,
          showConfirmButton: false
        });

      } catch (err: any) {
        Swal.fire('Error', 'No se pudo registrar el gasto: ' + err.message, 'error');
      }
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400 font-black animate-pulse uppercase">Sincronizando con Tesorería...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-10">
      
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">📈 Centro <span className="text-blue-500">Financiero</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase mt-2">Visión 360 basada en Tesorería Real y Cuentas Corrientes.</p>
        </div>
        <button onClick={handleAddExpense} className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">
          - Registrar Gasto
        </button>
      </header>

      {/* SECCIÓN 1: CAJA Y CALLE (Sincronizados con la DB) */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Efectivo Cobrado</p>
          <p className="text-3xl font-black text-white">${treasuryMetrics.income.toLocaleString()}</p>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
          <p className="text-[10px] font-black text-rose-500 uppercase mb-1">Gastos Operativos</p>
          <p className="text-3xl font-black text-white">${treasuryMetrics.expenses.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 border border-blue-500/50 p-6 rounded-[2rem] ring-2 ring-blue-500/20">
          <p className="text-[10px] font-black text-blue-400 uppercase mb-1">💸 Dinero en Calle</p>
          <p className="text-3xl font-black text-white">${moneyInStreet.toLocaleString()}</p>
          <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Sincronizado con CRM</p>
        </div>

        <div className={`p-6 rounded-[2rem] border ${treasuryMetrics.net >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
          <p className="text-[10px] font-black uppercase mb-1 text-slate-400">Saldo Neto (Caja Real)</p>
          <p className={`text-4xl font-black tracking-tighter ${treasuryMetrics.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            ${treasuryMetrics.net.toLocaleString()}
          </p>
        </div>
      </section>

      {/* VALUACIÓN DE STOCK */}
      <section>
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Valuación de Mercadería Física</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Inversión (Costo)</p>
              <p className="text-2xl font-black text-white">${stockCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Venta Proyectada</p>
              <p className="text-2xl font-black text-blue-400">${stockValue.toLocaleString()}</p>
            </div>
            <div className="md:border-l md:border-slate-800 md:pl-6">
              <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Ganancia Bruta</p>
              <p className="text-3xl font-black text-emerald-400">${projectedProfit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Margen Promedio</p>
              <p className="text-3xl font-black text-indigo-400">{avgMargin}%</p>
            </div>
          </div>
        </div>
      </section>

      {/* PATRIMONIO TOTAL */}
      <section className="bg-indigo-600 rounded-[2.5rem] p-8 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-indigo-100 text-xs font-black uppercase mb-2">Patrimonio Total Estimado (Caja + Calle + Stock)</h2>
          <p className="text-6xl font-black text-white tracking-tighter">
            ${(treasuryMetrics.net + moneyInStreet + stockCost).toLocaleString()}
          </p>
          <p className="text-indigo-200 text-[10px] font-bold uppercase mt-2 italic">Representa el valor real de los activos de Raíces hoy.</p>
        </div>
      </section>

    </div>
  );
};