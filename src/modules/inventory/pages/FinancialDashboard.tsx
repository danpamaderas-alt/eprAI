import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { ARS } from '../../../shared/utils/format';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package,
  AlertTriangle, Download, Clock, Target, Activity, Layers,
  Truck, Banknote, FileText, ChevronDown, ChevronUp, Calendar,
  ArrowRight, Wallet, Building2, RefreshCw, Eye, Zap, Printer,
} from 'lucide-react';
import Swal from 'sweetalert2';

type Tab = 'overview' | 'pl' | 'analysis' | 'payables' | 'projections' | 'details';

const FINANCIAL_CATEGORIES = [
  'VENTA', 'SEÑA', 'COBRO', 'INSUMOS', 'SERVICIOS', 'MAQUINARIA',
  'SUELDOS', 'ALQUILER', 'IMPUESTOS', 'OTROS',
];

export const FinancialDashboard = memo(() => {
  const { metrics, monthlyTrend, categoryBreakdown, businessUnitBreakdown, agingReceivables, agingPayables, orderPipeline, projections, todayActivity, isLoading: financeLoading, fetchAll } = useFinanceStore();
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();
  const { transactions, fetchTransactions } = useTreasuryStore();
  const { balances: crmBalances, fetchBalances } = useCrmStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('INSUMOS');
  const [txPaymentMethod, setTxPaymentMethod] = useState('EFECTIVO');
  const [txBusinessUnit, setTxBusinessUnit] = useState('GENERAL');
  const [dateRange, setDateRange] = useState<'thisMonth' | 'lastMonth' | 'quarter' | 'year' | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchAll(); fetchAllCatalogs(); fetchTransactions(); fetchBalances(); }, [fetchAll, fetchAllCatalogs, fetchTransactions, fetchBalances]);

  // ===== Date-filtered metrics =====
  const filteredTxs = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      if (dateRange === 'thisMonth') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (dateRange === 'lastMonth') {
        const lm = new Date(now); lm.setMonth(lm.getMonth() - 1);
        return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
      }
      if (dateRange === 'quarter') {
        const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return d >= qStart;
      }
      if (dateRange === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [transactions, dateRange]);

  const filteredStats = useMemo(() => {
    const inc = filteredTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
    const exp = filteredTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income: inc, expenses: exp, net: inc - exp, count: filteredTxs.length };
  }, [filteredTxs]);

  // ===== Month-over-month =====
  const mom = useMemo(() => {
    const now = new Date();
    const thisM = transactions.filter(tx => { const d = new Date(tx.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const lastM = transactions.filter(tx => { const d = new Date(tx.date); const lm = new Date(now); lm.setMonth(lm.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
    const tInc = thisM.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
    const tExp = thisM.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
    const lInc = lastM.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
    const lExp = lastM.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
    return {
      thisIncome: tInc, thisExpenses: tExp, thisNet: tInc - tExp,
      incChange: lInc > 0 ? ((tInc - lInc) / lInc) * 100 : 0,
      expChange: lExp > 0 ? ((tExp - lExp) / lExp) * 100 : 0,
    };
  }, [transactions]);

  // ===== Alerts =====
  const alerts = useMemo(() => {
    const list: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];
    if (metrics.balance < 0) list.push({ type: 'danger', message: `Caja negativa: ${ARS.format(metrics.balance)}` });
    if (metrics.pendingReceivables > metrics.totalIncome * 0.5) list.push({ type: 'warning', message: `Alta cartera: ${ARS.format(metrics.pendingReceivables)} por cobrar` });
    if (orderPipeline.totalCancelled > orderPipeline.totalDelivered * 0.3) list.push({ type: 'warning', message: 'Alta tasa de cancelación de pedidos' });
    if (metrics.pendingPayables > metrics.balance * 0.8 && metrics.balance > 0) list.push({ type: 'danger', message: 'Deudas proveedores casi superan caja disponible' });
    agingReceivables.forEach(b => { if (b.minDays >= 61 && b.amount > 0) list.push({ type: 'warning', message: `Deuda antigua cobro (${b.label}): ${ARS.format(b.amount)}` }); });
    agingPayables.forEach(b => { if (b.minDays >= 31 && b.amount > 0) list.push({ type: 'danger', message: `Deuda proveedor vencida (${b.label}): ${ARS.format(b.amount)}` }); });
    if (todayActivity.income === 0 && todayActivity.expenses === 0) list.push({ type: 'info', message: 'Sin actividad financiera hoy' });
    return list;
  }, [metrics, orderPipeline, agingReceivables, agingPayables, todayActivity]);

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
  const maxMonthly = useMemo(() => Math.max(...monthlyTrend.map(m => Math.max(m.income, m.expenses, m.income - m.expenses)), 1), [monthlyTrend]);

  // ===== P&L =====
  const plData = useMemo(() => {
    const incomeCats = categoryBreakdown.filter(c => c.income > 0).sort((a, b) => b.income - a.income);
    const expenseCats = categoryBreakdown.filter(c => c.expense > 0).sort((a, b) => b.expense - a.expense);
    const totalIncome = incomeCats.reduce((s, c) => s + c.income, 0);
    const totalExpenses = expenseCats.reduce((s, c) => s + c.expense, 0);
    return { incomeCats, expenseCats, totalIncome, totalExpenses, net: totalIncome - totalExpenses };
  }, [categoryBreakdown]);

  // ===== Handlers =====
  const handleExport = useCallback(() => {
    const rows = [
      ['METRICA', 'VALOR'],
      ['Ingresos Totales', metrics.totalIncome], ['Egresos Totales', metrics.totalExpenses],
      ['Saldo Neto', metrics.balance], ['Dinero en Calle', metrics.moneyInStreet],
      ['Deudas Proveedores', metrics.pendingPayables], ['Inversion Stock', metrics.stockCost],
      ['Valor Venta Stock', metrics.stockValue], ['Ganancia Potencial', metrics.projectedProfit],
      ['Margen Promedio', `${metrics.avgMargin.toFixed(1)}%`], ['Patrimonio Total', metrics.patrimonio],
      ['', ''], ['PIPELINE', ''],
      ['Pendientes', `${orderPipeline.countPending} (${ARS.format(orderPipeline.totalPending)})`],
      ['Entregados', `${orderPipeline.countDelivered} (${ARS.format(orderPipeline.totalDelivered)})`],
      ['Cancelados', `${orderPipeline.totalCancelled}`],
      ['Conversion', `${orderPipeline.conversionRate.toFixed(1)}%`],
      ['Senas', ARS.format(orderPipeline.advancePayments)],
      ['', ''], ['P&L', ''],
      ['Ingresos por Categoria', ''], ...plData.incomeCats.map(c => [c.name, c.income]),
      ['Egresos por Categoria', ''], ...plData.expenseCats.map(c => [c.name, c.expense]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `centro_financiero_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [metrics, orderPipeline, plData]);

  const handleRegisterTx = useCallback(async () => {
    if (!txAmount || !txDescription.trim()) return;
    const { addTransaction } = useTreasuryStore.getState();
    try {
      await addTransaction({
        amount: Number(txAmount), description: txDescription.toUpperCase().trim(),
        type: txType, category: txCategory, business_unit: txBusinessUnit,
        payment_method: txPaymentMethod, date: new Date().toISOString(), status: 'COMPLETED',
      });
      setShowTxModal(false); setTxAmount(''); setTxDescription('');
      Swal.fire({ title: txType === 'EXPENSE' ? 'Gasto registrado' : 'Ingreso registrado', icon: 'success', timer: 1200, showConfirmButton: false });
      fetchAll();
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo registrar', 'error');
    }
  }, [txAmount, txDescription, txCategory, txPaymentMethod, txBusinessUnit, txType, fetchAll]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const confColor = (c: string) => c === 'high' ? 'text-emerald-500' : c === 'medium' ? 'text-amber-500' : 'text-red-400';

  const dateLabel = { thisMonth: 'Este Mes', lastMonth: 'Mes Anterior', quarter: 'Trimestre', year: 'Este Año', all: 'Todo' }[dateRange];

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
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300 print:p-0">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Centro Financiero
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Visión 360: Tesorería + P&L + Cuentas + Activos + Proyecciones</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 ${showFilters ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            <Calendar className="w-3 h-3" /> {dateLabel}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Printer className="w-3 h-3" /> Imprimir
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Download className="w-3 h-3" /> CSV
          </button>
          <button onClick={() => { setTxType('INCOME'); setShowTxModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all active:scale-95">
            <TrendingUp className="w-3 h-3" /> Ingreso
          </button>
          <button onClick={() => { setTxType('EXPENSE'); setShowTxModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all active:scale-95">
            <Banknote className="w-3 h-3" /> Gasto
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      {showFilters && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
          {([['all', 'Todo'], ['thisMonth', 'Este Mes'], ['lastMonth', 'Mes Anterior'], ['quarter', 'Trimestre'], ['year', 'Este Año']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setDateRange(key)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
              dateRange === key ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}>{label}</button>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 print:hidden">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${
              alert.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800' :
              alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-800' :
              'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-200 dark:border-blue-800'
            }`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Today Activity Banner */}
      <div className="bg-gradient-to-r from-brand to-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-brand/20 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 p-6 text-7xl opacity-10 font-black italic" aria-hidden="true">Hoy</div>
        <div className="relative z-10 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-300" />
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-200">Actividad de Hoy</span>
          </div>
          <div className="flex gap-5 flex-wrap">
            <div>
              <span className="text-[8px] font-bold text-blue-300 uppercase">Ingresos</span>
              <p className="text-lg font-black tabular-nums">{ARS.format(todayActivity.income)}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-blue-300 uppercase">Egresos</span>
              <p className="text-lg font-black tabular-nums">{ARS.format(todayActivity.expenses)}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-blue-300 uppercase">Neto</span>
              <p className={`text-lg font-black tabular-nums ${todayActivity.income - todayActivity.expenses >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{ARS.format(todayActivity.income - todayActivity.expenses)}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-blue-300 uppercase">Transacciones</span>
              <p className="text-lg font-black tabular-nums">{todayActivity.transactions}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-blue-300 uppercase">Pedidos</span>
              <p className="text-lg font-black tabular-nums">{todayActivity.orders}</p>
            </div>
          </div>
        </div>
      </div>

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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Ingresos', value: ARS.format(filteredStats.income), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: TrendingUp, sub: `${mom.incChange >= 0 ? '+' : ''}${mom.incChange.toFixed(0)}% vs ant.` },
          { label: 'Egresos', value: ARS.format(filteredStats.expenses), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown, sub: `${mom.expChange >= 0 ? '+' : ''}${mom.expChange.toFixed(0)}% vs ant.` },
          { label: 'Neto', value: ARS.format(filteredStats.net), color: filteredStats.net >= 0 ? 'text-blue-600' : 'text-red-600', bg: filteredStats.net >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20', icon: Activity },
          { label: 'Por Cobrar', value: ARS.format(metrics.pendingReceivables), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Clock, sub: `${orderPipeline.countPending} pedidos` },
          { label: 'Por Pagar', value: ARS.format(metrics.pendingPayables), color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: Truck },
          { label: 'Margen Stock', value: `${metrics.avgMargin.toFixed(0)}%`, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Target, sub: ARS.format(metrics.projectedProfit) },
        ].map(({ label, value, color, bg, icon: Icon, sub }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            </div>
            <p className={`text-sm font-black ${color} tabular-nums`}>{value}</p>
            {sub && <p className="text-[8px] text-slate-400 font-medium mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
        {[
          { key: 'overview' as Tab, label: 'Resumen' },
          { key: 'pl' as Tab, label: 'P&L' },
          { key: 'analysis' as Tab, label: 'Análisis' },
          { key: 'payables' as Tab, label: 'Proveedores' },
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
          {/* Monthly Trend with Net Line */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Tendencia Mensual (12 meses)</h3>
            <div className="flex items-end gap-1 h-52">
              {monthlyTrend.map((m, i) => {
                const net = m.income - m.expenses;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-slate-900 text-white text-[8px] font-bold p-2 rounded-lg shadow-xl whitespace-nowrap">
                      <div>{m.label}</div>
                      <div className="text-emerald-400">+{ARS.format(m.income)}</div>
                      <div className="text-red-400">-{ARS.format(m.expenses)}</div>
                      <div className={net >= 0 ? 'text-blue-300' : 'text-red-300'}>= {ARS.format(net)}</div>
                    </div>
                    <div className="w-full flex gap-px items-end" style={{ height: '160px' }}>
                      <div className="flex-1 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-400" style={{ height: `${(m.income / maxMonthly) * 100}%`, minHeight: m.income > 0 ? '2px' : '0' }} />
                      <div className="flex-1 bg-red-400 rounded-t-sm transition-all group-hover:bg-red-300" style={{ height: `${(m.expenses / maxMonthly) * 100}%`, minHeight: m.expenses > 0 ? '2px' : '0' }} />
                    </div>
                    <span className="text-[7px] font-bold text-slate-400 uppercase truncate w-full text-center">{m.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-3">
              <span className="text-[8px] font-bold text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Ingresos</span>
              <span className="text-[8px] font-bold text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> Egresos</span>
            </div>
          </div>

          {/* Quick Stats */}
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
                { label: 'Pendientes', value: orderPipeline.countPending, amount: orderPipeline.totalPending, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50', textColor: 'text-amber-600' },
                { label: 'Entregados', value: orderPipeline.countDelivered, amount: orderPipeline.totalDelivered, bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', textColor: 'text-emerald-600' },
                { label: 'Cancelados', value: orderPipeline.totalCancelled, amount: 0, bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/50', textColor: 'text-red-600' },
                { label: 'Señas', value: 0, amount: orderPipeline.advancePayments, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', textColor: 'text-blue-600' },
                { label: 'Conversión', value: 0, amount: 0, bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800/50', textColor: 'text-purple-600', rate: orderPipeline.conversionRate },
              ].map(item => (
                <div key={item.label} className={`${item.bg} rounded-xl p-3 border ${item.border}`}>
                  <span className={`text-[8px] font-black uppercase ${item.textColor} tracking-widest`}>{item.label}</span>
                  <p className={`text-xl font-black ${item.textColor} tabular-nums mt-1`}>
                    {item.rate !== undefined ? `${item.rate.toFixed(0)}%` : item.value}
                  </p>
                  {item.amount > 0 && <p className="text-[9px] text-slate-400 font-medium">{ARS.format(item.amount)}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== P&L TAB ===== */}
      {activeTab === 'pl' && (
        <div className="space-y-5">
          {/* P&L Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 shadow-sm">
              <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Ingresos Totales</span>
              <p className="text-2xl font-black text-emerald-600 tabular-nums mt-1">{ARS.format(plData.totalIncome)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-5 shadow-sm">
              <span className="text-[8px] font-black uppercase text-red-600 tracking-widest">Egresos Totales</span>
              <p className="text-2xl font-black text-red-600 tabular-nums mt-1">{ARS.format(plData.totalExpenses)}</p>
            </div>
            <div className={`${plData.net >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'} rounded-2xl border p-5 shadow-sm`}>
              <span className={`text-[8px] font-black uppercase tracking-widest ${plData.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Resultado Neto</span>
              <p className={`text-2xl font-black tabular-nums mt-1 ${plData.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{ARS.format(plData.net)}</p>
              <p className="text-[9px] text-slate-400 font-medium mt-1">Margen: {plData.totalIncome > 0 ? ((plData.net / plData.totalIncome) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Income by Category */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Ingresos por Categoría</h3>
              <div className="space-y-3">
                {plData.incomeCats.map(cat => {
                  const width = plData.totalIncome > 0 ? (cat.income / plData.totalIncome) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">{cat.name}</span>
                        <span className="text-[9px] font-black tabular-nums text-emerald-600">{ARS.format(cat.income)}</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
                {plData.incomeCats.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin ingresos registrados</p>}
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Egresos por Categoría</h3>
              <div className="space-y-3">
                {plData.expenseCats.map(cat => {
                  const width = plData.totalExpenses > 0 ? (cat.expense / plData.totalExpenses) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">{cat.name}</span>
                        <span className="text-[9px] font-black tabular-nums text-red-500">{ARS.format(cat.expense)}</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
                {plData.expenseCats.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin egresos registrados</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== ANALYSIS TAB ===== */}
      {activeTab === 'analysis' && (
        <div className="space-y-5">
          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Análisis por Categoría (Neto)</h3>
            <div className="space-y-2">
              {categoryBreakdown.slice(0, 12).map(cat => {
                const maxVal = Math.max(...categoryBreakdown.map(c => Math.abs(c.net)), 1);
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

      {/* ===== PAYABLES TAB ===== */}
      {activeTab === 'payables' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Deudas a Proveedores — Resumen</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-800">
                <span className="text-[8px] font-black uppercase text-rose-500 tracking-widest">Total Pendiente</span>
                <p className="text-xl font-black text-rose-600 tabular-nums mt-1">{ARS.format(metrics.pendingPayables)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Deudas Vencidas</span>
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-1">{ARS.format(agingPayables.filter(b => b.minDays >= 1).reduce((s, b) => s + b.amount, 0))}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Por Vencer (30d)</span>
                <p className="text-xl font-black text-amber-600 tabular-nums mt-1">{ARS.format(agingPayables.find(b => b.minDays === 0)?.amount || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Antigüedad de Deudas Proveedor</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {agingPayables.map(bucket => (
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
                  <p className="text-[9px] text-slate-400 font-medium">{bucket.count} deudas</p>
                </div>
              ))}
            </div>
          </div>

          {/* Net Position */}
          <div className="bg-slate-900 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Posición Neta</div>
            <div className="flex flex-wrap gap-6">
              <div><span className="text-[8px] text-slate-500 font-bold">Por Cobrar:</span> <span className="text-xs font-black text-amber-400">{ARS.format(metrics.pendingReceivables)}</span></div>
              <div><span className="text-[8px] text-slate-500 font-bold">Por Pagar:</span> <span className="text-xs font-black text-red-400">{ARS.format(metrics.pendingPayables)}</span></div>
              <div><span className="text-[8px] text-slate-500 font-bold">Neto:</span> <span className={`text-xs font-black ${(metrics.pendingReceivables - metrics.pendingPayables) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{ARS.format(metrics.pendingReceivables - metrics.pendingPayables)}</span></div>
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
                    <span className={`text-sm font-black tabular-nums ${p.value >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>{ARS.format(p.value)}</span>
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

      {/* ===== TX MODAL ===== */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTxModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase mb-4 text-slate-900 dark:text-white">
              {txType === 'EXPENSE' ? 'Registrar Gasto' : 'Registrar Ingreso'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Monto *</label>
                <input type="number" step="0.01" min="0" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00"
                  className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black outline-none transition-all ${txType === 'EXPENSE' ? 'text-red-500 focus:border-red-500' : 'text-emerald-500 focus:border-emerald-500'}`} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Descripción *</label>
                <input type="text" value={txDescription} onChange={e => setTxDescription(e.target.value)} placeholder="Ej: Pago proveedor, Venta..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Categoría</label>
                  <select value={txCategory} onChange={e => setTxCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-white outline-none">
                    {FINANCIAL_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Método</label>
                  <select value={txPaymentMethod} onChange={e => setTxPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-white outline-none">
                    {['EFECTIVO', 'MERCADO_PAGO', 'BANCO'].map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Unidad de Negocio</label>
                <select value={txBusinessUnit} onChange={e => setTxBusinessUnit(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-white outline-none">
                  {['GENERAL', 'RAÍCES', 'ROJO_SHOWROOM', 'UNIFORMES', 'RJ_CO'].map(u => <option key={u} value={u}>{u.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowTxModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleRegisterTx} disabled={!txAmount || !txDescription.trim()}
                className={`flex-1 text-white py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95 shadow-lg ${
                  txType === 'EXPENSE' ? 'bg-red-500 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'
                }`}>Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

FinancialDashboard.displayName = 'FinancialDashboard';
