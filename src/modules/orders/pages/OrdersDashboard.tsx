import { useState, useEffect, useMemo } from 'react';
import { useOrderStore } from '../store/useOrderStore';
import Swal from 'sweetalert2';
import { OrderForm } from '../components/OrderForm';

// Ajustamos los colores para que se vean bien tanto en claro como en oscuro
const STATUS_COLORS: Record<string, string> = { 
  PENDING: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50', 
  PARTIAL: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50', 
  DELIVERED: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
  CANCELLED: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
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
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const handleAfterPrint = () => setOrderToPrint(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintRemito = (order: any) => {
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 500); 
  };

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
      confirmButtonColor: '#2563eb',
      customClass: { popup: 'dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-3xl' }
    });

    if (!qty || Number(qty) <= 0) return;

    const { value: notes } = await Swal.fire({
      title: 'Detalle del remito',
      input: 'text',
      inputPlaceholder: 'Ej: Retirado por transporte...',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      customClass: { popup: 'dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-3xl' }
    });

    try {
      await registerPartialDelivery(orderId, {
        date: new Date().toISOString(),
        notes: notes || `Se entregaron ${qty} un. de ${description}`,
        itemsDelivered: [{ itemId, variationId, quantity: Number(qty) }]
      });
      Swal.fire({ icon: 'success', title: '¡Registrado!', text: 'La entrega parcial ha sido guardada.', customClass: { popup: 'dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-3xl' }});
    } catch (error) {
      console.error('[Orders Dashboard] Error en entrega parcial:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un fallo al registrar la entrega.', customClass: { popup: 'dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-3xl' }});
    }
  };

  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 15mm; }
          html, body, #root {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: static !important;
            background-color: white !important;
          }
          nav, aside { display: none !important; }
          table { page-break-inside: auto; width: 100%; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        `}
      </style>

      <div className="animate-in fade-in duration-500 space-y-6 print:hidden">
        
        {/* ENCABEZADO */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Hoja de Ruta</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-widest mt-1 transition-colors">Control de Pedidos y Entregas</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95"
          >
            Nuevo Pedido
          </button>
        </header>

        {/* FILTROS */}
        <nav className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit transition-colors">
          {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setFilter(tab)} 
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === tab ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {tab === 'ALL' ? 'TODOS' : STATUS_LABELS[tab].substring(2)}
            </button>
          ))}
        </nav>

        {/* LISTADO DE PEDIDOS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-20 text-center opacity-30">
               <span className="text-6xl mb-4 block">🚚</span>
               <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">No hay pedidos registrados</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div key={order.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col hover:border-blue-200 dark:hover:border-blue-500/50 transition-colors duration-300">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start transition-colors">
                  
                  {/* LADO IZQUIERDO */}
                  <div>
                    <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md mb-2 inline-block transition-colors">
                      {order.businessUnit.replace('_', ' ')}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight transition-colors">{order.customerName}</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1 italic transition-colors">Vence: {new Date(order.dueDate).toLocaleDateString('es-AR')}</p>
                    
                    {/* PANEL FINANCIERO AUTOMÁTICO */}
                    <div className="mt-3 flex items-center gap-3 border-t border-slate-200 dark:border-slate-700 pt-3 transition-colors">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total: <span className="text-slate-900 dark:text-white transition-colors">${order.totalAmount || 0}</span></div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Seña: <span className="text-emerald-600 dark:text-emerald-400 transition-colors">${order.advancePayment || 0}</span></div>
                      
                      {((order.totalAmount || 0) - (order.advancePayment || 0)) > 0 ? (
                        <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-md border border-rose-200 dark:border-rose-800 animate-pulse shadow-sm transition-colors">
                          DEBE: ${ (order.totalAmount || 0) - (order.advancePayment || 0) }
                        </div>
                      ) : (order.totalAmount > 0) ? (
                        <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 shadow-sm transition-colors">
                          PAGADO TOTAL
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* LADO DERECHO: Botones */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1.5 text-[10px] font-black rounded-lg border shadow-sm transition-colors ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <button 
                      onClick={() => handlePrintRemito(order)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold uppercase transition-colors shadow-sm"
                    >
                      🖨️ Remito
                    </button>
                  </div>
                </div>

                {/* DETALLE DE LOS ARTÍCULOS */}
                <div className="p-6 space-y-6 flex-1">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="space-y-3">
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-2 transition-colors">{item.productName}</h4>
                      <div className="space-y-2">
                        {item.variations.map((variation: any) => {
                          const delivered = variation.quantityDelivered || 0;
                          const pending = variation.quantityOrdered - delivered;
                          const progress = Math.round((delivered / variation.quantityOrdered) * 100);
                          const desc = `Talle ${variation.size} - ${variation.color}`;

                          return (
                            <div key={variation.id} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                              <div className="flex-1">
                                <div className="flex justify-between items-end mb-2">
                                  <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase transition-colors">{desc}</p>
                                  <span className="text-[10px] font-black text-slate-900 dark:text-white transition-colors">{delivered} <span className="text-slate-400 dark:text-slate-500">/ {variation.quantityOrdered}</span></span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 transition-colors">
                                  <div className={`h-1.5 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                              </div>

                              {pending > 0 ? (
                                <button 
                                  onClick={() => handleDeliverVariation(order.id, item.id, variation.id, pending, desc)}
                                  className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                  Entregar
                                </button>
                              ) : (
                                <span className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors">
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

        {/* MODAL FORMULARIO */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 transition-colors">
            <OrderForm 
              onSubmitSuccess={handleCreateOrder} 
              onCancel={() => setShowForm(false)} 
            />
          </div>
        )}
      </div>

      {/* ZONA DE IMPRESIÓN (Queda intacta porque el papel siempre es blanco) */}
      {orderToPrint && (
        <div className="hidden print:block w-full bg-white text-black p-4">
          <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div>
              <h1 className="text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'serif' }}>RAÍCES</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mt-1 text-gray-500">Documento no válido como factura</p>
              <h2 className="text-xl font-bold uppercase mt-4">Remito de Envío</h2>
            </div>
            <div className="text-right border border-gray-300 p-4 rounded-lg bg-gray-50">
              <p className="text-sm font-bold uppercase text-gray-500">Fecha de Emisión</p>
              <p className="text-xl font-black">{new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>

          <div className="border border-gray-300 rounded-xl p-5 mb-8 bg-gray-50">
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Cliente / Destinatario</p>
            <p className="text-2xl font-black uppercase">{orderToPrint.customerName}</p>
          </div>

          <div className="mb-12">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-3 font-black uppercase text-sm w-12 text-center">Chk</th>
                  <th className="py-3 font-black uppercase text-sm">Sector</th>
                  <th className="py-3 font-black uppercase text-sm">Artículo</th>
                  <th className="py-3 font-black uppercase text-sm text-center">Talle</th>
                  <th className="py-3 font-black uppercase text-sm">Color</th>
                  <th className="py-3 font-black uppercase text-sm text-center">Cantidad</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orderToPrint.items.map((item: any) => 
                  item.variations.map((variation: any) => (
                    <tr key={variation.id} className="border-b border-gray-200">
                      <td className="py-3 text-center">
                        <div className="w-5 h-5 border-2 border-gray-400 rounded-sm mx-auto"></div>
                      </td>
                      <td className="py-3 font-bold uppercase text-gray-600">{(item as any).sector || '-'}</td>
                      <td className="py-3 font-bold uppercase">{item.productName}</td>
                      <td className="py-3 font-black text-center">{variation.size}</td>
                      <td className="py-3 font-bold uppercase">{variation.color}</td>
                      <td className="py-3 font-black text-center text-lg">{variation.quantityOrdered}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-20 pt-10 border-t border-gray-200">
            <div className="w-1/2 ml-auto">
              <div className="border-b border-black mb-2 h-10"></div>
              <p className="text-xs font-bold uppercase text-center text-gray-500 tracking-widest">
                Firma y Aclaración de quien recibe
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};