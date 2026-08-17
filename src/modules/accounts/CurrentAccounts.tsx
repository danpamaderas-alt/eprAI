import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useCrmStore } from "../crm/store/useCrmStore";
import Swal from "sweetalert2";
import { X, Search, Download, Clock, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { ARS } from '../../shared/utils/format';
import { Spinner } from '../../shared/components/ui/Spinner';

interface CustomerBalance {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cuit?: string;
  type?: string;
  balance: number;
  total_debt?: number;
  total_paid?: number;
  last_movement_date?: string;
  movements?: any[];
}

type FilterType = 'all' | 'debtors' | 'creditors' | 'settled';

export const CurrentAccounts = memo(() => {
  const { balances, isLoading, fetchBalances, addMovement } = useCrmStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBalance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [formParams, setFormParams] = useState({
    movement_type: "PAGO" as "PAGO" | "CARGO",
    amount: "",
    description: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => fetchBalances(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchBalances]);

  // ===== Summary Stats =====
  const stats = useMemo(() => {
    const debtors = balances.filter(b => (b.balance || 0) > 0);
    const creditors = balances.filter(b => (b.balance || 0) < 0);
    const settled = balances.filter(b => (b.balance || 0) === 0);
    const totalDebt = debtors.reduce((s, b) => s + (b.balance || 0), 0);
    const totalCredit = Math.abs(creditors.reduce((s, b) => s + (b.balance || 0), 0));
    const net = totalDebt - totalCredit;
    return { debtors: debtors.length, creditors: creditors.length, settled: settled.length, totalDebt, totalCredit, net, total: balances.length };
  }, [balances]);

  // ===== Filtered balances =====
  const filteredBalances = useMemo(() => {
    return balances.filter(b => {
      const bal = b.balance || 0;
      if (filterType === 'debtors') return bal > 0;
      if (filterType === 'creditors') return bal < 0;
      if (filterType === 'settled') return bal === 0;
      return true;
    });
  }, [balances, filterType]);

  // ===== Aging Analysis =====
  const agingData = useMemo(() => {
    const now = new Date();
    const buckets = [
      { label: '0-30 días', minDays: 0, maxDays: 30, amount: 0, count: 0 },
      { label: '31-60 días', minDays: 31, maxDays: 60, amount: 0, count: 0 },
      { label: '61-90 días', minDays: 61, maxDays: 90, amount: 0, count: 0 },
      { label: '90+ días', minDays: 91, maxDays: null, amount: 0, count: 0 },
    ];
    balances.forEach(b => {
      if ((b.balance || 0) <= 0) return;
      const lastDate = b.last_movement_date ? new Date(b.last_movement_date) : now;
      const days = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = buckets.find(bt => days >= bt.minDays && (bt.maxDays === null || days <= bt.maxDays));
      if (bucket) { bucket.amount += b.balance || 0; bucket.count += 1; }
    });
    return buckets;
  }, [balances]);

  // ===== Export =====
  const handleExport = useCallback(() => {
    const rows = [['CLIENTE', 'TELEFONO', 'EMAIL', 'TIPO', 'SALDO', 'ESTADO']];
    balances.forEach(b => {
      const bal = b.balance || 0;
      const status = bal > 0 ? 'Deudor' : bal < 0 ? 'A favor' : 'Al día';
      rows.push([b.name || '', b.phone || '', b.email || '', b.type || '', String(bal), status]);
    });
    rows.push(['', '', '', '', '', '']);
    rows.push(['RESUMEN', '', '', '', '', '']);
    rows.push([`Deudores: ${stats.debtors}`, '', '', '', ARS.format(stats.totalDebt), '']);
    rows.push([`A favor: ${stats.creditors}`, '', '', '', ARS.format(stats.totalCredit), '']);
    rows.push([`Neto:`, '', '', '', ARS.format(stats.net), '']);
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cuentas_corrientes_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [balances, stats]);

  // ===== Handlers =====
  const handleOpenModal = (customer: CustomerBalance) => {
    setSelectedCustomer(customer);
    setFormParams({ movement_type: "PAGO", amount: "", description: "" });
    setIsModalOpen(true);
  };

  const handleSaveMovement = useCallback(async () => {
    const amountVal = Number.parseFloat(formParams.amount);
    if (!selectedCustomer || Number.isNaN(amountVal) || amountVal <= 0 || !formParams.description.trim()) {
      Swal.fire({ icon: "warning", title: "Datos inválidos", text: "Verifica el monto y el concepto." });
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await addMovement({
        customer_id: selectedCustomer.id,
        amount: amountVal,
        movement_type: formParams.movement_type,
        description: formParams.description.trim(),
        date: new Date().toISOString(),
      });
      if (success) {
        Swal.fire({ toast: true, icon: "success", title: "Movimiento Registrado", position: "top-end", showConfirmButton: false, timer: 1500 });
        setIsModalOpen(false);
        fetchBalances(searchTerm);
      } else throw new Error("Rechazo de servidor");
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo registrar la operación." });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCustomer, formParams, addMovement, fetchBalances, searchTerm]);

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Cuentas Corrientes
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Saldos, movimientos y antigüedad de deudas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Download className="w-3 h-3" /> Exportar
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Clientes', value: String(stats.total), color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800' },
          { label: 'Deudores', value: String(stats.debtors), sub: ARS.format(stats.totalDebt), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertTriangle },
          { label: 'A Favor', value: String(stats.creditors), sub: ARS.format(stats.totalCredit), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: TrendingDown },
          { label: 'Saldo Neto', value: ARS.format(stats.net), color: stats.net >= 0 ? 'text-blue-600' : 'text-red-600', bg: stats.net >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20', icon: TrendingUp },
        ].map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className={`w-3 h-3 ${color}`} />}
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            </div>
            <p className={`text-lg font-black ${color} tabular-nums`}>{value}</p>
            {sub && <p className="text-[9px] text-slate-400 font-medium">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Aging Receivables */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Antigüedad de Deudas</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {agingData.map(bucket => (
            <div key={bucket.label} className={`rounded-xl p-3 border ${
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
              <p className="text-[9px] text-slate-400 font-medium">{bucket.count} clientes</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre, teléfono, CUIT, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-emerald-500 transition-all" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { key: 'all' as FilterType, label: 'Todos' },
            { key: 'debtors' as FilterType, label: 'Deudores' },
            { key: 'creditors' as FilterType, label: 'A Favor' },
            { key: 'settled' as FilterType, label: 'Al Día' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
              filterType === f.key ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-slate-400 italic"><Spinner size="sm" className="mx-auto" /></div>
        ) : filteredBalances.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 text-xs font-bold">No se encontraron clientes</div>
        ) : (
          filteredBalances.map(b => {
            const balance = b.balance || 0;
            const isExpanded = expandedCard === b.id;
            return (
              <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <button onClick={() => handleOpenModal(b)} className="w-full p-4 text-left">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-sm text-slate-800 dark:text-white truncate">{b.name}</h4>
                      {b.phone && <p className="text-[9px] text-slate-400 font-medium">{b.phone}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex-shrink-0 ml-2 ${
                      balance > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                      balance < 0 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>{balance > 0 ? 'Deudor' : balance < 0 ? 'A favor' : 'Al día'}</span>
                  </div>
                  <p className={`text-2xl font-black tracking-tighter ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                    {ARS.format(balance)}
                  </p>
                </button>

                {/* Expand/Collapse detail */}
                <div className="px-4 pb-3">
                  <button onClick={() => setExpandedCard(isExpanded ? null : b.id)} className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">
                    Detalle {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-1 text-[9px] font-medium text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-2">
                      {b.email && <p>Email: {b.email}</p>}
                      {b.cuit && <p>CUIT: {b.cuit}</p>}
                      {b.type && <p>Tipo: {b.type}</p>}
                      {b.total_debt !== undefined && <p>Total adeudado: {ARS.format(b.total_debt)}</p>}
                      {b.total_paid !== undefined && <p>Total pagado: {ARS.format(b.total_paid)}</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Movement Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-sm font-black uppercase dark:text-white">Registrar Movimiento</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedCustomer.name}</p>
                <p className={`text-lg font-black tabular-nums mt-1 ${(selectedCustomer.balance || 0) >= 0 ? 'text-slate-900 dark:text-white' : 'text-emerald-600'}`}>
                  Saldo actual: {ARS.format(selectedCustomer.balance || 0)}
                </p>
              </div>
              {!isSubmitting && (
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(["PAGO", "CARGO"] as const).map(t => (
                  <button key={t} onClick={() => setFormParams(p => ({ ...p, movement_type: t }))} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${
                    formParams.movement_type === t ? (t === 'PAGO' ? 'bg-emerald-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md') : 'text-slate-500 hover:text-slate-700'
                  }`}>{t === 'PAGO' ? 'Recibí Dinero (+)' : 'Sumar Deuda (-)'}</button>
                ))}
              </div>
              <input type="number" step="0.01" min="0" placeholder="Monto $" value={formParams.amount} onChange={e => setFormParams(p => ({ ...p, amount: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-all" />
              <input type="text" placeholder="Concepto del movimiento..." value={formParams.description} onChange={e => setFormParams(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-emerald-500 transition-all uppercase" />
              <button disabled={isSubmitting} onClick={handleSaveMovement}
                className={`w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-black uppercase transition-all ${isSubmitting ? 'opacity-50' : 'hover:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-500/20'}`}>
                {isSubmitting ? <Spinner size="sm" className="text-white mx-auto" /> : 'Confirmar Operación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CurrentAccounts.displayName = "CurrentAccounts";
