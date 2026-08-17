import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useOrderStore } from '../../orders/store/useOrderStore';
import { ARS } from '../../../shared/utils/format';
import {
  TrendingUp, TrendingDown, Package, Target, DollarSign,
  Crown, Skull, Activity, Download, AlertTriangle, Clock,
  BarChart3, Zap, Eye, ChevronDown, ChevronUp, Printer,
  Calendar, Layers, ArrowRight,
} from 'lucide-react';

type Tab = 'overview' | 'products' | 'categories' | 'units' | 'channels' | 'treasury';

interface ProductProfit {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  totalValue: number;
  totalCost: number;
  margin: number;
  marginPct: number;
  roi: number;
}

interface CategoryProfit {
  name: string;
  totalValue: number;
  totalCost: number;
  products: number;
  margin: number;
  marginPct: number;
  stock: number;
}

interface UnitProfit {
  unit: string;
  revenue: number;
  cost: number;
  orders: number;
  margin: number;
  marginPct: number;
}

interface ChannelProfit {
  channel: string;
  revenue: number;
  orders: number;
  avgTicket: number;
  margin: number;
}

export const ProfitabilityDashboard = memo(() => {
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();
  const { balances, fetchBalances } = useCrmStore();
  const { transactions, fetchTransactions } = useTreasuryStore();
  const { orders, fetchOrders } = useOrderStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sortField, setSortField] = useState<'marginPct' | 'margin' | 'totalValue' | 'roi'>('marginPct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [dateRange, setDateRange] = useState<'all' | 'thisMonth' | 'quarter' | 'year'>('all');

  useEffect(() => {
    fetchAllCatalogs();
    fetchBalances();
    fetchTransactions();
    fetchOrders();
  }, [fetchAllCatalogs, fetchBalances, fetchTransactions, fetchOrders]);

  // ===== Stock metrics =====
  const stockData = useMemo(() => {
    const productMap = new Map(products.map(p => [p.id, p]));
    const result: ProductProfit[] = [];
    const catMap = new Map<string, { totalValue: number; totalCost: number; products: number; stock: number }>();

    inventory.forEach((v: any) => {
      const product = productMap.get(v.product_id) || v.products;
      if (!product) return;
      const qty = v.stock_quantity || 0;
      const price = Number(product.price || 0);
      const cost = Number(product.cost_price || 0);
      const totalValue = price * qty;
      const totalCost = cost * qty;
      const margin = totalValue - totalCost;
      const marginPct = totalCost > 0 ? (margin / totalCost) * 100 : price > 0 ? 100 : 0;
      const roi = totalCost > 0 ? ((margin / totalCost) * 100) : 0;

      result.push({
        id: product.id, name: product.name, category: product.category || 'SIN CATEGORÍA',
        price, cost, stock: qty, totalValue, totalCost, margin, marginPct, roi,
      });

      const cat = product.category || 'SIN CATEGORÍA';
      if (!catMap.has(cat)) catMap.set(cat, { totalValue: 0, totalCost: 0, products: 0, stock: 0 });
      const catEntry = catMap.get(cat)!;
      catEntry.totalValue += totalValue;
      catEntry.totalCost += totalCost;
      catEntry.stock += qty;
      catEntry.products += 1;
    });

    const categories: CategoryProfit[] = Array.from(catMap.entries()).map(([name, data]) => ({
      name, ...data, margin: data.totalValue - data.totalCost,
      marginPct: data.totalCost > 0 ? ((data.totalValue - data.totalCost) / data.totalCost) * 100 : 0,
    })).sort((a, b) => b.margin - a.margin);

    const totalStockValue = result.reduce((s, p) => s + p.totalValue, 0);
    const totalStockCost = result.reduce((s, p) => s + p.totalCost, 0);
    const totalStockMargin = totalStockValue - totalStockCost;
    const avgMarginPct = totalStockCost > 0 ? (totalStockMargin / totalStockCost) * 100 : 0;

    return { products: result, categories, totalStockValue, totalStockCost, totalStockMargin, avgMarginPct };
  }, [inventory, products]);

  // ===== Date-filtered transactions =====
  const filteredTxs = useMemo(() => {
    const now = new Date();
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      if (dateRange === 'thisMonth') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (dateRange === 'quarter') { const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); return d >= qStart; }
      if (dateRange === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [transactions, dateRange]);

  // ===== Treasury profit =====
  const treasuryProfit = useMemo(() => {
    let income = 0, expenses = 0;
    filteredTxs.forEach(tx => {
      if (tx.type === 'INCOME') income += Number(tx.amount || 0);
      if (tx.type === 'EXPENSE') expenses += Number(tx.amount || 0);
    });
    return { income, expenses, profit: income - expenses, marginPct: income > 0 ? ((income - expenses) / income) * 100 : 0 };
  }, [filteredTxs]);

  // ===== Today profit =====
  const todayProfit = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTxs = filteredTxs.filter(tx => tx.date?.startsWith(today));
    const inc = todayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
    const exp = todayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income: inc, expenses: exp, profit: inc - exp };
  }, [filteredTxs]);

  // ===== Monthly profit trend =====
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number; profit: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, { income: 0, expenses: 0, profit: 0 });
    }
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(key)) {
        const entry = map.get(key)!;
        if (tx.type === 'INCOME') entry.income += Number(tx.amount || 0);
        if (tx.type === 'EXPENSE') entry.expenses += Number(tx.amount || 0);
      }
    });
    return Array.from(map.entries()).map(([key, data]) => {
      const [y, m] = key.split('-');
      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('es-AR', { month: 'short' });
      return { month: key, label, ...data, profit: data.income - data.expenses };
    });
  }, [transactions]);
  const maxMonthly = useMemo(() => Math.max(...monthlyTrend.map(m => Math.max(m.income, m.expenses, Math.abs(m.profit))), 1), [monthlyTrend]);

  // ===== Treasury category breakdown =====
  const treasuryByCategory = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filteredTxs.forEach(tx => {
      const cat = tx.category || 'VARIOS';
      if (!map.has(cat)) map.set(cat, { income: 0, expense: 0 });
      const entry = map.get(cat)!;
      if (tx.type === 'INCOME') entry.income += Number(tx.amount || 0);
      if (tx.type === 'EXPENSE') entry.expense += Number(tx.amount || 0);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data, net: data.income - data.expense, marginPct: data.income > 0 ? ((data.income - data.expense) / data.income) * 100 : 0 }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [filteredTxs]);

  // ===== Business unit profit =====
  const unitData = useMemo(() => {
    const buMap = new Map<string, { revenue: number; cost: number; orders: number }>();
    orders.forEach((o: any) => {
      const bu = o.business_unit || 'GENERAL';
      if (!buMap.has(bu)) buMap.set(bu, { revenue: 0, cost: 0, orders: 0 });
      const entry = buMap.get(bu)!;
      entry.revenue += Number(o.total_amount || 0);
      entry.orders += 1;
      entry.cost += Number(o.advance_payment || 0);
    });
    return Array.from(buMap.entries()).map(([unit, data]) => ({
      unit, ...data, margin: data.revenue - data.cost,
      marginPct: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0,
    })).sort((a, b) => b.margin - a.margin);
  }, [orders]);

  // ===== Channel analysis =====
  const channelData = useMemo(() => {
    const chMap = new Map<string, { revenue: number; orders: number }>();
    orders.forEach((o: any) => {
      let channel = 'DIRECTO';
      const name = (o.customer_name || '').toLowerCase();
      if (name.includes('revendedor') || name.includes('mayorista')) channel = 'MAYORISTA';
      else if (o.business_unit === 'ROJO_SHOWROOM') channel = 'SHOWROOM';
      else if (o.business_unit === 'UNIFORMES') channel = 'UNIFORMES';
      else if (o.business_unit === 'RJ_CO') channel = 'RJ_CO';
      if (!chMap.has(channel)) chMap.set(channel, { revenue: 0, orders: 0 });
      const entry = chMap.get(channel)!;
      entry.revenue += Number(o.total_amount || 0);
      entry.orders += 1;
    });
    return Array.from(chMap.entries()).map(([channel, data]) => ({
      channel, ...data,
      avgTicket: data.orders > 0 ? data.revenue / data.orders : 0,
      margin: data.revenue * 0.35,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // ===== Alerts =====
  const alerts = useMemo(() => {
    const list: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];
    const lowMargin = stockData.products.filter(p => p.marginPct < 10 && p.stock > 0);
    if (lowMargin.length > 0) list.push({ type: 'warning', message: `${lowMargin.length} productos con margen menor al 10%` });
    const deadStock = stockData.products.filter(p => p.stock > 20 && p.marginPct < 5);
    if (deadStock.length > 0) list.push({ type: 'danger', message: `${deadStock.length} productos con stock alto y margen bajo (dead stock potencial)` });
    if (treasuryProfit.profit < 0) list.push({ type: 'danger', message: `Tesorería con pérdida: ${ARS.format(treasuryProfit.profit)}` });
    if (todayProfit.profit < 0) list.push({ type: 'info', message: `Hoy con pérdida: ${ARS.format(todayProfit.profit)}` });
    return list;
  }, [stockData, treasuryProfit, todayProfit]);

  // ===== Sorted products =====
  const sortedProducts = useMemo(() => {
    const sorted = [...stockData.products].sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return (a[sortField] - b[sortField]) * mul;
    });
    return showAllProducts ? sorted : sorted.slice(0, 20);
  }, [stockData.products, sortField, sortDir, showAllProducts]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ===== Export =====
  const handleExport = useCallback(() => {
    const rows: string[][] = [['RENTABILIDAD', '', '', '', '', ''], ['Fecha', new Date().toISOString().slice(0, 10), '', '', '', ''], ['']];
    rows.push(['TESORERÍA', '', '', '', '', '']);
    rows.push(['Ingresos', String(treasuryProfit.income), '', '', '', '']);
    rows.push(['Egresos', String(treasuryProfit.expenses), '', '', '', '']);
    rows.push(['Profit', String(treasuryProfit.profit), '', '', '', '']);
    rows.push(['Margen', `${treasuryProfit.marginPct.toFixed(1)}%`, '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push(['STOCK', '', '', '', '', '']);
    rows.push(['Valor Total', String(stockData.totalStockValue), '', '', '', '']);
    rows.push(['Costo Total', String(stockData.totalStockCost), '', '', '', '']);
    rows.push(['Margen Total', String(stockData.totalStockMargin), '', '', '', '']);
    rows.push(['Margen Promedio', `${stockData.avgMarginPct.toFixed(1)}%`, '', '', '', '']);
    rows.push(['', '', '', '', '', '']);
    rows.push(['PRODUCTOS POR CATEGORÍA', '', 'Valor Venta', 'Costo', 'Margen', 'Margen %']);
    stockData.categories.forEach(c => rows.push([c.name, '', String(c.totalValue), String(c.totalCost), String(c.margin), `${c.marginPct.toFixed(1)}%`]));
    rows.push(['', '', '', '', '', '']);
    rows.push(['UNIDADES DE NEGOCIO', '', 'Facturación', 'Costo', 'Ganancia', 'Margen %']);
    unitData.forEach(u => rows.push([u.unit, '', String(u.revenue), String(u.cost), String(u.margin), `${u.marginPct.toFixed(1)}%`]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rentabilidad_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [treasuryProfit, stockData, unitData]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <div className="w-3 h-3" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  const dateLabel = { all: 'Todo', thisMonth: 'Este Mes', quarter: 'Trimestre', year: 'Este Año' }[dateRange];

  if (stockData.products.length === 0 && orders.length === 0) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-64" />
        <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300 print:p-0">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Rentabilidad
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Márgenes, ROI, tendencia y análisis por producto, categoría y canal</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setDateRange(dateRange === 'all' ? 'thisMonth' : dateRange === 'thisMonth' ? 'quarter' : dateRange === 'quarter' ? 'year' : 'all')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Calendar className="w-3 h-3" /> {dateLabel}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Printer className="w-3 h-3" /> Imprimir
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

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

      {/* Hero Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden print:bg-indigo-600">
        <div className="absolute top-0 right-0 p-8 text-8xl opacity-10 font-black italic" aria-hidden="true">R</div>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase text-indigo-200 tracking-widest mb-2">Resultado del Período</p>
          <h2 className={`text-4xl lg:text-5xl font-black tracking-tighter tabular-nums ${treasuryProfit.profit >= 0 ? 'text-white' : 'text-red-200'}`}>
            {ARS.format(treasuryProfit.profit)}
          </h2>
          <div className="flex flex-wrap gap-6 mt-4">
            <div>
              <span className="text-[8px] font-bold text-indigo-300 uppercase">Ingresos</span>
              <p className="text-lg font-black tabular-nums">{ARS.format(treasuryProfit.income)}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-indigo-300 uppercase">Egresos</span>
              <p className="text-lg font-black tabular-nums">{ARS.format(treasuryProfit.expenses)}</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-indigo-300 uppercase">Margen</span>
              <p className="text-lg font-black tabular-nums">{treasuryProfit.marginPct.toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-[8px] font-bold text-indigo-300 uppercase">Hoy</span>
              <p className={`text-lg font-black tabular-nums ${todayProfit.profit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{ARS.format(todayProfit.profit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Margen Stock', value: ARS.format(stockData.totalStockMargin), color: stockData.totalStockMargin >= 0 ? 'text-emerald-600' : 'text-red-600', bg: stockData.totalStockMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20', icon: TrendingUp },
          { label: '% Margen Prom.', value: `${stockData.avgMarginPct.toFixed(1)}%`, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: Target },
          { label: 'ROI Tesorería', value: `${treasuryProfit.marginPct.toFixed(1)}%`, color: treasuryProfit.marginPct >= 0 ? 'text-blue-600' : 'text-red-600', bg: treasuryProfit.marginPct >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20', icon: Activity },
          { label: 'Productos', value: String(stockData.products.length), color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800', icon: Package },
          { label: 'Stock Total', value: `${stockData.products.reduce((s, p) => s + p.stock, 0)} ud`, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800', icon: Layers },
          { label: 'Pedidos', value: String(unitData.reduce((s, u) => s + u.orders, 0)), color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800', icon: BarChart3 },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            </div>
            <p className={`text-sm font-black ${color} tabular-nums`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Top / Bottom Products Quick View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Top 5 Más Rentables</span>
          </div>
          <div className="space-y-2">
            {[...stockData.products].sort((a, b) => b.marginPct - a.marginPct).slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[8px] font-black text-slate-300 w-4">{i + 1}</span>
                  <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-slate-400 font-bold tabular-nums">{ARS.format(p.margin)}</span>
                  <span className="text-[9px] font-black text-emerald-500 tabular-nums">{p.marginPct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Top 5 Menos Rentables</span>
          </div>
          <div className="space-y-2">
            {[...stockData.products].sort((a, b) => a.marginPct - b.marginPct).slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[8px] font-black text-slate-300 w-4">{i + 1}</span>
                  <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-slate-400 font-bold tabular-nums">{ARS.format(p.margin)}</span>
                  <span className={`text-[9px] font-black tabular-nums ${p.marginPct < 0 ? 'text-red-500' : 'text-amber-500'}`}>{p.marginPct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none print:hidden">
        {[
          { key: 'overview' as Tab, label: 'Resumen' },
          { key: 'products' as Tab, label: 'Productos' },
          { key: 'categories' as Tab, label: 'Categorías' },
          { key: 'units' as Tab, label: 'Unidades' },
          { key: 'channels' as Tab, label: 'Canales' },
          { key: 'treasury' as Tab, label: 'Tesorería' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
            activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}>{tab.label}</button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Monthly Profit Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Tendencia de Profit (12 meses)</h3>
            <div className="flex items-end gap-1 h-48">
              {monthlyTrend.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-slate-900 text-white text-[8px] font-bold p-2 rounded-lg shadow-xl whitespace-nowrap">
                    <div>{m.label}</div>
                    <div className="text-emerald-400">+{ARS.format(m.income)}</div>
                    <div className="text-red-400">-{ARS.format(m.expenses)}</div>
                    <div className={m.profit >= 0 ? 'text-blue-300' : 'text-red-300'}>= {ARS.format(m.profit)}</div>
                  </div>
                  <div className="w-full flex gap-px items-end" style={{ height: '160px' }}>
                    <div className="flex-1 bg-emerald-500 rounded-t-sm transition-all group-hover:bg-emerald-400" style={{ height: `${(m.income / maxMonthly) * 100}%`, minHeight: m.income > 0 ? '2px' : '0' }} />
                    <div className="flex-1 bg-red-400 rounded-t-sm transition-all group-hover:bg-red-300" style={{ height: `${(m.expenses / maxMonthly) * 100}%`, minHeight: m.expenses > 0 ? '2px' : '0' }} />
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

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Package className="w-3 h-3 text-indigo-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Stock Costo</span></div>
              <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(stockData.totalStockCost)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Target className="w-3 h-3 text-blue-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Venta Proyectada</span></div>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">{ARS.format(stockData.totalStockValue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-3 h-3 text-emerald-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Ganancia Potencial</span></div>
              <p className="text-lg font-black text-emerald-600 tabular-nums">{ARS.format(stockData.totalStockMargin)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Activity className="w-3 h-3 text-indigo-500" /><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Margen</span></div>
              <p className="text-lg font-black text-indigo-600 tabular-nums">{stockData.avgMarginPct.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== PRODUCTS TAB ===== */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => toggleSort('marginPct')}>
                    <span className="flex items-center justify-end gap-1">Margen <SortIcon field="marginPct" /></span>
                  </th>
                  <th className="p-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => toggleSort('roi')}>
                    <span className="flex items-center justify-end gap-1">ROI <SortIcon field="roi" /></span>
                  </th>
                  <th className="p-3 text-right">Precio</th>
                  <th className="p-3 text-right">Costo</th>
                  <th className="p-3 text-right">Stock</th>
                  <th className="p-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => toggleSort('totalValue')}>
                    <span className="flex items-center justify-end gap-1">Valor Venta <SortIcon field="totalValue" /></span>
                  </th>
                  <th className="p-3 text-right cursor-pointer hover:text-indigo-500" onClick={() => toggleSort('margin')}>
                    <span className="flex items-center justify-end gap-1">Ganancia <SortIcon field="margin" /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {sortedProducts.map(p => (
                  <tr key={p.id} className="dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-3 font-black truncate max-w-[160px]">{p.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[8px] font-black uppercase">{p.category}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        p.marginPct >= 50 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        p.marginPct >= 20 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                        p.marginPct >= 0 ? 'bg-slate-100 text-slate-500 dark:bg-slate-700' :
                        'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{p.marginPct.toFixed(1)}%</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`text-[9px] font-black tabular-nums ${p.roi >= 30 ? 'text-emerald-500' : p.roi >= 10 ? 'text-amber-500' : 'text-red-400'}`}>
                        {p.roi.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums">{ARS.format(p.price)}</td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-500">{ARS.format(p.cost)}</td>
                    <td className="p-3 text-right font-bold tabular-nums">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                        p.stock > 10 ? 'bg-emerald-100 text-emerald-600' : p.stock > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                      }`}>{p.stock}</span>
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums">{ARS.format(p.totalValue)}</td>
                    <td className={`p-3 text-right font-black tabular-nums ${p.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{ARS.format(p.margin)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                <tr className="text-xs">
                  <td className="p-3 font-black uppercase" colSpan={2}>Total</td>
                  <td className="p-3 text-right font-black text-indigo-600">{stockData.avgMarginPct.toFixed(1)}%</td>
                  <td className="p-3" /><td className="p-3" /><td className="p-3" />
                  <td className="p-3 text-right font-black tabular-nums">{stockData.products.reduce((s, p) => s + p.stock, 0)}</td>
                  <td className="p-3 text-right font-black tabular-nums">{ARS.format(stockData.totalStockValue)}</td>
                  <td className={`p-3 text-right font-black tabular-nums ${stockData.totalStockMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{ARS.format(stockData.totalStockMargin)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {stockData.products.length > 20 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center">
              <button onClick={() => setShowAllProducts(!showAllProducts)} className="text-[10px] font-black uppercase text-indigo-500 hover:text-indigo-600 transition-colors">
                {showAllProducts ? 'Mostrar menos' : `Ver todos (${stockData.products.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== CATEGORIES TAB ===== */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Margen por Categoría</h3>
            <div className="space-y-3">
              {stockData.categories.map(cat => {
                const maxVal = Math.max(...stockData.categories.map(c => c.totalValue), 1);
                const width = (cat.totalValue / maxVal) * 100;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">{cat.name}</span>
                        <span className="text-[8px] text-slate-400 font-bold">{cat.products} productos</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black ${cat.marginPct >= 30 ? 'text-emerald-500' : cat.marginPct >= 10 ? 'text-amber-500' : 'text-red-400'}`}>{cat.marginPct.toFixed(1)}%</span>
                        <span className="text-[9px] font-bold text-slate-500 tabular-nums">{ARS.format(cat.margin)}</span>
                      </div>
                    </div>
                    <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div className="h-full bg-indigo-500 rounded-l-full transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <tr><th className="p-3">Categoría</th><th className="p-3 text-center">Productos</th><th className="p-3 text-center">Stock</th><th className="p-3 text-right">Valor Venta</th><th className="p-3 text-right">Costo</th><th className="p-3 text-right">Ganancia</th><th className="p-3 text-right">Margen</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {stockData.categories.map(cat => (
                    <tr key={cat.name} className="dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 font-black uppercase">{cat.name}</td>
                      <td className="p-3 text-center font-bold">{cat.products}</td>
                      <td className="p-3 text-center font-bold">{cat.stock}</td>
                      <td className="p-3 text-right font-bold tabular-nums">{ARS.format(cat.totalValue)}</td>
                      <td className="p-3 text-right font-bold tabular-nums text-slate-500">{ARS.format(cat.totalCost)}</td>
                      <td className={`p-3 text-right font-black tabular-nums ${cat.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{ARS.format(cat.margin)}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          cat.marginPct >= 50 ? 'bg-emerald-100 text-emerald-600' : cat.marginPct >= 20 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                        }`}>{cat.marginPct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== UNITS TAB ===== */}
      {activeTab === 'units' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <tr><th className="p-3">Unidad</th><th className="p-3 text-center">Pedidos</th><th className="p-3 text-right">Facturación</th><th className="p-3 text-right">Costo (Señas)</th><th className="p-3 text-right">Ganancia</th><th className="p-3 text-right">Margen</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {unitData.map(u => (
                  <tr key={u.unit} className="dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-3 font-black uppercase">{u.unit.replace('_', ' ')}</td>
                    <td className="p-3 text-center font-bold">{u.orders}</td>
                    <td className="p-3 text-right font-bold tabular-nums">{ARS.format(u.revenue)}</td>
                    <td className="p-3 text-right font-bold tabular-nums text-slate-500">{ARS.format(u.cost)}</td>
                    <td className={`p-3 text-right font-black tabular-nums ${u.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{ARS.format(u.margin)}</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        u.marginPct >= 50 ? 'bg-emerald-100 text-emerald-600' : u.marginPct >= 20 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>{u.marginPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                <tr className="text-xs">
                  <td className="p-3 font-black uppercase">Total</td>
                  <td className="p-3 text-center font-black">{unitData.reduce((s, u) => s + u.orders, 0)}</td>
                  <td className="p-3 text-right font-black tabular-nums">{ARS.format(unitData.reduce((s, u) => s + u.revenue, 0))}</td>
                  <td className="p-3 text-right font-black tabular-nums">{ARS.format(unitData.reduce((s, u) => s + u.cost, 0))}</td>
                  <td className="p-3 text-right font-black tabular-nums text-emerald-600">{ARS.format(unitData.reduce((s, u) => s + u.margin, 0))}</td>
                  <td className="p-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ===== CHANNELS TAB ===== */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {channelData.map(ch => (
            <div key={ch.channel} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{ch.channel}</span>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded text-[8px] font-black">{ch.orders} pedidos</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[8px] text-slate-400 font-bold uppercase">Facturación</span>
                  <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(ch.revenue)}</p>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-bold uppercase">Ticket Prom.</span>
                  <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(ch.avgTicket)}</p>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 font-bold uppercase">Ganancia Est.</span>
                  <p className="text-sm font-black text-emerald-600 tabular-nums">{ARS.format(ch.margin)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== TREASURY TAB ===== */}
      {activeTab === 'treasury' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5 shadow-sm">
              <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">Ingresos</span>
              <p className="text-2xl font-black text-emerald-600 tabular-nums mt-1">{ARS.format(treasuryProfit.income)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-5 shadow-sm">
              <span className="text-[8px] font-black uppercase text-red-600 tracking-widest">Egresos</span>
              <p className="text-2xl font-black text-red-600 tabular-nums mt-1">{ARS.format(treasuryProfit.expenses)}</p>
            </div>
            <div className={`${treasuryProfit.profit >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'} rounded-2xl border p-5 shadow-sm`}>
              <span className={`text-[8px] font-black uppercase tracking-widest ${treasuryProfit.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Resultado Neto</span>
              <p className={`text-2xl font-black tabular-nums mt-1 ${treasuryProfit.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{ARS.format(treasuryProfit.profit)}</p>
              <p className="text-[9px] text-slate-400 font-medium mt-1">Margen: {treasuryProfit.marginPct.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Profit por Categoría de Tesorería</h3>
            <div className="space-y-3">
              {treasuryByCategory.slice(0, 10).map(cat => {
                const maxVal = Math.max(...treasuryByCategory.map(c => Math.abs(c.net)), 1);
                const width = (Math.abs(cat.net) / maxVal) * 100;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black ${cat.marginPct >= 30 ? 'text-emerald-500' : cat.marginPct >= 0 ? 'text-amber-500' : 'text-red-400'}`}>{cat.marginPct.toFixed(1)}%</span>
                        <span className={`text-[9px] font-black tabular-nums ${cat.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{cat.net >= 0 ? '+' : ''}{ARS.format(cat.net)}</span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cat.net >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ProfitabilityDashboard.displayName = 'ProfitabilityDashboard';
