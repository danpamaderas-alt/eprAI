import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { ARS } from '../../../shared/utils/format';
import { KpiCard } from '../../../shared/components/ui/KpiCard';
import { Breadcrumbs } from '../../../shared/components/ui/Breadcrumbs';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import { ExportButton } from '../../../shared/components/ui/ExportButton';
import { KpiSkeleton } from '../../../shared/components/ui/Skeleton';
import Swal from 'sweetalert2';

const FinancialContent = memo(() => {
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();

  const [treasuryMetrics, setTreasuryMetrics] = useState({ income: 0, expenses: 0, net: 0 });
  const [moneyInStreet, setMoneyInStreet] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRealTimeFinances = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: tData, error: tError } = await supabase
        .from('v_treasury_summary')
        .select('total_income, total_expense, net_balance')
        .maybeSingle();

      if (!tError && tData) {
        setTreasuryMetrics({
          income: Number.parseFloat(String(tData.total_income || 0)),
          expenses: Number.parseFloat(String(tData.total_expense || 0)),
          net: Number.parseFloat(String(tData.net_balance || 0)),
        });
      } else {
        const { data: fallbackTreasury } = await supabase.from('treasury').select('amount, type');
        if (fallbackTreasury) {
          let income = 0;
          let expenses = 0;
          fallbackTreasury.forEach(t => {
            const amount = Number.parseFloat(String(t.amount || 0));
            if (t.type === 'INCOME') income += amount;
            if (t.type === 'EXPENSE') expenses += amount;
          });
          setTreasuryMetrics({ income, expenses, net: income - expenses });
        }
      }

      const { data: cData, error: cError } = await supabase
        .from('v_customer_balances')
        .select('current_balance');

      if (!cError && cData) {
        const totalCalle = cData.reduce((acc, curr) => {
          const balance = Number.parseFloat(String(curr.current_balance || 0));
          return balance > 0 ? acc + balance : acc;
        }, 0);
        setMoneyInStreet(totalCalle);
      } else {
        const { data: fallbackCustomers } = await supabase.from('customers').select('balance');
        if (fallbackCustomers) {
          const totalCalle = fallbackCustomers.reduce((acc, curr) => {
            const balance = Number.parseFloat(String(curr.balance || 0));
            return balance > 0 ? acc + balance : acc;
          }, 0);
          setMoneyInStreet(totalCalle);
        }
      }
    } catch (error) {
      console.error("[Financial] Error de sincronización:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllCatalogs();
    fetchRealTimeFinances();
  }, [fetchAllCatalogs, fetchRealTimeFinances]);

  const stockMetrics = useMemo(() => {
    let cost = 0;
    let sale = 0;
    inventory.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      const qty = item.stock_quantity || 0;
      if (product && qty > 0) {
        cost += Number.parseFloat(String(product.cost_price || 0)) * qty;
        sale += Number.parseFloat(String(product.price || 0)) * qty;
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
              <option value="INSUMOS">Materia Prima / Insumos</option>
              <option value="SERVICIOS">Servicios (Luz, Internet)</option>
              <option value="MAQUINARIA">Mantenimiento / Maquinaria</option>
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
        popup: 'dark:!bg-slate-900 !rounded-[2.5rem] border border-slate-200 dark:border-slate-800',
        confirmButton: 'bg-rose-600 hover:bg-rose-500 text-white font-black px-6 py-4 rounded-2xl uppercase text-xs tracking-[0.2em] w-full mb-3 shadow-lg active:scale-95 transition-all',
        cancelButton: 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-black px-6 py-4 rounded-2xl uppercase text-xs tracking-widest w-full'
      },
      preConfirm: () => {
        const amount = Number.parseFloat((document.getElementById('ex-amount') as HTMLInputElement).value);
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
        const companyId = useTenantStore.getState().activeCompanyId;
        if (!companyId) throw new Error('No hay company_id activo');

        const { error } = await supabase.from('treasury').insert([{
          amount: formValues.amount,
          description: formValues.description.toUpperCase(),
          category: formValues.category,
          type: 'EXPENSE',
          date: new Date().toISOString(),
          company_id: companyId
        }]);
        if (error) throw error;
        await fetchRealTimeFinances();
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'Gasto registrado', showConfirmButton: false, timer: 2000
        });
      } catch {
        Swal.fire('Error', 'No se pudo procesar el gasto.', 'error');
      }
    }
  }, [fetchRealTimeFinances]);

  const totalPatrimonio = useMemo(
    () => treasuryMetrics.net + moneyInStreet + stockMetrics.stockCost,
    [treasuryMetrics.net, moneyInStreet, stockMetrics.stockCost],
  );

  const handleExportCSV = useCallback(() => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Ingresos Operativos', treasuryMetrics.income],
      ['Egresos / Gastos', treasuryMetrics.expenses],
      ['Saldo Neto (Caja Real)', treasuryMetrics.net],
      ['Saldo en la Calle', moneyInStreet],
      ['Inversión Activa (Costo)', stockMetrics.stockCost],
      ['Venta Proyectada', stockMetrics.stockValue],
      ['Ganancia Potencial', stockMetrics.projectedProfit],
      ['Margen de Catálogo', `${stockMetrics.avgMargin}%`],
      ['Patrimonio Total', totalPatrimonio],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [treasuryMetrics, moneyInStreet, stockMetrics, totalPatrimonio]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <Breadcrumbs items={[{ label: 'Finanzas' }]} />

      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">
            Centro <span className="text-blue-600">Financiero</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-3">
            Visión 360: Tesorería Real + Cuentas Corrientes + Activos Físicos.
          </p>
        </div>
        <div className="flex gap-3">
          <ExportButton onExportCSV={handleExportCSV} />
          <button
            type="button"
            onClick={handleAddExpense}
            className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
          >
            - Registrar Gasto
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard label="Ingresos Operativos" value={ARS.format(treasuryMetrics.income)} />
        <KpiCard label="Egresos / Gastos" value={ARS.format(treasuryMetrics.expenses)} />
        <KpiCard
          label="Saldo en la Calle"
          value={ARS.format(moneyInStreet)}
          variant="dark"
        />
        <KpiCard
          label="Saldo Neto (Caja Real)"
          value={ARS.format(treasuryMetrics.net)}
          variant={treasuryMetrics.net >= 0 ? 'emerald' : 'rose'}
        />
      </section>

      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10">
          Valuación de Mercadería Física
        </h2>
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

      <section className="bg-slate-900 rounded-[3.5rem] p-12 relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 p-12 text-9xl opacity-5 font-black uppercase italic" aria-hidden="true">RAÍCES</div>
        <div className="relative z-10">
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Patrimonio Total Estimado (Caja + Calle + Inversión)</p>
          <h2 className="text-7xl font-black text-white tracking-tighter tabular-nums">
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

FinancialContent.displayName = 'FinancialContent';

export const FinancialDashboard = memo(() => (
  <ErrorBoundary>
    <FinancialContent />
  </ErrorBoundary>
));

FinancialDashboard.displayName = 'FinancialDashboard';
