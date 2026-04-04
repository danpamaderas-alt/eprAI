import { useState, useEffect } from 'react';
import { useOrderStore } from '../store/useOrderStore';
import Swal from 'sweetalert2';
import { OrderForm } from '../components/OrderForm';

export const OrdersDashboard = () => {
  const { orders, fetchOrders, addOrder, registerPartialDelivery } = useOrderStore();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'DELIVERED'>('ALL');
  
  // Estado para controlar si el formulario está abierto o cerrado
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Función para procesar el envío del formulario de nuevo pedido
  const handleCreateOrder = async (data: any) => {
    await addOrder(data);
    setShowForm(false);
    Swal.fire({
      icon: 'success',
      title: 'Pedido Creado',
      text: 'Se ha generado la hoja de ruta correctamente.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Pedido de prueba adaptado a la nueva estructura de talles y colores
  const createMockOrder = async () => {
    await addOrder({
      customerName: 'Registro Provincial - Corrientes',
      businessUnit: 'UNIFORMES',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      items: [
        { 
          id: crypto.randomUUID(), 
          productName: 'Chombas Piqué Bordadas', 
          variations: [
            { id: crypto.randomUUID(), size: 'L', color: 'Azul Marino', quantityOrdered: 15, quantityDelivered: 0 },
            { id: crypto.randomUUID(), size: 'XL', color: 'Azul Marino', quantityOrdered: 10, quantityDelivered: 0 }
          ]
        },
        { 
          id: crypto.randomUUID(), 
          productName: 'Camperas Polar', 
          variations: [
            { id: crypto.randomUUID(), size: 'XL', color: 'Negro', quantityOrdered: 5, quantityDelivered: 0 }
          ]
        }
      ],
      deliveryHistory: []
    });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pedido de prueba creado', showConfirmButton: false, timer: 1500 });
  };

  // Entrega específica por Variante (Talle/Color)
  const handleDeliverVariation = async (orderId: string, itemId: string, variationId: string, pendingQty: number, description: string) => {
    const { value: qty } = await Swal.fire({
      title: `Entregar ${description}`,
      input: 'number',
      inputLabel: `Cantidad a entregar (Pendientes: ${pendingQty})`,
      inputAttributes: { min: '1', max: pendingQty.toString(), step: '1' },
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar'
    });

    if (qty && Number(qty) > 0) {
      const { value: notes } = await Swal.fire({
        title: 'Detalle del remito',
        input: 'text',
        inputPlaceholder: 'Ej: Lo retiró el cadete, envíado por Andreani...',
        showCancelButton: true,
        confirmButtonText: 'Guardar'
      });

      await registerPartialDelivery(orderId, {
        date: new Date().toISOString(),
        notes: notes || `Se entregaron ${qty} ${description}`,
        itemsDelivered: [{ itemId, variationId, quantity: Number(qty) }]
      });

      Swal.fire('¡Registrado!', `Se entregaron ${qty} unidades de ${description}.`, 'success');
    }
  };
const statusColors: Record<string, string> = { 
  PENDING: 'bg-rose-100 text-rose-700 border-rose-200', 
  PARTIAL: 'bg-amber-100 text-amber-700 border-amber-200', 
  DELIVERED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200'
};

const statusLabels: Record<string, string> = { 
  PENDING: '⏳ PENDIENTE', 
  PARTIAL: '📦 PARCIAL', 
  DELIVERED: '✅ COMPLETADO',
  CANCELLED: '🚫 CANCELADO'
};
  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hoja de Ruta</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Control de Pedidos y Entregas Parciales</p>
        </div>
        <div className="flex gap-3">
          <button onClick={createMockOrder} className="px-4 py-2 border-2 border-dashed border-blue-500 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50">
            + Pedido Prueba
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95"
          >
            Nuevo Pedido
          </button>
        </div>
      </header>

      {/* FILTROS */}
      <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
        {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED'] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
            {tab === 'ALL' ? 'TODOS' : statusLabels[tab].substring(2)}
          </button>
        ))}
      </div>

      {/* TARJETAS DE PEDIDOS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center opacity-40">
             <span className="text-6xl mb-4 block">🚚</span>
             <p className="text-xs font-black uppercase tracking-widest text-slate-900">No hay pedidos en esta vista</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
              
              {/* Header del pedido */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-100 px-2 py-1 rounded-md mb-2 inline-block">
                    {order.businessUnit.replace('_', ' ')}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">{order.customerName}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase mt-1">Vence: {new Date(order.dueDate).toLocaleDateString('es-AR')}</p>
                </div>
                <span className={`px-3 py-1.5 text-[10px] font-black rounded-lg border shadow-sm ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
              </div>

              {/* Listado de Productos y sus Variantes */}
              <div className="p-6 space-y-6 flex-1">
                {order.items.map(item => (
                  <div key={item.id} className="space-y-3">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">{item.productName}</h4>
                    
                    {/* Desglose por Talle y Color */}
                    <div className="space-y-2">
                      {item.variations.map(variation => {
                        const pending = variation.quantityOrdered - variation.quantityDelivered;
                        const progress = Math.round((variation.quantityDelivered / variation.quantityOrdered) * 100);
                        const desc = `Talle ${variation.size} - ${variation.color}`;

                        return (
                          <div key={variation.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between items-end mb-2">
                                <p className="text-xs font-bold text-slate-700 uppercase">{desc}</p>
                                <span className="text-[10px] font-black text-slate-900">{variation.quantityDelivered} <span className="text-slate-400">/ {variation.quantityOrdered}</span></span>
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
                                Completo
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Remitos Anteriores */}
              {order.deliveryHistory.length > 0 && (
                <div className="bg-slate-900 p-5 text-white">
                  <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-3">Historial de Remitos</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                    {order.deliveryHistory.slice().reverse().map((log, i) => (
                      <div key={i} className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 flex gap-3 items-start">
                        <span className="text-emerald-400 mt-0.5">✔️</span>
                        <div>
                          <p className="text-[10px] font-bold text-slate-200">{log.notes}</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">{new Date(log.date).toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* MODAL DEL FORMULARIO DE NUEVO PEDIDO */}
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