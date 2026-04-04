import { useState, useEffect, useMemo } from 'react';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';
import { useInventoryStore } from '../../inventory/treasury/store/useInventoryStore';

export const HomeDashboard = () => {
  const { transactions, fetchTransactions } = useTreasuryStore();
  const { products, fetchProducts } = useInventoryStore();
  
  // Filtro por unidad de negocio
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, [fetchTransactions, fetchProducts]);

  // Cálculos automáticos usando useMemo para máximo rendimiento
  const { totalIncome, totalExpense, balance, lowStockCount } = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Filtramos por mes actual y por unidad de negocio (si aplica)
    const filteredTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      const isRightUnit = selectedUnit === 'ALL' || t.businessUnit === selectedUnit;
      // Solo tomamos transacciones completadas
      return isCurrentMonth && isRightUnit && t.status === 'COMPLETED';
    });

    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);

    // Stock bajo (este no depende de la unidad de negocio, es general del catálogo)
    const lowStock = products.filter(p => p.stock <= p.minStock).length;

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      lowStockCount: lowStock
    };
  }, [transactions, products, selectedUnit]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      
      {/* CABECERA Y FILTRO */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Resumen Financiero Mensual</p>
        </div>
        
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">Filtro de Negocio</label>
          <select 
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer appearance-none min-w-[200px]"
          >
            <option value="ALL">🌐 TODAS LAS UNIDADES</option>
            <option value="GENERAL">🏠 GENERAL</option>
            <option value="ROJO_SHOWROOM">👗 ROJO SHOWROOM</option>
            <option value="RAICES">🌱 RAÍCES</option>
            <option value="UNIFORMES">👕 UNIFORMES</option>
            <option value="RJ_CO">💼 RJ & CO.</option>
            <option value="BITA_IT">💻 BITA IT</option>
          </select>
        </div>
      </header>

      {/* TARJETAS DE MÉTRICAS (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Ingresos */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-emerald-500/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-lg shadow-sm">📥</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ingresos (Mes)</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalIncome)}</p>
          </div>
        </div>

        {/* Egresos */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-rose-500/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-lg shadow-sm">📤</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Egresos (Mes)</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        {/* Balance Net */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-lg shadow-sm">⚖️</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Balance Neto</h3>
            </div>
            <p className={`text-3xl font-black tracking-tighter ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Alertas de Stock */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-800 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center text-lg shadow-sm">⚠️</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Alertas de Stock</h3>
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">
              {lowStockCount} <span className="text-sm font-medium text-slate-500 tracking-normal uppercase">productos</span>
            </p>
          </div>
        </div>

      </div>

      {/* ÁREA DE GRÁFICOS (Estructura base para el futuro) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-80 flex items-center justify-center relative overflow-hidden">
           <div className="text-center z-10">
              <span className="text-4xl mb-2 block">📈</span>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Espacio reservado para gráfico de curva de ingresos</p>
           </div>
           {/* Decoración de fondo temporal */}
           <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-50 to-transparent"></div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-80 flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Últimos Movimientos</h3>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Lista en construcción</p>
          </div>
        </div>
      </div>

    </div>
  );
};