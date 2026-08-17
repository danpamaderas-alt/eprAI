import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useFinanceStore, type Projection } from '../store/useFinanceStore';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { ARS } from '../../../shared/utils/format';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users,
  ShoppingCart, AlertTriangle, Download, ArrowRight, Clock, Target,
  Wallet, Building2, FileText, RefreshCw, Eye, ChevronRight, Activity,
  PieChart, Calendar, Layers, Truck, Banknote,
} from 'lucide-react';
import Swal from 'sweetalert2';

type Tab = 'overview' | 'analysis' | 'projections' | 'details';

const FINANCIAL_CATEGORIES = [
  'VENTA', 'SEÑA', 'COBRO', 'INSUMOS', 'SERVICIOS', 'MAQUINARIA',
  'SUELDOS', 'ALQUILER', 'IMPUESTOS', 'OTROS',
];

export const FinancialDashboard = memo(() => {
  const { metrics, monthlyTrend, categoryBreakdown, businessUnitBreakdown, agingReceivables, orderPipeline, projections, isLoading: financeLoading, fetchAll } = useFinanceStore();
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();
  const { transactions, fetchTransactions } = useTreasuryStore();
  const { balances: crmBalances, fetchBalances } = useCrmStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('INSUMOS');

  useEffect(() => { fetchAll(); fetchAllCatalogs(); fetchTransactions(); fetchBalances(); }, [fetchAll, fetchAllCatalogs, fetchTransactions, fetchBalances]);

  // ===== Dashboard Metrics =====
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = transactions.filter(tx => {
      const d = new Date(tx.date);
      const lm = new Date(now); lm.setMonth(lm.getMonth() - 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });
    const thisMonthIncome = thisMonth.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
    const thisMonthExpense = thisMonth.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
    const lastMonthIncome = lastMonth.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
    const lastMonthExpense = lastMonth.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
    const incomeChange = lastMonthIncome > 0 ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
    const expenseChange = lastMonthExpense > 0 ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0;
    return { thisMonthIncome, thisMonthExpense, thisMonthNet: thisMonthIncome - thisMonthExpense, incomeChange, expenseChange };
  }, [transactions]);

  // ===== Alerts =====
  const alerts = useMemo(() => {
    const list: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];
    if (metrics.balance < 0) list.push({ type: 'danger', message: `Caja negativa: ${ARS.format(metrics.balance)}` });
    if (metrics.pendingReceivables > metrics.totalIncome * 0.5) list.push({ type: 'warning', message: `Alta cartera: ${ARS.format(metrics.pendingReceivables)} por cobrar` });
    if (orderPipeline.totalCancelled > orderPipeline.totalDelivered * 0.3) list.push({ type: 'warning', message: 'Alta tasa de cancelación de pedidos' });
    if (metrics.pendingPayables > metrics.balance * 0.8 && metrics.balance > 0) list.push({ type: 'danger', message: 'Deudas proveedores casi superan caja disponible' });
    agingReceivables.forEach(b => {
      if (b.minDays >= 61 && b.amount > 0) list.push({ type: 'warning', message: `Deuda antigua (${b.label}): ${ARS.format(b.amount)}` });
    });
    return list;
  }, [metrics, orderPipeline, agingReceivables]);

  // ===== Stock by Category =====
  const stockByCategory = useMemo(() => {
    const map = new Map<string, { qty: number; cost: number; value: number }>();
    const productMap = new Map(products.map(p => [p.id, p]));
    inventory.forEach((v: any) => {
      const product = productMap.get(v.product_id) || v.products;
      const qty = v.stock_quantity || 0;
      if (!product || qty <= 0) return;
      const cat = product.category || 'SIN CATEGORÍA';
      if (!map.has(cat)) map.set(cat, { qty: 0, cost: 0, value: 0 });
      const entry = map.get(cat)!;
      entry.qty += qty;
      entry.cost += Number(product.cost_price || 0) * qty;
      entry.value += Number(product.price || 0) * qty;
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data, margin: data.cost > 0 ? ((data.value - data.cost) / data.cost * 100).toFixed(1) : '0' })).sort((a, b) => b.value - a.value);
  }, [inventory, products]);

  const maxStockValue = useMemo(() => Math.max(...stockByCategory.map(c => c.value), 1), [stockByCategory]);
  const maxMonthly = useMemo(() => Math.max(...monthlyTrend.map(m => Math.max(m.income, m.expenses)), 1), [monthlyTrend]);

  // ===== Handlers =====
  const handleExport = useCallback(() => {
    const rows = [
      ['METRICA', 'VALOR'],
      ['Ingresos Totales', metrics.totalIncome],
      ['Egresos Totales', metrics.totalExpenses],
      ['Saldo Neto', metrics.balance],
      ['Dinero en Calle', metrics.moneyInStreet],
      ['Deudas Proveedores', metrics.pendingPayables],
      ['Inversion Stock (Costo)', metrics.stockCost],
      ['Valor Venta Stock', metrics.stockValue],
      ['Ganancia Potencial', metrics.projectedProfit],
      ['Margen Promedio', `${metrics.avgMargin.toFixed(1)}%`],
      ['Patrimonio Total', metrics.patrimonio],
      ['', ''],
      ['PIPELINE PEDIDOS', ''],
      ['Pendientes', `${orderPipeline.countPending} (${ARS.format(orderPipeline.totalPending)})`],
      ['Entregados', `${orderPipeline.countDelivered} (${ARS.format(orderPipeline.totalDelivered)})`],
      ['Cancelados', `${orderPipeline.totalCancelled}`],
      ['Tasa Conversion', `${orderPipeline.conversionRate.toFixed(1)}%`],
      ['Señas Recibidas', ARS.format(orderPipeline.advancePayments)],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `centro_financiero_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [metrics, orderPipeline]);

  const handleRegisterExpense = useCallback(async () => {
    if (!expenseAmount || !expenseDescription.trim()) return;
    const { addTransaction } = useTreasuryStore.getState();
    try {
      await addTransaction({
        amount: Number(expenseAmount), description: expenseDescription.toUpperCase().trim(),
        type: 'EXPENSE', category: expenseCategory, business_unit: 'GENERAL',
        payment_method: 'EFECTIVO', date: new Date().toISOString(), status: 'COMPLETED',
      });
      setShowExpenseModal(false); setExpenseAmount(''); setExpenseDescription('');
      Swal.fire({ title: 'Gasto registrado', icon: 'success', timer: 1200, showConfirmButton: false });
      fetchAll();
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo registrar', 'error');
    }
  }, [expenseAmount, expenseDescription, expenseCategory, fetchAll]);

  const confColor = (c: string) => c === 'high' ? 'text-emerald-500' : c === 'medium' ? 'text-amber-500' : 'text-red-400';

  if (financeLoading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-64" />
        <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Centro Financiero
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Visión 360: Tesorería + Cuentas + Activos + Proyecciones</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Download className="w-3 h-3" /> Exportar
          </button>
          <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all active:scale-95">
            <Banknote className="w-3 h-3" /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              alert.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800' :
              alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800' :
              'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-200 dark:border-blue-800'
            }`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Hero Patrimonio */}
      <div className="bg-slate-900 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 text-8xl opacity-5 font-black italic" aria-hidden="true">R</div>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Patrimonio Total Estimado</p>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter tabular-nums">{ARS.format(metrics.patrimonio)}</h2>
          <div className="flex flex-wrap gap-4 mt-4">
            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full" /> Caja {ARS.format(metrics.balance)}</span>
            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-500 rounded-full" /> Calle {ARS.format(metrics.moneyInStreet)}</span>
            <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Stock {ARS.format(metrics.stockCost)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos', value: ARS.format(metrics.totalIncome), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: TrendingUp, sub: `${stats.incomeChange >= 0 ? '+' : ''}${stats.incomeChange.toFixed(0)}% vs mes ant.` },
          { label: 'Egresos', value: ARS.format(metrics.totalExpenses), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown, sub: `${stats.expenseChange >= 0 ? '+' : ''}${stats.expenseChange.toFixed(0)}% vs mes ant.` },
          { label: 'Por Cobrar', value: ARS.format(metrics.pendingReceivables), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Clock, sub: `${orderPipeline.countPending} pedidos pendientes` },
          { label: 'Por Pagar', value: ARS.format(metrics.pendingPayables), color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: Truck, sub: 'Deudas proveedores' },
        ].map(({ label, value, color, bg, icon: Icon, sub }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            </div>
            <p className={`text-lg font-black ${color} tabular-nums`}>{value}</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'overview' as Tab, label: 'Resumen' },
          { key: 'analysis' as Tab, label: 'Análisis' },
          { key: 'projections' as Tab, label: 'Proyecciones' },
          { key: 'details' as Tab, label: 'Detalle' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
            activeTab === tab.key ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}>{tab.label}</button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Monthly Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Tendencia Mensual (12 meses)</h3>
            <div className="flex items-end gap-1 h-48">
              {monthlyTrend.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex gap-px items-end" style={{ height: '140px' }}>
                    <div className="flex-1 bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${(m.income / maxMonthly) * 100}%`, minHeight: m.income > 0 ? '2px' : '0' }} />
                    <div className="flex-1 bg-red-400 rounded-t-sm transition-all" style={{ height: `${(m.expenses / maxMonthly) * 100}%`, minHeight: m.expenses > 0 ? '2px' : '0' }} />
                  </div>
                  <span className="text-[7px] font-bold text-slate-400 uppercase truncate w-full text-center">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-3">
              <span className="text-[8px] font-bold text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Ingresos</span>
              <span className="text-[8px] font-bold text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> Egresos</span>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Package className="w-3 h-3 text-brand" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Stock Costo</span></div>
              <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(metrics.stockCost)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Target className="w-3 h-3 text-blue-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Venta Proyectada</span></div>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">{ARS.format(metrics.stockValue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3 h-3 text-emerald-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Ganancia Potencial</span></div>
              <p className="text-lg font-black text-emerald-600 tabular-nums">{ARS.format(metrics.projectedProfit)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Activity className="w-3 h-3 text-indigo-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Margen</span></div>
              <p className="text-lg font-black text-indigo-600 tabular-nums">{metrics.avgMargin.toFixed(1)}%</p>
            </div>
          </div>

          {/* Order Pipeline */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Pipeline de Pedidos</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Pendientes', value: orderPipeline.countPending, amount: orderPipeline.totalPending, color: 'amber' },
                { label: 'Entregados', value: orderPipeline.countDelivered, amount: orderPipeline.totalDelivered, color: 'emerald' },
                { label: 'Cancelados', value: orderPipeline.totalCancelled, amount: 0, color: 'red' },
                { label: 'Señas', value: 0, amount: orderPipeline.advancePayments, color: 'blue' },
                { label: 'Conversión', value: 0, amount: 0, color: 'purple', rate: orderPipeline.conversionRate },
              ].map(item => (
                <div key={item.label} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-xl p-3 border border-${item.color}-200 dark:border-${item.color}-800/50`}>
                  <span className={`text-[8px] font-black uppercase text-${item.color}-600 tracking-widest`}>{item.label}</span>
                  <p className={`text-xl font-black text-${item.color}-600 tabular-nums mt-1`}>
                    {item.rate !== undefined ? `${item.rate.toFixed(0)}%` : item.value}
                  </p>
                  {item.amount > 0 && <p className="text-[9px] text-slate-400 font-medium">{ARS.format(item.amount)}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== ANALYSIS TAB ===== */}
      {activeTab === 'analysis' && (
        <div className="space-y-5">
          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Análisis por Categoría</h3>
            <div className="space-y-2">
              {categoryBreakdown.slice(0, 10).map(cat => {
                const maxVal = Math.max(Math.abs(categoryBreakdown[0]?.net || 1), 1);
                const width = (Math.abs(cat.net) / maxVal) * 100;
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-28 truncate">{cat.name}</span>
                    <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cat.net >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${width}%` }} />
                    </div>
                    <span className={`text-[9px] font-black tabular-nums w-24 text-right ${cat.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {cat.net >= 0 ? '+' : ''}{ARS.format(cat.net)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Business Unit Comparison */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Rendimiento por Unidad de Negocio</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <tr><th className="p-3">Unidad</th><th className="p-3 text-center">Pedidos</th><th className="p-3 text-right">Facturación</th><th className="p-3 text-right">Ingresos</th><th className="p-3 text-right">Egresos</th><th className="p-3 text-right">Neto</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {businessUnitBreakdown.map(bu => {
                    const net = bu.income - bu.expense;
                    return (
                      <tr key={bu.unit} className="dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-3 font-black uppercase">{bu.unit.replace('_', ' ')}</td>
                        <td className="p-3 text-center font-bold">{bu.orders}</td>
                        <td className="p-3 text-right font-bold tabular-nums">{ARS.format(bu.revenue)}</td>
                        <td className="p-3 text-right font-bold text-emerald-500 tabular-nums">{ARS.format(bu.income)}</td>
                        <td className="p-3 text-right font-bold text-red-500 tabular-nums">{ARS.format(bu.expense)}</td>
                        <td className={`p-3 text-right font-black tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ARS.format(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Aging Receivables */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Antigüedad de Cuentas por Cobrar</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {agingReceivables.map(bucket => (
                <div key={bucket.label} className={`rounded-xl p-4 border ${
                  bucket.minDays >= 61 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                  bucket.minDays >= 31 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                  'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                }`}>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${
                    bucket.minDays >= 61 ? 'text-red-500' : bucket.minDays >= 31 ? 'text-amber-500' : 'text-slate-500'
                  }`}>{bucket.label}</span>
                  <p className={`text-lg font-black tabular-nums mt-1 ${
                    bucket.minDays >= 61 ? 'text-red-600' : bucket.minDays >= 31 ? 'text-amber-600' : 'text-slate-900 dark:text-white'
                  }`}>{ARS.format(bucket.amount)}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{bucket.count} pedidos</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stock by Category */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Stock por Categoría</h3>
            <div className="space-y-2">
              {stockByCategory.map(cat => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-28 truncate">{cat.name}</span>
                  <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(cat.value / maxStockValue) * 100}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 w-12 text-right">{cat.qty}ud</span>
                  <span className="text-[9px] font-black tabular-nums w-20 text-right text-slate-900 dark:text-white">{ARS.format(cat.value)}</span>
                  <span className="text-[9px] font-bold text-emerald-500 w-12 text-right">{cat.margin}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== PROJECTIONS TAB ===== */}
      {activeTab === 'projections' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Proyecciones (Promedio Últimos 3 Meses)</h3>
            <div className="space-y-3">
              {projections.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${p.confidence === 'high' ? 'bg-emerald-500' : p.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-400'}`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black tabular-nums ${p.value >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
                      {ARS.format(p.value)}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${confColor(p.confidence)}`}>
                      {p.confidence === 'high' ? 'ALTA' : p.confidence === 'medium' ? 'MEDIA' : 'BAJA'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cash Flow Projection */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Flujo de Caja Estimado (Próx. 3 Meses)</h3>
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map(i => {
                const d = new Date(); d.setMonth(d.getMonth() + i + 1);
                const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                const avgIncome = projections.find(p => p.label.includes('Ingresos'))?.value || 0;
                const avgExpense = projections.find(p => p.label.includes('Egresos'))?.value || 0;
                const net = avgIncome - avgExpense;
                return (
                  <div key={i} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
                    <p className={`text-lg font-black tabular-nums mt-2 ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ARS.format(net)}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[8px] text-emerald-500 font-bold">+{ARS.format(avgIncome)}</span>
                      <span className="text-[8px] text-red-400 font-bold">-{ARS.format(avgExpense)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAILS TAB ===== */}
      {activeTab === 'details' && (
        <div className="space-y-5">
          {/* Top Categories Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Detalle por Categoría</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <tr><th className="p-3">Categoría</th><th className="p-3 text-right">Ingresos</th><th className="p-3 text-right">Egresos</th><th className="p-3 text-right">Neto</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {categoryBreakdown.map(cat => (
                    <tr key={cat.name} className="dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 font-black uppercase">{cat.name}</td>
                      <td className="p-3 text-right font-bold text-emerald-500 tabular-nums">{cat.income > 0 ? ARS.format(cat.income) : '—'}</td>
                      <td className="p-3 text-right font-bold text-red-500 tabular-nums">{cat.expense > 0 ? ARS.format(cat.expense) : '—'}</td>
                      <td className={`p-3 text-right font-black tabular-nums ${cat.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ARS.format(cat.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Business Units Detail */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Detalle por Unidad de Negocio</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <tr><th className="p-3">Unidad</th><th className="p-3 text-center">Pedidos</th><th className="p-3 text-right">Facturación</th><th className="p-3 text-right">Ingresos</th><th className="p-3 text-right">Egresos</th><th className="p-3 text-right">Neto</th><th className="p-3 text-right">Margen</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {businessUnitBreakdown.map(bu => {
                    const net = bu.income - bu.expense;
                    const margin = bu.revenue > 0 ? ((net / bu.revenue) * 100).toFixed(1) : '0';
                    return (
                      <tr key={bu.unit} className="dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-3 font-black uppercase">{bu.unit.replace('_', ' ')}</td>
                        <td className="p-3 text-center font-bold">{bu.orders}</td>
                        <td className="p-3 text-right font-bold tabular-nums">{ARS.format(bu.revenue)}</td>
                        <td className="p-3 text-right font-bold text-emerald-500 tabular-nums">{ARS.format(bu.income)}</td>
                        <td className="p-3 text-right font-bold text-red-500 tabular-nums">{ARS.format(bu.expense)}</td>
                        <td className={`p-3 text-right font-black tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ARS.format(net)}</td>
                        <td className="p-3 text-right font-bold text-brand tabular-nums">{margin}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Row */}
          <div className="bg-slate-900 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Resumen General</div>
            <div className="flex flex-wrap gap-6">
              <div><span className="text-[8px] text-slate-500 font-bold">Caja:</span> <span className={`text-xs font-black ${metrics.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{ARS.format(metrics.balance)}</span></div>
              <div><span className="text-[8px] text-slate-500 font-bold">Calle:</span> <span className="text-xs font-black text-amber-400">{ARS.format(metrics.moneyInStreet)}</span></div>
              <div><span className="text-[8px] text-slate-500 font-bold">Proveedores:</span> <span className="text-xs font-black text-red-400">{ARS.format(metrics.pendingPayables)}</span></div>
              <div><span className="text-[8px] text-slate-500 font-bold">Stock:</span> <span className="text-xs font-black text-blue-400">{ARS.format(metrics.stockCost)}</span></div>
              <div><span className="text-[8px] text-slate-500 font-bold">Patrimonio:</span> <span className="text-xs font-black text-white">{ARS.format(metrics.patrimonio)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== EXPENSE MODAL ===== */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowExpenseModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase mb-4 text-slate-900 dark:text-white">Registrar Gasto Rápido</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Monto *</label>
                <input type="number" step="0.01" min="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-red-500 outline-none focus:border-red-500 transition-all" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Descripción *</label>
                <input type="text" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} placeholder="Ej: Pago proveedor, Servicio..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Categoría</label>
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-white outline-none">
                  {FINANCIAL_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowExpenseModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleRegisterExpense} disabled={!expenseAmount || !expenseDescription.trim()}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-red-500/20">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

FinancialDashboard.displayName = 'FinancialDashboard';
