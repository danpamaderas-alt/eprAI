import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTreasuryStore, type Transaction } from '../treasury/store/useTreasuryStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import Swal from 'sweetalert2';
import {
  Wallet, Pencil, Trash2, Plus, X, Search, Download, ArrowRightLeft,
  Calendar, Filter, TrendingUp, TrendingDown, Building2, DollarSign,
  Clock, CheckCircle, AlertCircle, FileText, RefreshCw, Eye,
} from 'lucide-react';
import { ARS } from '../../../shared/utils/format';

type Tab = 'overview' | 'transactions' | 'transfers';
type DateRange = 'today' | 'week' | 'month' | 'year' | 'all';

const CATEGORIES: Record<string, string[]> = {
  INGRESO: ['VENTA', 'SEÑA', 'COBRO', 'DEVOLUCIÓN', 'OTROS_INGRESOS'],
  EGRESO: ['INSUMOS', 'SERVICIOS', 'MAQUINARIA', 'SUELDOS', 'ALQUILER', 'IMPUESTOS', 'OTROS_EGRESOS'],
  TRANSFERENCIA: ['TRANSFERENCIA'],
};

const BUSINESS_UNITS = ['GENERAL', 'RAICES', 'ROJO_SHOWROOM', 'UNIFORMES', 'RJ_CO'];
const PAYMENT_METHODS = ['EFECTIVO', 'MERCADO_PAGO', 'BANCO'];

function dateInRange(dateStr: string, range: DateRange): boolean {
  if (range === 'all') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'today') return d >= startOfDay;
  if (range === 'week') {
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return d >= startOfWeek;
  }
  if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (range === 'year') return d.getFullYear() === now.getFullYear();
  return true;
}

export const TreasuryDashboard = memo(() => {
  const { transactions, fetchTransactions, addTransaction, updateTransaction, deleteTransaction, transferBetweenAccounts, isLoading } = useTreasuryStore();
  const { balances: crmBalances, fetchBalances } = useCrmStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>('ALL');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('OTROS_EGRESOS');
  const [formBusinessUnit, setFormBusinessUnit] = useState('GENERAL');
  const [formPaymentMethod, setFormPaymentMethod] = useState('EFECTIVO');
  const [formNotes, setFormNotes] = useState('');

  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState('EFECTIVO');
  const [transferTo, setTransferTo] = useState('MERCADO_PAGO');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');

  useEffect(() => { fetchTransactions(); fetchBalances(); }, [fetchTransactions, fetchBalances]);

  // ===== Filtered Data =====
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (!dateInRange(tx.date, dateRange)) return false;
      if (filterType !== 'ALL' && tx.type !== filterType) return false;
      const method = (tx.payment_method || tx.paymentMethod || '').toUpperCase();
      if (filterAccount !== 'ALL' && method !== filterAccount) return false;
      const bu = (tx.business_unit || tx.businessUnit || '').toUpperCase();
      if (filterBusinessUnit !== 'ALL' && bu !== filterBusinessUnit) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!(tx.description || '').toLowerCase().includes(s) && !(tx.category || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [transactions, dateRange, filterType, filterAccount, filterBusinessUnit, searchTerm]);

  // ===== Balances =====
  const accountBalances = useMemo(() => {
    let mp = 0, banco = 0, efectivo = 0, total = 0;
    transactions.forEach(tx => {
      if (tx.status === 'COMPLETED' || !tx.status) {
        const val = tx.type === 'INCOME' ? Number(tx.amount || 0) : -Number(tx.amount || 0);
        total += val;
        const method = (tx.payment_method || tx.paymentMethod || 'EFECTIVO').toUpperCase();
        if (method === 'MERCADO_PAGO') mp += val;
        else if (method === 'BANCO') banco += val;
        else efectivo += val;
      }
    });
    return { mp, banco, efectivo, total };
  }, [transactions]);

  const dineroEnCalle = useMemo(() => crmBalances.reduce((acc, c) => acc + Number(c.balance || 0), 0), [crmBalances]);

  // ===== Period Stats =====
  const periodStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
    return { income, expense, net: income - expense, count: filteredTransactions.length };
  }, [filteredTransactions]);

  // ===== Category Breakdown =====
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filteredTransactions.forEach(tx => {
      const cat = tx.category || 'VARIOS';
      if (!map.has(cat)) map.set(cat, { income: 0, expense: 0 });
      const entry = map.get(cat)!;
      if (tx.type === 'INCOME') entry.income += Number(tx.amount || 0);
      else if (tx.type === 'EXPENSE') entry.expense += Number(tx.amount || 0);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data, total: data.income - data.expense }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 8);
  }, [filteredTransactions]);

  // ===== Monthly Trend (last 6 months) =====
  const monthlyTrend = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-AR', { month: 'short' });
      const monthTx = transactions.filter(tx => {
        const td = new Date(tx.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      months.push({
        label,
        income: monthTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0),
        expense: monthTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0),
      });
    }
    return months;
  }, [transactions]);

  const maxMonthly = useMemo(() => Math.max(...monthlyTrend.map(m => Math.max(m.income, m.expense)), 1), [monthlyTrend]);

  // ===== Form Handlers =====
  const resetForm = useCallback(() => {
    setEditingTx(null); setFormAmount(''); setFormDescription(''); setFormType('EXPENSE');
    setFormCategory('OTROS_EGRESOS'); setFormBusinessUnit('GENERAL'); setFormPaymentMethod('EFECTIVO'); setFormNotes('');
    setIsFormOpen(false);
  }, []);

  const openEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type as 'INCOME' | 'EXPENSE');
    setFormAmount(tx.amount.toString());
    setFormDescription(tx.description || '');
    setFormCategory(tx.category || '');
    setFormBusinessUnit(tx.business_unit || tx.businessUnit || 'GENERAL');
    setFormPaymentMethod(tx.payment_method || tx.paymentMethod || 'EFECTIVO');
    setFormNotes((tx as any).notes || '');
    setIsFormOpen(true);
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formDescription) return;
    try {
      const payload = {
        amount: Number(formAmount),
        description: formDescription.toUpperCase().trim(),
        type: formType,
        category: formCategory,
        business_unit: formBusinessUnit,
        payment_method: formPaymentMethod,
        date: editingTx ? editingTx.date : new Date().toISOString(),
        status: 'COMPLETED',
        notes: formNotes || undefined,
      };
      if (editingTx) {
        await updateTransaction(editingTx.id, payload);
      } else {
        await addTransaction(payload);
      }
      Swal.fire({ title: editingTx ? 'Actualizado' : 'Registrado', icon: 'success', timer: 1200, showConfirmButton: false });
      resetForm();
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo guardar', 'error');
    }
  }, [formAmount, formDescription, formType, formCategory, formBusinessUnit, formPaymentMethod, formNotes, editingTx, addTransaction, updateTransaction, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({ title: '¿Eliminar movimiento?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (result.isConfirmed) {
      await deleteTransaction(id);
      Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1000, showConfirmButton: false });
    }
  }, [deleteTransaction]);

  const handleTransfer = useCallback(async () => {
    if (!transferAmount || Number(transferAmount) <= 0 || transferFrom === transferTo) {
      return Swal.fire('Error', 'Monto inválido o cuentas iguales', 'warning');
    }
    try {
      await transferBetweenAccounts(transferFrom, transferTo, Number(transferAmount), transferDesc.trim() || 'Transferencia entre cuentas');
      setShowTransfer(false); setTransferAmount(''); setTransferDesc('');
      Swal.fire({ title: 'Transferencia realizada', icon: 'success', timer: 1200, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo transferir', 'error');
    }
  }, [transferFrom, transferTo, transferAmount, transferDesc, transferBetweenAccounts]);

  const handleExport = useCallback(() => {
    const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Unidad', 'Cuenta', 'Monto', 'Estado'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString('es-AR'),
      tx.type,
      tx.description,
      tx.category || '',
      tx.business_unit || tx.businessUnit || '',
      tx.payment_method || tx.paymentMethod || '',
      String(tx.amount),
      tx.status || 'COMPLETED',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tesoreria_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [filteredTransactions, dateRange]);

  const accounts = [
    { key: 'EFECTIVO', label: 'Efectivo', color: 'emerald', value: accountBalances.efectivo },
    { key: 'MERCADO_PAGO', label: 'Mercado Pago', color: 'blue', value: accountBalances.mp },
    { key: 'BANCO', label: 'Banco', color: 'slate', value: accountBalances.banco },
  ];

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            Tesorería
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Control de flujo de fondos y disponibilidades</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Download className="w-3 h-3" /> CSV
          </button>
          <button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-600 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all active:scale-95">
            <ArrowRightLeft className="w-3 h-3" /> Transferir
          </button>
          <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95">
            <Plus className="w-3 h-3" /> Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Account Balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3 h-3 text-slate-400" />
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Caja Total</span>
          </div>
          <p className={`text-xl font-black tabular-nums ${accountBalances.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {ARS.format(accountBalances.total)}
          </p>
        </div>
        {accounts.map(acc => (
          <div key={acc.key} className={`bg-${acc.color}-50 dark:bg-${acc.color}-900/20 rounded-2xl border border-${acc.color}-200 dark:border-${acc.color}-800/50 p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className={`w-3 h-3 text-${acc.color}-500`} />
              <span className={`text-[8px] font-black uppercase text-${acc.color}-600 tracking-widest`}>{acc.label}</span>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(acc.value)}</p>
          </div>
        ))}
      </div>

      {/* Money in Street */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest">Dinero en Calle (CRM)</span>
            <p className="text-lg font-black text-amber-700 dark:text-amber-500 tabular-nums">{ARS.format(dineroEnCalle)}</p>
          </div>
        </div>
        <span className="text-[9px] font-bold text-amber-500 uppercase">{crmBalances.length} clientes con saldo</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'overview' as Tab, label: 'Resumen' },
          { key: 'transactions' as Tab, label: 'Movimientos' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            activeTab === tab.key ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}>{tab.label}</button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Period Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Ingresos', value: ARS.format(periodStats.income), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: TrendingUp },
              { label: 'Egresos', value: ARS.format(periodStats.expense), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown },
              { label: 'Neto', value: ARS.format(periodStats.net), color: periodStats.net >= 0 ? 'text-emerald-600' : 'text-red-600', bg: 'bg-slate-50 dark:bg-slate-800', icon: DollarSign },
              { label: 'Movimientos', value: String(periodStats.count), color: 'text-brand', bg: 'bg-brand/5 dark:bg-brand/10', icon: FileText },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3 h-3 ${color}`} />
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
                </div>
                <p className={`text-lg font-black ${color} tabular-nums`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Tendencia Mensual (6 meses)</h3>
            <div className="flex items-end gap-2 h-40">
              {monthlyTrend.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: '120px' }}>
                    <div className="flex-1 bg-emerald-500 rounded-t-md transition-all" style={{ height: `${(m.income / maxMonthly) * 100}%`, minHeight: m.income > 0 ? '4px' : '0' }} />
                    <div className="flex-1 bg-red-400 rounded-t-md transition-all" style={{ height: `${(m.expense / maxMonthly) * 100}%`, minHeight: m.expense > 0 ? '4px' : '0' }} />
                  </div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-3">
              <span className="text-[8px] font-bold text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Ingresos</span>
              <span className="text-[8px] font-bold text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> Egresos</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Top Categorías</h3>
            <div className="space-y-2">
              {categoryBreakdown.map(cat => {
                const maxVal = Math.max(categoryBreakdown[0] ? Math.abs(categoryBreakdown[0].total) : 1, 1);
                const width = (Math.abs(cat.total) / maxVal) * 100;
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 w-24 truncate">{cat.name}</span>
                    <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cat.total >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${width}%` }} />
                    </div>
                    <span className={`text-[9px] font-black tabular-nums w-24 text-right ${cat.total >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {cat.total >= 0 ? '+' : ''}{ARS.format(cat.total)}
                    </span>
                  </div>
                );
              })}
              {categoryBreakdown.length === 0 && (
                <p className="text-center text-slate-400 text-xs font-bold py-4">Sin datos para este período</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TRANSACTIONS TAB ===== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['today', 'week', 'month', 'year', 'all'] as DateRange[]).map(dr => (
                  <button key={dr} onClick={() => setDateRange(dr)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 ${
                    dateRange === dr ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}>
                    {dr === 'today' ? 'Hoy' : dr === 'week' ? 'Semana' : dr === 'month' ? 'Mes' : dr === 'year' ? 'Año' : 'Todo'}
                  </button>
                ))}
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none">
                <option value="ALL">Todos los tipos</option>
                <option value="INCOME">Ingresos</option>
                <option value="EXPENSE">Egresos</option>
              </select>
              <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none">
                <option value="ALL">Todas las cuentas</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
              <select value={filterBusinessUnit} onChange={e => setFilterBusinessUnit(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 outline-none">
                <option value="ALL">Todas las unidades</option>
                {BUSINESS_UNITS.map(b => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Unidad</th>
                    <th className="p-4">Cuenta</th>
                    <th className="p-4 text-right">Monto</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredTransactions.map(tx => {
                    const method = (tx.payment_method || tx.paymentMethod || 'EFECTIVO').replace('_', ' ');
                    const bu = tx.business_unit || tx.businessUnit || 'GENERAL';
                    return (
                      <tr key={tx.id} className="dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                        <td className="p-4 text-xs font-bold text-slate-500">{new Date(tx.date).toLocaleDateString('es-AR')}</td>
                        <td className="p-4">
                          <p className="text-xs font-black uppercase">{tx.description || 'Sin descripción'}</p>
                          {tx.notes && <p className="text-[9px] text-slate-400 mt-0.5">{tx.notes}</p>}
                        </td>
                        <td className="p-4"><span className="text-[8px] font-black bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase">{tx.category || 'VARIOS'}</span></td>
                        <td className="p-4"><span className="text-[8px] font-black text-brand uppercase">{bu}</span></td>
                        <td className="p-4"><span className="text-[9px] font-bold text-slate-500 uppercase">{method}</span></td>
                        <td className={`p-4 text-right font-black tabular-nums text-sm ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'}{ARS.format(Number(tx.amount || 0))}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(tx)} className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 && (
                    <tr><td colSpan={7} className="p-12 text-center">
                      <Wallet className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-xs font-black uppercase text-slate-400">Sin movimientos</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== FORM MODAL ===== */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">{editingTx ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
              <button onClick={resetForm} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Tipo *</label>
                  <select value={formType} onChange={e => setFormType(e.target.value as 'INCOME' | 'EXPENSE')}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-black uppercase outline-none border transition-all ${
                      formType === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800'
                    }`}>
                    <option value="INCOME">INGRESO (+)</option>
                    <option value="EXPENSE">EGRESO (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Monto *</label>
                  <input type="number" step="0.01" min="0" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Descripción *</label>
                <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Ej: Pago proveedor, Venta online..."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Cuenta</label>
                  <select value={formPaymentMethod} onChange={e => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Unidad</label>
                  <select value={formBusinessUnit} onChange={e => setFormBusinessUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                    {BUSINESS_UNITS.map(b => <option key={b} value={b}>{b.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Categoría</label>
                  <select value={formCategory} onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                    {(formType === 'INCOME' ? CATEGORIES.INGRESO : CATEGORIES.EGRESO).map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Notas</label>
                <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Observaciones..." rows={2}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={resetForm} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl text-xs font-black uppercase text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={handleSave} disabled={!formAmount || !formDescription}
                className="flex-1 bg-brand text-white py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-brand/20">
                <CheckCircle className="w-3 h-3 inline mr-1" /> {editingTx ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TRANSFER MODAL ===== */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTransfer(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Transferir entre Cuentas
              </h3>
              <button onClick={() => setShowTransfer(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Desde</label>
                  <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-white outline-none">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="text-center pb-2"><ArrowRightLeft className="w-5 h-5 text-slate-400 mx-auto" /></div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Hacia</label>
                  <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase text-slate-700 dark:text-white outline-none">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Monto *</label>
                <input type="number" min="0" step="0.01" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Descripción</label>
                <input type="text" value={transferDesc} onChange={e => setTransferDesc(e.target.value)} placeholder="Motivo de la transferencia"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowTransfer(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleTransfer} disabled={!transferAmount || Number(transferAmount) <= 0 || transferFrom === transferTo}
                className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-amber-500/20">
                <ArrowRightLeft className="w-3 h-3 inline mr-1" /> Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

TreasuryDashboard.displayName = 'TreasuryDashboard';
