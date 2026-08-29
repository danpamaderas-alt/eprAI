import { create } from 'zustand';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore';

export interface FinanceMetrics {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingPayables: number;
  pendingReceivables: number;
  stockCost: number;
  stockValue: number;
  projectedProfit: number;
  avgMargin: number;
  moneyInStreet: number;
  patrimonio: number;
}

export interface MonthlyData {
  month: string;
  label: string;
  income: number;
  expenses: number;
}

export interface CategoryBreakdown {
  name: string;
  income: number;
  expense: number;
  net: number;
}

export interface BusinessUnitBreakdown {
  unit: string;
  income: number;
  expense: number;
  orders: number;
  revenue: number;
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
  count: number;
}

export interface OrderPipeline {
  totalPending: number;
  countPending: number;
  totalDelivered: number;
  countDelivered: number;
  totalCancelled: number;
  advancePayments: number;
  conversionRate: number;
}

export interface Projection {
  label: string;
  value: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DayActivity {
  income: number;
  expenses: number;
  transactions: number;
  orders: number;
}

interface FinanceState {
  metrics: FinanceMetrics;
  monthlyTrend: MonthlyData[];
  categoryBreakdown: CategoryBreakdown[];
  businessUnitBreakdown: BusinessUnitBreakdown[];
  agingReceivables: AgingBucket[];
  agingPayables: AgingBucket[];
  orderPipeline: OrderPipeline;
  projections: Projection[];
  todayActivity: DayActivity;
  isLoading: boolean;
  fetchAll: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  metrics: {
    totalIncome: 0, totalExpenses: 0, balance: 0,
    pendingPayables: 0, pendingReceivables: 0,
    stockCost: 0, stockValue: 0, projectedProfit: 0, avgMargin: 0,
    moneyInStreet: 0, patrimonio: 0,
  },
  monthlyTrend: [],
  categoryBreakdown: [],
  businessUnitBreakdown: [],
  agingReceivables: [],
  agingPayables: [],
  orderPipeline: { totalPending: 0, countPending: 0, totalDelivered: 0, countDelivered: 0, totalCancelled: 0, advancePayments: 0, conversionRate: 0 },
  projections: [],
  todayActivity: { income: 0, expenses: 0, transactions: 0, orders: 0 },
  isLoading: false,

  fetchAll: async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;
    set({ isLoading: true });

    try {
      const [treasuryRes, ordersRes, customersRes, productsRes, inventoryRes, debtsRes] = await Promise.all([
        supabase.from('treasury').select('id, type, amount, date, category, business_unit, payment_method, status').eq('company_id', companyId).order('date', { ascending: false }),
        supabase.from('orders').select('id, total_amount, advance_payment, status, created_at, business_unit, customer_name').eq('company_id', companyId),
        supabase.from('customers').select('id, balance, name').eq('company_id', companyId),
        supabase.from('products').select('id, name, price, cost_price, category').eq('company_id', companyId),
        supabase.from('product_variants').select('id, product_id, stock_quantity, products!inner(id, company_id, name, cost_price, price)').eq('products.company_id', companyId),
        supabase.from('supplier_debts').select('id, amount, paid_amount, due_date, status, supplier_id').eq('company_id', companyId),
      ]);

      const txs = (treasuryRes.data || []) as any[];
      const orders = (ordersRes.data || []) as any[];
      const custs = (customersRes.data || []) as any[];
      const prods = (productsRes.data || []) as any[];
      const inv = (inventoryRes.data || []) as any[];
      const debts = (debtsRes.data || []) as any[];

      // ===== TODAY ACTIVITY =====
      const today = new Date().toISOString().slice(0, 10);
      const todayTxs = txs.filter(tx => tx.date?.startsWith(today));
      const todayOrders = orders.filter(o => o.created_at?.startsWith(today));
      const todayActivity: DayActivity = {
        income: todayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0),
        expenses: todayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0),
        transactions: todayTxs.length,
        orders: todayOrders.length,
      };

      // ===== TREASURY =====
      let income = 0, expenses = 0;
      txs.forEach(tx => {
        if (tx.type === 'INCOME') income += Number(tx.amount || 0);
        if (tx.type === 'EXPENSE') expenses += Number(tx.amount || 0);
      });

      // ===== MONTHLY TREND =====
      const monthlyMap = new Map<string, { income: number; expenses: number }>();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, { income: 0, expenses: 0 });
      }
      txs.forEach(tx => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap.has(key)) {
          const entry = monthlyMap.get(key)!;
          if (tx.type === 'INCOME') entry.income += Number(tx.amount || 0);
          if (tx.type === 'EXPENSE') entry.expenses += Number(tx.amount || 0);
        }
      });
      const monthlyTrend: MonthlyData[] = Array.from(monthlyMap.entries()).map(([key, data]) => {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('es-AR', { month: 'short' });
        return { month: key, label, ...data };
      });

      // ===== CATEGORY BREAKDOWN =====
      const catMap = new Map<string, { income: number; expense: number }>();
      txs.forEach(tx => {
        const cat = tx.category || 'VARIOS';
        if (!catMap.has(cat)) catMap.set(cat, { income: 0, expense: 0 });
        const entry = catMap.get(cat)!;
        if (tx.type === 'INCOME') entry.income += Number(tx.amount || 0);
        if (tx.type === 'EXPENSE') entry.expense += Number(tx.amount || 0);
      });
      const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
        .map(([name, data]) => ({ name, ...data, net: data.income - data.expense }))
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

      // ===== BUSINESS UNIT BREAKDOWN =====
      const buMap = new Map<string, { income: number; expense: number; orders: number; revenue: number }>();
      txs.forEach(tx => {
        const bu = tx.business_unit || 'GENERAL';
        if (!buMap.has(bu)) buMap.set(bu, { income: 0, expense: 0, orders: 0, revenue: 0 });
        const entry = buMap.get(bu)!;
        if (tx.type === 'INCOME') entry.income += Number(tx.amount || 0);
        if (tx.type === 'EXPENSE') entry.expense += Number(tx.amount || 0);
      });
      orders.forEach(o => {
        const bu = o.business_unit || 'GENERAL';
        if (!buMap.has(bu)) buMap.set(bu, { income: 0, expense: 0, orders: 0, revenue: 0 });
        const entry = buMap.get(bu)!;
        entry.orders += 1;
        entry.revenue += Number(o.total_amount || 0);
      });
      const businessUnitBreakdown: BusinessUnitBreakdown[] = Array.from(buMap.entries())
        .map(([unit, data]) => ({ unit, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      // ===== MONEY IN STREET =====
      const moneyInStreet = custs.reduce((acc, c) => {
        const b = Number(c.balance || 0);
        return b > 0 ? acc + b : acc;
      }, 0);

      // ===== STOCK METRICS =====
      const productMap = new Map(prods.map((p: any) => [p.id, p]));
      let stockCost = 0, stockValue = 0;
      inv.forEach((v: any) => {
        const product = productMap.get(v.product_id) || v.products;
        const qty = v.stock_quantity || 0;
        if (product && qty > 0) {
          stockCost += Number(product.cost_price || 0) * qty;
          stockValue += Number(product.price || 0) * qty;
        }
      });
      const projectedProfit = stockValue - stockCost;
      const avgMargin = stockCost > 0 ? (projectedProfit / stockCost) * 100 : 0;

      // ===== ORDER PIPELINE =====
      const pendingOrders = orders.filter((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status));
      const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED');
      const cancelledOrders = orders.filter((o: any) => o.status === 'CANCELLED');
      const totalPending = pendingOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const advancePayments = orders.reduce((s: number, o: any) => s + Number(o.advance_payment || 0), 0);
      const totalDelivered = deliveredOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const totalCancelled = cancelledOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const totalOrders = orders.length;
      const conversionRate = totalOrders > 0 ? (deliveredOrders.length / totalOrders) * 100 : 0;
      const orderPipeline: OrderPipeline = {
        totalPending, countPending: pendingOrders.length,
        totalDelivered, countDelivered: deliveredOrders.length,
        totalCancelled, advancePayments, conversionRate,
      };

      // ===== PENDING RECEIVABLES =====
      const pendingReceivables = pendingOrders.reduce((s: number, o: any) => {
        const total = Number(o.total_amount || 0);
        const advance = Number(o.advance_payment || 0);
        return total > advance ? s + (total - advance) : s;
      }, 0);

      // ===== AGING RECEIVABLES =====
      const now = new Date();
      const agingReceivables: AgingBucket[] = [
        { label: '0-30 días', minDays: 0, maxDays: 30, amount: 0, count: 0 },
        { label: '31-60 días', minDays: 31, maxDays: 60, amount: 0, count: 0 },
        { label: '61-90 días', minDays: 61, maxDays: 90, amount: 0, count: 0 },
        { label: '90+ días', minDays: 91, maxDays: null, amount: 0, count: 0 },
      ];
      pendingOrders.forEach((o: any) => {
        const created = new Date(o.created_at || o.date || now);
        const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        const balance = Number(o.total_amount || 0) - Number(o.advance_payment || 0);
        if (balance <= 0) return;
        const bucket = agingReceivables.find(b => days >= b.minDays && (b.maxDays === null || days <= b.maxDays));
        if (bucket) { bucket.amount += balance; bucket.count += 1; }
      });

      // ===== AGING PAYABLES =====
      const agingPayables: AgingBucket[] = [
        { label: '0-30 días', minDays: 0, maxDays: 30, amount: 0, count: 0 },
        { label: '31-60 días', minDays: 31, maxDays: 60, amount: 0, count: 0 },
        { label: '61-90 días', minDays: 61, maxDays: 90, amount: 0, count: 0 },
        { label: '90+ días', minDays: 91, maxDays: null, amount: 0, count: 0 },
      ];
      const pendingDebts = debts.filter((d: any) => d.status !== 'PAGADA');
      const pendingPayables = pendingDebts.reduce((s: number, d: any) => s + ((Number(d.amount || 0)) - (Number(d.paid_amount || 0))), 0);
      pendingDebts.forEach((d: any) => {
        const due = d.due_date ? new Date(d.due_date) : now;
        const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        const outstanding = Number(d.amount || 0) - Number(d.paid_amount || 0);
        if (outstanding <= 0) return;
        const bucket = agingPayables.find(b => days >= b.minDays && (b.maxDays === null || days <= b.maxDays));
        if (bucket) { bucket.amount += outstanding; bucket.count += 1; }
      });

      // ===== PATRIMONIO =====
      const balance = income - expenses;
      const patrimonio = balance + moneyInStreet + stockCost;

      // ===== PROJECTIONS =====
      const last3Months = monthlyTrend.slice(-3);
      const avgIncome = last3Months.reduce((s, m) => s + m.income, 0) / 3;
      const avgExpenses = last3Months.reduce((s, m) => s + m.expenses, 0) / 3;
      const projections: Projection[] = [
        { label: 'Ingresos Próx. Mes (est.)', value: avgIncome, confidence: 'medium' },
        { label: 'Egresos Próx. Mes (est.)', value: avgExpenses, confidence: 'medium' },
        { label: 'Neto Proyectado', value: avgIncome - avgExpenses, confidence: 'medium' },
        { label: 'Cobro Esperado (Pedidos)', value: pendingReceivables, confidence: 'high' },
        { label: 'Pago Esperado (Proveedores)', value: pendingPayables, confidence: 'high' },
      ];

      set({
        metrics: { totalIncome: income, totalExpenses: expenses, balance, pendingPayables, pendingReceivables, stockCost, stockValue, projectedProfit, avgMargin, moneyInStreet, patrimonio },
        monthlyTrend, categoryBreakdown, businessUnitBreakdown, agingReceivables, agingPayables, orderPipeline, projections, todayActivity,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
      set({ isLoading: false });
    }
  },
}));

useTenantStore.subscribe((state, prev) => {
  if (state.activeCompanyId !== prev.activeCompanyId) {
    useFinanceStore.setState({
      metrics: { totalIncome: 0, totalExpenses: 0, balance: 0, pendingPayables: 0, pendingReceivables: 0, stockCost: 0, stockValue: 0, projectedProfit: 0, avgMargin: 0, moneyInStreet: 0, patrimonio: 0 },
      monthlyTrend: [],
      categoryBreakdown: [],
      businessUnitBreakdown: [],
      agingReceivables: [],
      agingPayables: [],
      orderPipeline: { totalPending: 0, countPending: 0, totalDelivered: 0, countDelivered: 0, totalCancelled: 0, advancePayments: 0, conversionRate: 0 },
      projections: [],
      todayActivity: { income: 0, expenses: 0, transactions: 0, orders: 0 },
      isLoading: false,
    });
  }
});
