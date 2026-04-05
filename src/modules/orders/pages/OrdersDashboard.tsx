import { useState, useEffect, useMemo} from 'react';
import { useOrderStore } from '../store/useOrderStore';
import Swal from 'sweetalert2';
import { OrderForm } from '../components/OrderForm';

// OPTIMIZACIÓN: Constantes fuera del componente para evitar re-asignación de memoria [cite: 36, 99]
const STATUS_COLORS: Record<string, string> = { 
  PENDING: 'bg-rose-100 text-rose-700 border-rose-200', 
  PARTIAL: 'bg-amber-100 text-amber-700 border-amber-200', 
  DELIVERED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200'
};

const STATUS_LABELS: Record<string, string> = { 
  PENDING: '⏳ PENDIENTE', 
  PARTIAL: '📦 PARCIAL', 
  DELIVERED: '✅ COMPLETADO',
  CANCELLED: '🚫 CANCELADO'
};

export const OrdersDashboard = () => {
  const { orders = [], fetchOrders, addOrder, registerPartialDelivery } = useOrderStore();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'DELIVERED'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // CRÍTICO CORREGIDO: Gestión de errores y estado de carga [cite: 54, 56]
  const handleCreateOrder = async (data: any) => {
    setIsProcessing(true);
    try {
      await addOrder(data);
      setShowForm(false);
      Swal.fire({ icon: 'success', title: 'Pedido Creado', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('[Orders] Error al crear:', error);
      Swal.fire('Error', 'No se pudo guardar el pedido. Verifique conexión.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliverVariation = async (orderId: string, itemId: string, variationId: string, pendingQty: number, description: string) => {
    const { value: qty } = await Swal.fire({
      title: `Entregar ${description}`,
      input: 'number',
      inputLabel: `Pendientes: ${pendingQty}`,
      inputAttributes: { min: '1', max: pendingQty.toString() },
      showCancelButton: true
    });

    if (!qty || Number(qty) <= 0) return;

    const { value: notes } = await Swal.fire({
      title: 'Notas de entrega',
      input: 'text',
      showCancelButton: true
    });

    try {
      await registerPartialDelivery(orderId, {
        date: new Date().toISOString(),
        notes: notes || `Entrega parcial: ${qty} unidades`,
        itemsDelivered: [{ itemId, variationId, quantity: Number(qty) }]
      });
      Swal.fire('Registrado', 'Entrega procesada con éxito', 'success');
    } catch (error) {
      Swal.fire('Error', 'Fallo la sincronización de entrega.', 'error');
    }
  };

  // OPTIMIZACIÓN: Filtrado memoizado para evitar bottlenecks [cite: 36, 45]
  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hoja de Ruta</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Sincronización de Entregas Parciales</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all"
        >
          Nuevo Pedido
        </button>
      </header>

      {/* Tabs de Filtro */}
      <nav className="flex bg-slate-200/50 p-1 rounded-xl w-fit" aria-label="Filtros de estado">
        {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setFilter(tab)} 
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'ALL' ? 'TODOS' : STATUS_LABELS[tab].split(' ')[1]}
          </button>
        ))}
      </nav>

      {/* Grid de Pedidos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest">Vista Vacía</div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col hover:border-blue-200 transition-colors">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{order.customerName}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Expiración: {new Date(order.dueDate).toLocaleDateString('es-AR')}</p>
                </div>
                <span className={`px-3 py-1.5 text-[10px] font-black rounded-lg border ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="p-6 space-y-6">
                {order.items.map(item => (
                  <div key={item.id} className="space-y-3">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{item.productName}</p>
                    <div className="space-y-2">
                      {item.variations.map(v => {
                        const pending = v.quantityOrdered - v.quantityDelivered;
                        const progress = (v.quantityDelivered / v.quantityOrdered) * 100;
                        return (
                          <div key={v.id} className="bg-slate-50 border p-3 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase">
                                <span>{v.size} - {v.color}</span>
                                <span>{v.quantityDelivered} / {v.quantityOrdered}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div className="h-1.5 bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                            {pending > 0 && (
                              <button 
                                onClick={() => handleDeliverVariation(order.id, item.id, v.id, pending, `${v.size} ${v.color}`)}
                                className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase transition-all"
                              >Entregar</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <OrderForm 
            onSubmitSuccess={handleCreateOrder} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      )}
    </div>
  );
};