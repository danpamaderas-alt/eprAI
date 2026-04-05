import { useState, useEffect, useMemo } from 'react';
import { useOrderStore } from '../store/useOrderStore';
import Swal from 'sweetalert2';
import { OrderForm } from '../components/OrderForm';

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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleCreateOrder = async (data: any) => {
    try {
      await addOrder(data);
      setShowForm(false);
      Swal.fire({ icon: 'success', title: 'Pedido Creado', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('[Orders Dashboard] Error al crear pedido:', error);
      Swal.fire('Error', 'No se pudo guardar el pedido.', 'error');
    }
  };

  const handleDeliverVariation = async (orderId: string, itemId: string, variationId: string, pendingQty: number, description: string) => {
    const { value: qty } = await Swal.fire({
      title: `Entregar ${description}`,
      input: 'number',
      inputLabel: `Unidades pendientes: ${pendingQty}`,
      inputAttributes: { min: '1', max: pendingQty.toString(), step: '1' },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      confirmButtonColor: '#2563eb'
    });

    if (!qty || Number(qty) <= 0) return;

    const { value: notes } = await Swal.fire({
      title: 'Detalle del remito',
      input: 'text',
      inputPlaceholder: 'Ej: Retirado por transporte...',
      showCancelButton: true,
      confirmButtonText: 'Guardar'
    });

    try {
      await registerPartialDelivery(orderId, {
        date: new Date().toISOString(),
        notes: notes || `Se entregaron ${qty} un. de ${description}`,
        itemsDelivered: [{ itemId, variationId, quantity: Number(qty) }]
      });
      Swal.fire('¡Registrado!', 'La entrega parcial ha sido guardada.', 'success');
    } catch (error) {
      console.error('[Orders Dashboard] Error en entrega parcial:', error);
      Swal.fire('Error', 'Hubo un fallo al registrar la entrega.', 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hoja de Ruta</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Control de Pedidos y Entregas</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95"
        >
          Nuevo Pedido
        </button>
      </header>

      <nav className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
        {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setFilter(tab)} 
            className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'ALL' ? 'TODOS' : STATUS_LABELS[tab].substring(2)}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center opacity-30">
             <span className="text-6xl mb-4 block">🚚</span>
             <p className="text-xs font-black uppercase tracking-widest text-slate-900">No hay pedidos registrados</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col hover:border-blue-200 transition-colors">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-100 px-2 py-1 rounded-md mb-2 inline-block">
                    {order.businessUnit.replace('_', ' ')}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">{order.customerName}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 italic">Vence: {new Date(order.dueDate).toLocaleDateString('es-AR')}</p>
                </div>
                <span className={`px-3 py-1.5 text-[10px] font-black rounded-lg border shadow-sm ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="p-6 space-y-6 flex-1">
                {order.items.map(item => (
                  <div key={item.id} className="space-y-3">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">{item.productName}</h4>
                    <div className="space-y-2">
                      {item.variations.map(variation => {
                        const delivered = variation.quantityDelivered || 0;
                        const pending = variation.quantityOrdered - delivered;
                        const progress = Math.round((delivered / variation.quantityOrdered) * 100);
                        const desc = `Talle ${variation.size} - ${variation.color}`;

                        return (
                          <div key={variation.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-2">
                                <p className="text-[10px] font-bold text-slate-700 uppercase">{desc}</p>
                                <span className="text-[10px] font-black text-slate-900">{delivered} <span className="text-slate-400">/ {variation.quantityOrdered}</span></span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>

                            {pending > 0 ? (
                              <button 
                                onClick={() => handleDeliverVariation(order.id, item.id, variation.id, pending, desc)}
                                className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                              >
                                Entregar
                              </button>
                            ) : (
                              <span className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                OK
                              </span>
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