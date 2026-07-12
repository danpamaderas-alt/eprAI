import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTenantStore } from '../../../store/useTenantStore'; // <-- 1. Importar Tenant
import { Calendar, Search, FileText, X } from 'lucide-react';

// --- INTERFACES PARA SEGURIDAD DE TIPADO ---
// Interfaz para un item dentro del JSONB de la orden
interface OrderItemRecord {
  name?: string;
  productName?: string;
  size?: string;
  color?: string;
  qty?: number;
  quantity?: number;
  price: number;
}

// Interfaz para el registro de la orden, alineada con la tabla 'orders'
interface OrderRecord {
  id: string;
  customer_id?: string;
  customer_name: string; // <-- Campo clave para eficiencia
  created_at: string;
  total_amount: number;
  items: OrderItemRecord[]; // <-- JSONB con items
}

export const SalesHistoryDashboard = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const companyId = useTenantStore((state) => state.activeCompanyId); // <-- Obtener companyId

  // 1. CARGAR LAS VENTAS DESDE LA TABLA 'orders'
  const fetchHistory = useCallback(async () => {
    if (!companyId) return; // No hacer nada si no hay una empresa activa
    setIsLoading(true);
    try {
      // ✅ Refactorización: Apuntamos a la tabla 'orders' y filtramos por empresa
      const { data: ordersData, error } = await supabase
        .from('orders') 
        // ✅ VANGUARDIA: Seleccionamos columnas explícitas para evitar errores y sobrecarga
        .select('id, customer_id, customer_name, created_at, total_amount, items')
        .eq('company_id', companyId) // ✅ SEGURIDAD: Filtro Multi-Tenant
        .order('created_at', { ascending: false })
        .limit(100); // <-- Límite precautorio.

      if (error) {
        console.error("Error cargando el historial de ventas desde 'orders':", error);
        throw error;
      }
      
      setOrders(ordersData as unknown as OrderRecord[]);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (active) {
        fetchHistory();
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [fetchHistory]); // <-- Re-fetch si cambia la empresa

  // 2. FILTRAR VENTAS POR BÚSQUEDA (AHORA MÁS EFICIENTE)
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const lowerSearch = searchTerm.toLowerCase();
    
    return orders.filter(order => {
      // ✅ Refactorización: Usamos el 'customer_name' que ya viene en la orden
      const customerName = order.customer_name?.toLowerCase() || '';
      return (
        customerName.includes(lowerSearch) || 
        order.id?.toLowerCase().includes(lowerSearch)
      );
    });
  }, [orders, searchTerm]);

  // 3. CÁLCULO DEL TOTAL RECAUDADO EN PANTALLA
  const totalRevenue = useMemo(() => {
    // ✅ Refactorización: Usamos 'total_amount' y el estado filtrado correcto
    return filteredOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  }, [filteredOrders]);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="bg-emerald-500 text-white p-2 rounded-xl text-xl">💵</span>
            Libro de Ventas
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 italic">
            Historial histórico del Punto de Venta (POS)
          </p>
        </div>
        
        {/* RESUMEN RÁPIDO */}
        <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-6 shadow-xl">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Tickets</p>
            <p className="text-xl font-black text-white">{filteredOrders.length}</p>
          </div>
          <div className="w-px h-8 bg-slate-700"></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Recaudación</p>
            <p className="text-2xl font-black text-emerald-400 tracking-tighter">${totalRevenue.toLocaleString('es-AR')}</p>
          </div>
        </div>
      </header>

      {/* BUSCADOR */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Buscar por código de ticket o nombre del cliente..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white shadow-sm"
        />
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha y Ticket</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente / Institución</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Artículos</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total Venta</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest text-xs">
                    Cargando registro de ventas...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center font-black text-slate-400 uppercase tracking-widest text-xs">
                    No se encontraron ventas registradas
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const customerName = order.customer_name || 'Cliente Ocasional';
                  const date = new Date(order.created_at);
                  const itemsCount = order.items?.length || 0;
                  const total = Number(order.total_amount || 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-slate-900 dark:text-white uppercase">{date.toLocaleDateString('es-AR')}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{order.id.split('-')[0].toUpperCase()}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-black text-sm text-slate-700 dark:text-slate-200 uppercase">{customerName}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-black">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">
                          ${total.toLocaleString('es-AR')}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100"
                          title="Ver Ticket"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ MODAL FLOTANTE PARA VER EL TICKET COMPLETO */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase italic tracking-tighter">Detalle de Venta</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ticket #{selectedOrder.id.split('-')[0].toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cliente</p>
                  <p className="font-black text-slate-900 dark:text-white uppercase">{selectedOrder.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha</p>
                  <p className="font-black text-slate-900 dark:text-white uppercase">{new Date(selectedOrder.created_at).toLocaleString('es-AR')}</p>
                </div>
              </div>

              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Artículos Vendidos</p>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {selectedOrder.items?.map((item, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white uppercase">{item.name || item.productName}</p>
                      <p className="text-[10px] text-slate-500 uppercase mt-0.5">{item.size} | {item.color}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-slate-700 dark:text-slate-300">x{item.qty || item.quantity || 0}</p>
                      <p className="text-[10px] font-bold text-emerald-500">${(item.price * (item.qty || item.quantity || 0)).toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Abonado</span>
              <span className="text-3xl font-black text-emerald-400 tracking-tighter">
                ${Number(selectedOrder.total_amount || 0).toLocaleString('es-AR')}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};