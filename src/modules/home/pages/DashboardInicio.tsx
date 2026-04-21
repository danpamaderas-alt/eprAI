import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';

export const DashboardInicio = () => {
  // 🧠 TRAEMOS LOS CEREBROS DE TODA LA APP
  const { inventory, fetchAllCatalogs } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore();
  const { transactions, fetchTransactions } = useTreasuryStore();

  const [pedidosPendientes, setPedidosPendientes] = useState(0);

  // Al abrir la pantalla, actualizamos todos los datos en silencio
  useEffect(() => {
    fetchAllCatalogs();
    fetchCustomers();
    fetchTransactions();

    // Buscamos directamente a la base de datos cuántos pedidos están pendientes
    const fetchPedidos = async () => {
      try {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        setPedidosPendientes(count || 0);
      } catch (error) {
        console.error("Error cargando pedidos:", error);
      }
    };
    fetchPedidos();
  }, [fetchAllCatalogs, fetchCustomers, fetchTransactions]);

  // 🧮 CÁLCULOS MATEMÁTICOS REALES

  // 1. Clientes reales en tu CRM
  const totalClientes = customers ? customers.length : 0;

  // 2. Stock real (Suma de todas las prendas que tengan cantidad > 0)
  const totalStock = inventory ? inventory.reduce((sum, item) => sum + (item.stock_quantity > 0 ? item.stock_quantity : 0), 0) : 0;

  // 3. Ingresos REALES de este mes (Suma todo lo que entró a Tesorería en el mes actual)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const ingresosMes = transactions ? transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === 'INCOME' && txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    })
    .reduce((sum, tx) => sum + tx.amount, 0) : 0;

  // Formateador de moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* CABECERA GIGANTE */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
          <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l7.5 13.5h-15L12 6.5z"/></svg>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tighter mb-2">¡Hola, Jorge! 👋</h1>
          <p className="text-blue-100 font-medium text-lg">Aquí tienes el resumen REAL de Raíces al día de hoy.</p>
        </div>
      </header>

      {/* TARJETAS DE MÉTRICAS (KPIs) CON DATOS REALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform">💰</div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Ingresos del Mes</p>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(ingresosMes)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform">📦</div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Prendas en Stock</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalStock} <span className="text-sm text-slate-400 font-bold">unidades</span></p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-5 group-hover:scale-110 transition-transform">🤝</div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Clientes en CRM</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{totalClientes} <span className="text-sm text-slate-400 font-bold">activos</span></p>
        </div>

        <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-lg flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform">📋</div>
          <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Hoja de Ruta</p>
          <p className="text-3xl font-black text-white">{pedidosPendientes} <span className="text-sm text-slate-400 font-bold">pendientes</span></p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO ESTÁTICO (Visual) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
            📈 Tendencia Semanal
          </h2>
          <div className="h-64 flex items-end justify-between gap-2 px-2 pb-6 border-b border-slate-100 dark:border-slate-700 relative">
            {[40, 70, 45, 90, 65, 80, 100].map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2 group">
                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-xl relative overflow-hidden" style={{ height: '100%' }}>
                  <div 
                    className="absolute bottom-0 w-full bg-blue-500 rounded-t-xl group-hover:bg-blue-400 transition-colors" 
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Día {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ACCESOS RÁPIDOS */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-6 flex items-center gap-2">
            ⚡ Accesos Rápidos
          </h2>
          
          <div className="space-y-3 flex-1">
            <Link to="/ventas" className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">💰</div>
              <div>
                <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase">Punto de Venta</h3>
                <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500">Registrar nueva venta</p>
              </div>
            </Link>

            <Link to="/inventario" className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📦</div>
              <div>
                <h3 className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase">Inventario</h3>
                <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-500">Ver y cargar mercadería</p>
              </div>
            </Link>

            <Link to="/tesoreria" className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">💵</div>
              <div>
                <h3 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase">Tesorería</h3>
                <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500">Ver saldos de caja</p>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};