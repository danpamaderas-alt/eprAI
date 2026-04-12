import { useEffect, useMemo } from 'react';
import { useOrderStore } from '../../orders/store/useOrderStore';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useNavigate } from 'react-router-dom';

export const HomeDashboard = () => {
  const navigate = useNavigate();
  const { orders, fetchOrders } = useOrderStore();
  // 🧠 Traemos los clientes para ver sus saldos reales
  const { products, customers } = useCatalogStore();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 🧠 Lógica Maestra: Calculamos los números reales del negocio
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Ingresos: Sigue siendo la suma de señas recibidas en pedidos actuales
    const totalIncome = orders.reduce((acc, o) => acc + (o.advancePayment || 0), 0);
    
    // 2. SALDO EN LA CALLE: Suma total de los balances de todas las Cuentas Corrientes
    const totalInStreet = customers.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
    
    return {
      totalIncome,
      totalInStreet,
      urgentCount: orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.dueDate <= today).length,
      partialCount: orders.filter(o => o.status === 'PARTIAL').length,
      pendingCount: orders.filter(o => o.status === 'PENDING').length
    };
  }, [orders, customers]); // ⬅️ IMPORTANTE: Se actualiza si cambian pedidos o clientes

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* ENCABEZADO */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">Panel de Control</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-xs mt-1">Gestión Centralizada Raíces</p>
        </div>
      </header>

      {/* TARJETAS DE DINERO RECONECTADAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CAJA REAL */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingresos (Caja Señas)</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">${stats.totalIncome.toLocaleString('es-AR')}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500 font-bold text-xs">
             <span>↑ Cobros operativos de pedidos</span>
          </div>
        </div>

        {/* SALDO EN LA CALLE REAL (CUENTAS CORRIENTES) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-700 border-l-4 border-l-rose-500">
          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Saldo en la Calle (Ctas. Ctes.)</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">${stats.totalInStreet.toLocaleString('es-AR')}</p>
          <div className="mt-4 flex items-center gap-2 text-rose-400 font-bold text-xs">
             <span>⚠ Deuda total acumulada de clientes</span>
          </div>
        </div>

        {/* STOCK */}
        <div className="bg-slate-900 p-8 rounded-[40px] shadow-xl border border-slate-800">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Artículos en Catálogo</p>
          <p className="text-4xl font-black text-white">{products.length} <span className="text-lg text-slate-500">SKU</span></p>
          <button onClick={() => navigate('/inventario')} className="mt-4 text-xs font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors">Ver Inventario →</button>
        </div>
      </div>

      {/* SECCIÓN CENTRAL: HOJA DE RUTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">Monitoreo de Entregas</h3>
            <button onClick={() => navigate('/pedidos')} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">Ir a Hoja de Ruta</button>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-3xl flex justify-between items-center border transition-all ${stats.urgentCount > 0 ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900/50 animate-pulse' : 'bg-slate-50 border-slate-100 dark:bg-slate-800'}`}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">{stats.urgentCount > 0 ? '🚨' : '✅'}</span>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm">Vencidos / Para Hoy</p>
                  <p className="text-xs text-slate-500">Prioridad de taller</p>
                </div>
              </div>
              <span className={`text-xl font-black ${stats.urgentCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{stats.urgentCount}</span>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-2xl">📦</span>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm">En Proceso (Parcial)</p>
                  <p className="text-xs text-slate-500">Mercadería saliendo</p>
                </div>
              </div>
              <span className="text-xl font-black text-amber-600">{stats.partialCount}</span>
            </div>
          </div>
        </div>

        {/* ÚLTIMOS MOVIMIENTOS */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm">
           <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic mb-8">Actividad Reciente</h3>
           <div className="space-y-6">
              {orders.slice(0, 4).map(o => (
                <div key={o.id} className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700 pb-4">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-none">{o.customerName}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Pedido #{o.id?.substring(0,5)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-500">+ ${o.advancePayment?.toLocaleString('es-AR')}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">SEÑA</p>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-center py-10 text-slate-400 font-bold text-xs uppercase">Sin actividad</p>}
           </div>
        </div>

      </div>
    </div>
  );
};