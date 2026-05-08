import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase'; // Asegurate de que la ruta a supabase sea la correcta
import { Calendar, Search, FileText, X } from 'lucide-react';

export const SalesHistoryDashboard = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el modal de detalle del ticket
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // 1. CARGAR LAS VENTAS Y LOS CLIENTES DESDE SUPABASE
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // Traemos los clientes para cruzar los nombres
      const { data: custData } = await supabase.from('customers').select('id, name');
      if (custData) setCustomers(custData);

      // Traemos las ventas (Ajustá 'sales' o 'orders' según cómo se llame tu tabla en Supabase)
      // Asumimos que la tabla de ventas POS se llama 'sales'
      const { data: salesData, error } = await supabase
        .from('sales') 
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Si tira error porque la tabla POS se llama 'orders', te aviso por consola
        console.warn("Aviso: Revisá si tu tabla de ventas se llama 'sales' u 'orders'.", error);
      } else if (salesData) {
        setSales(salesData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // 2. FILTRAR VENTAS POR BÚSQUEDA
  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const lowerSearch = searchTerm.toLowerCase();
    
    return sales.filter(sale => {
      // Buscamos el nombre del cliente
      const customerName = customers.find(c => c.id === sale.customer_id)?.name?.toLowerCase() || '';
      return (
        customerName.includes(lowerSearch) || 
        sale.id?.toLowerCase().includes(lowerSearch)
      );
    });
  }, [sales, searchTerm, customers]);

  // 3. CÁLCULO DEL TOTAL RECAUDADO EN PANTALLA
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, curr) => acc + Number(curr.total_amount || curr.total || 0), 0);
  }, [filteredSales]);

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
            <p className="text-xl font-black text-white">{filteredSales.length}</p>
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
              ) : filteredSales.length === 0 ? 
                <tr>
                  <td colSpan={5} className="p-12 text-center font-black text-slate-400 uppercase tracking-widest text-xs">
                    No se encontraron ventas registradas
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const customerName = customers.find(c => c.id === sale.customer_id)?.name || 'Cliente Ocasional';
                  const date = new Date(sale.created_at);
                  const itemsCount = sale.items?.length || 0;
                  const total = Number(sale.total_amount || sale.total || 0);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-slate-900 dark:text-white uppercase">{date.toLocaleDateString('es-AR')}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{sale.id.split('-')[0].toUpperCase()}</span>
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
                          onClick={() => setSelectedSale({...sale, customerName})}
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
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase italic tracking-tighter">Detalle de Venta</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ticket #{selectedSale.id.split('-')[0].toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cliente</p>
                  <p className="font-black text-slate-900 dark:text-white uppercase">{selectedSale.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fecha</p>
                  <p className="font-black text-slate-900 dark:text-white uppercase">{new Date(selectedSale.created_at).toLocaleString('es-AR')}</p>
                </div>
              </div>

              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Artículos Vendidos</p>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {selectedSale.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white uppercase">{item.name || item.productName}</p>
                      <p className="text-[10px] text-slate-500 uppercase mt-0.5">{item.size} | {item.color}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm text-slate-700 dark:text-slate-300">x{item.qty || item.quantity}</p>
                      <p className="text-[10px] font-bold text-emerald-500">${(item.price * (item.qty || item.quantity)).toLocaleString('es-AR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Abonado</span>
              <span className="text-3xl font-black text-emerald-400 tracking-tighter">
                ${Number(selectedSale.total_amount || selectedSale.total || 0).toLocaleString('es-AR')}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};