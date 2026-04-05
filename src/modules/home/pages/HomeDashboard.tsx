import { useState, useEffect, useMemo } from 'react';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';
import { useInventoryStore } from '../../inventory/treasury/store/useInventoryStore';

// OPTIMIZACIÓN CRÍTICA: Instancia extraída fuera del render. Se crea una sola vez en la memoria.
const ARS_FORMATTER = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

const formatCurrency = (val: number): string => ARS_FORMATTER.format(val);

export const HomeDashboard = () => {
  const { transactions, fetchTransactions } = useTreasuryStore();
  const { products, fetchProducts } = useInventoryStore();
  
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, [fetchTransactions, fetchProducts]);

  // Procesamiento altamente optimizado en una sola pasada O(n)
  const { totalIncome, totalExpense, balance, lowStockCount, recentTransactions } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const recent = [];
    
    // CRÍTICO: Evaluación basada en UTC estricto. Evita desfases por zona horaria.
    // Asume que la base de datos envía formato ISO 'YYYY-MM-DDTHH:mm:ss.sssZ'
    const currentYearMonth = new Date().toISOString().substring(0, 7); 

    // 1. Cálculo unificado de transacciones (O(n) - 1 Pasada)
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];

      // Almacenamos recientes sin importar filtro (Asume orden DESC desde DB)
      if (recent.length < 5) {
        recent.push(t);
      }

      // Filtro de estado y unidad de negocio
      if (t.status !== 'COMPLETED') continue;
      if (selectedUnit !== 'ALL' && t.businessUnit !== selectedUnit) continue;

      // Filtro de fecha ultrarrápido (Evita asignar memoria con 'new Date()')
      if (!t.date.startsWith(currentYearMonth)) continue;

      const amount = Number(t.amount) || 0;
      if (t.type === 'INCOME') {
        income += amount;
      } else if (t.type === 'EXPENSE') {
        expense += amount;
      }
    }

    // 2. Cálculo unificado de stock (O(n) - 1 Pasada)
    let lowStock = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if ((Number(p.stock) || 0) <= (Number(p.minStock) || 0)) {
        lowStock++;
      }
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      lowStockCount: lowStock,
      recentTransactions: recent
    };
  }, [transactions, products, selectedUnit]);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Resumen Financiero Mensual</p>
        </div>
        
        <div className="flex flex-col space-y-1">
          <label htmlFor="business-unit-filter" className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">
            Filtro de Negocio
          </label>
          <select 
            id="business-unit-filter"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-emerald-500/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500" aria-hidden="true"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-lg shadow-sm" aria-hidden="true">📥</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ingresos (Mes)</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalIncome)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-rose-500/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full group-hover:scale-150 transition-transform duration-500" aria-hidden="true"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-lg shadow-sm" aria-hidden="true">📤</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Egresos (Mes)</h3>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500" aria-hidden="true"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-lg shadow-sm" aria-hidden="true">⚖️</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Balance Neto</h3>
            </div>
            <p className={`text-3xl font-black tracking-tighter ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-800 rounded-full group-hover:scale-150 transition-transform duration-500" aria-hidden="true"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center text-lg shadow-sm" aria-hidden="true">⚠️</div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Alertas de Stock</h3>
            </div>
            <p className="text-3xl font-black text-white tracking-tighter">
              {lowStockCount} <span className="text-sm font-medium text-slate-500 tracking-normal uppercase">productos</span>
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm min-h-[320px] flex items-center justify-center relative overflow-hidden">
           <div className="text-center z-10">
              <span className="text-4xl mb-2 block" aria-hidden="true">📈</span>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Espacio reservado para gráfico de ingresos</p>
           </div>
           <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none"></div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm min-h-[320px] flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Últimos Movimientos</h3>
          
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
            {recentTransactions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Sin movimientos</p>
              </div>
            ) : (
              recentTransactions.map(t => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                  <div className="flex-1 truncate pr-3">
                    <p className="text-[11px] font-bold text-slate-800 truncate" title={t.description}>{t.description}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{t.category}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className={`text-xs font-black tabular-nums ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'EXPENSE' ? '- ' : ''}{formatCurrency(Number(t.amount) || 0)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};