import { useEffect, useMemo } from 'react';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';
import { useInventoryStore } from '../../inventory/treasury/store/useInventoryStore';
import { Link } from 'react-router-dom';

export const HomeDashboard = () => {
  const { transactions, fetchTransactions, isLoading: loadingTreasury } = useTreasuryStore();
  const { products, fetchProducts, isLoading: loadingInventory } = useInventoryStore();

  // Cargamos los datos al abrir el panel
  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, [fetchTransactions, fetchProducts]);

  // Cálculos rápidos para las tarjetas
  const { liquidezTotal, ingresosMes } = useMemo(() => {
    let liquidez = 0;
    let ingresos = 0;
    const mesActual = new Date().getMonth();

    transactions.forEach(tx => {
      const isIncome = tx.type === 'INCOME';
      const txDate = new Date(tx.date);
      
      // Sumamos a la liquidez si está completado
      if (tx.status === 'COMPLETED') {
        liquidez += tx.amount * (isIncome ? 1 : -1);
      }

      // Sumamos a los ingresos del mes
      if (isIncome && txDate.getMonth() === mesActual && tx.status === 'COMPLETED') {
        ingresos += tx.amount;
      }
    });

    return { liquidezTotal: liquidez, ingresosMes: ingresos };
  }, [transactions]);

  const valorInventario = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.price) * Number(p.stock)), 0);
  }, [products]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const isLoading = loadingTreasury || loadingInventory;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Control General</h1>
          <p className="text-slate-500 text-sm mt-1">Resumen operativo y financiero de tus unidades de negocio.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
          <p className="font-bold uppercase tracking-widest text-sm">Recopilando métricas...</p>
        </div>
      ) : (
        <>
          {/* TARJETAS DE MÉTRICAS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg text-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Liquidez Total</p>
              <h3 className="text-4xl font-black">{formatCurrency(liquidezTotal)}</h3>
              <p className="text-xs text-slate-400 mt-2">Dinero disponible en todas las cuentas</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Ingresos del Mes</p>
                  <h3 className="text-3xl font-black text-slate-800">{formatCurrency(ingresosMes)}</h3>
                </div>
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">📈</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Capital en Stock</p>
                  <h3 className="text-3xl font-black text-slate-800">{formatCurrency(valorInventario)}</h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">📦</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ÚLTIMOS MOVIMIENTOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Últimos Movimientos</h2>
                <Link to="/tesoreria" className="text-xs font-bold text-blue-600 hover:text-blue-800">Ver todo →</Link>
              </div>
              <div className="p-5 space-y-4">
                {transactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tx.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {tx.type === 'INCOME' ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{tx.concept}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.businessUnit.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <p className={`font-black ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
                {transactions.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay movimientos recientes.</p>}
              </div>
            </div>

            {/* ACCESOS RÁPIDOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Accesos Rápidos</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <Link to="/ventas" className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors group">
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">💰</span>
                  <span className="font-bold text-blue-800 text-sm">Nueva Venta</span>
                </Link>
                <Link to="/tesoreria" className="flex flex-col items-center justify-center p-6 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors group">
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏦</span>
                  <span className="font-bold text-emerald-800 text-sm">Registrar Gasto</span>
                </Link>
                <Link to="/inventario" className="flex flex-col items-center justify-center p-6 bg-amber-50 rounded-xl border border-amber-100 hover:bg-amber-100 transition-colors group">
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">📦</span>
                  <span className="font-bold text-amber-800 text-sm">Cargar Stock</span>
                </Link>
                <Link to="/revendedores" className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors group">
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🚚</span>
                  <span className="font-bold text-purple-800 text-sm">Revendedores</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};