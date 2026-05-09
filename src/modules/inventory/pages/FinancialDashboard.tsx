import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

// 🚀 Formateador global para consistencia visual
const ARS = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

export const FinancialDashboard = memo(() => {
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();
  
  const [treasuryMetrics, setTreasuryMetrics] = useState({ income: 0, expenses: 0, net: 0 });
  const [moneyInStreet, setMoneyInStreet] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 FUNCIÓN CLAVE: Sincronización con las vistas de Supabase
  const fetchRealTimeFinances = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Resumen de Caja Real
      const { data: tData, error: tError } = await supabase.from('v_treasury_summary').select('*').single();
      if (tError) throw tError;

      // 2. Dinero en Calle (Saldos Cta Cte)
      const { data: cData, error: cError } = await supabase.from('v_customer_balances').select('current_balance');
      if (cError) throw cError;

      if (tData) {
        setTreasuryMetrics({
          income: Number(tData.total_income) || 0,
          expenses: Number(tData.total_expense) || 0,
          net: Number(tData.net_balance) || 0
        });
      }

      if (cData) {
        const totalCalle = cData.reduce((acc, curr) => 
          curr.current_balance > 0 ? acc + Number(curr.current_balance) : acc, 0
        );
        setMoneyInStreet(totalCalle);
      }
    } catch (error) {
      console.error("❌ [Financial] Error de sincronización:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllCatalogs();
    fetchRealTimeFinances();
  }, [fetchAllCatalogs, fetchRealTimeFinances]);

  // 🧠 VALUACIÓN DE STOCK MEMORIZADA
  const stockMetrics = useMemo(() => {
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
    return { stockCost: cost, stockValue: sale, projectedProfit: profit, avgMargin: margin.toFixed(1) };
  }, [inventory, products]);

  const handleAddExpense = useCallback(async () => {
    const { value: formValues } = await Swal.fire({
      title: 'REGISTRAR GASTO OPERATIVO',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monto del Egreso ($)</label>
            <input id="ex-amount" type="number" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-950 !border-slate-200 dark:!border-slate-800 !text-rose-500 !text-2xl !font-black !rounded-2xl" placeholder="0.00">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Concepto / Detalle</label>
            <input id="ex-desc" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-950 !border-slate-200 dark:!border-slate-800 !text-slate-900 dark:!text-white !text-sm !font-bold !rounded-2xl" placeholder="Ej: Pago hilos / Factura luz">
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoría de Gasto</label>
            <select id="ex-cat" class="swal2-input !w-full !m-0 !mt-1 !bg-slate-50 dark:!bg-slate-950 !border-slate-200 dark:!border-slate-800 !text-slate-900 dark:!text-white !text-sm !font-black !rounded-2xl">
              <option value="INSUMOS">📦 Materia Prima / Insumos</option>
              <option value="SERVICIOS">⚡ Servicios (Luz, Internet)</option>
              <option value="MAQUINARIA">🛠️ Mantenimiento / Maquinaria</option>
              <option value="OTROS">⚙️ Varios / Otros</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'DESCONTAR DE CAJA',
      cancelButtonText: 'CANCELAR',
      buttonsStyling: false,
      customClass: {
        popup: 'dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800',
        confirmButton: 'bg-rose-600 hover:bg-rose-500 text-white font-black px-6 py-4 rounded-2xl uppercase text-xs tracking-[0.2em] w-full mb-3 shadow-lg active:scale-95 transition-all',
        cancelButton: 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-black px-6 py-4 rounded-2xl uppercase text-xs tracking-widest w-full'
      },
      preConfirm: () => {
        const amount = Number((document.getElementById('ex-amount') as HTMLInputElement).value);
        const description = (document.getElementById('ex-desc') as HTMLInputElement).value.trim();
        const category = (document.getElementById('ex-cat') as HTMLSelectElement).value;

        if (!amount || amount <= 0 || !description) {
          Swal.showValidationMessage('Completá monto válido y descripción');
          return false;
        }
        return { amount, description, category };
      }
    });

    if (formValues) {
      try {
        const { error } = await supabase.from('treasury').insert([{
          amount: formValues.amount,
          description: formValues.description.toUpperCase(),
          category: formValues.category,
          type: 'EXPENSE',
          date: new Date().toISOString()
        }]);

        if (error) throw error;

        await fetchRealTimeFinances(); 

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Gasto registrado correctamente',
          showConfirmButton: false,
          timer: 2000
        });

      } catch (err) {
        Swal.fire('Error', 'No se pudo procesar el gasto.', 'error');
      }
    }
  }, [fetchRealTimeFinances]);

  const totalPatrimonio = useMemo(() => 
    treasuryMetrics.net + moneyInStreet + stockMetrics.stockCost
  , [treasuryMetrics.net, moneyInStreet, stockMetrics.stockCost]);

  if (isLoading) return <div className="p-8 h-screen flex items-center justify-center font-black text-slate-500 uppercase animate-pulse tracking-[0.5em] italic">Analizando Patrimonio Holding...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">
            📈 Centro <span className="text-blue-600">Financiero</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-3 italic">Visión 360: Tesorería Real + Cuentas Corrientes + Activos Físicos.</p>
        </div>
        <button 
          onClick={handleAddExpense} 
          className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
        >
          - Registrar Gasto
        </button>
      </header>

      {/* SECCIÓN 1: CAJA Y CALLE */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Ingresos Operativos</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{ARS.format(treasuryMetrics.income)}</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Egresos / Gastos</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{ARS.format(treasuryMetrics.expenses)}</p>
        </div>

        <div className="bg-slate-900 border border-blue-600 p-8 rounded-[2.5rem] shadow-xl shadow-blue-600/10 relative overflow-hidden group">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">💸 Saldo en la Calle</p>
          <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{ARS.format(moneyInStreet)}</p>
          <div className="absolute right-0 bottom-0 opacity-10 text-6xl p-4 group-hover:scale-110 transition-transform">🤝</div>
        </div>

        <div className={`p-8 rounded-[2.5rem] border-2 shadow-xl ${treasuryMetrics.net >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
          <p className="text-[10px] font-black uppercase mb-2 text-slate-500 tracking-widest italic">Saldo Neto (Caja Real)</p>
          <p className={`text-4xl font-black tracking-tighter tabular-nums ${treasuryMetrics.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {ARS.format(treasuryMetrics.net)}
          </p>
        </div>
      </section>

      {/* SECCIÓN 2: VALUACIÓN DE STOCK */}
      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 italic">📦 Valuación de Mercadería Física</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Inversión Activa (Costo)</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(stockMetrics.stockCost)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Venta Proyectada</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{ARS.format(stockMetrics.stockValue)}</p>
          </div>
          <div className="md:border-l md:border-slate-100 dark:md:border-slate-800 md:pl-10">
            <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-widest">Ganancia Potencial</p>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter tabular-nums">{ARS.format(stockMetrics.projectedProfit)}</p>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black text-indigo-500 uppercase mb-2 tracking-widest">Margen de Catálogo</p>
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter tabular-nums">{stockMetrics.avgMargin}%</p>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: PATRIMONIO TOTAL */}
      <section className="bg-slate-900 rounded-[3.5rem] p-12 relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 p-12 text-9xl opacity-5 font-black uppercase italic">RAÍCES</div>
        <div className="relative z-10">
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Patrimonio Total Estimado (Caja + Calle + Inversión)</p>
          <h2 className="text-7xl font-black text-white tracking-tighter tabular-nums italic">
            {ARS.format(totalPatrimonio)}
          </h2>
          <div className="flex gap-4 mt-6">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Basado en Activos Circulantes
            </span>
          </div>
        </div>
      </section>

    </div>
  );
});

FinancialDashboard.displayName = 'FinancialDashboard';