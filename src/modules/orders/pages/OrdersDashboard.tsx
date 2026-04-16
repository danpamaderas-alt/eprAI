import { useState, useEffect, useMemo } from 'react';
import { useOrderStore } from '../store/useOrderStore';
import Swal from 'sweetalert2';
import { OrderForm } from '../components/OrderForm';

// Ajustamos los colores
const STATUS_COLORS: Record<string, string> = { 
  PENDING: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800', 
  PARTIAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', 
  DELIVERED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  CANCELLED: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
};

const STATUS_LABELS: Record<string, string> = { 
  PENDING: '⏳ PENDIENTE', 
  PARTIAL: '📦 PARCIAL', 
  DELIVERED: '✅ COMPLETADO',
  CANCELLED: '🚫 CANCELADO'
};

// ==========================================
// COMPONENTE DE TARJETA DESPLEGABLE
// ==========================================
// ✅ AGREGAMOS la función onEdit a los props
const OrderCard = ({ order, onDeliver, onPrint, onEdit }: { order: any, onDeliver: Function, onPrint: Function, onEdit: Function }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalAmount = order.totalAmount || order.total_amount || 0; // Compatibilidad con DB
  const advancePayment = order.advancePayment || order.advance_payment || 0; // Compatibilidad con DB
  const debt = totalAmount - advancePayment;

  // Compatibilidad de nombres con la DB (dueDate / due_date, etc)
  const dueDate = order.dueDate || order.due_date;
  const businessUnit = order.businessUnit || order.business_unit || '';
  const customerName = order.customerName || order.customer_name;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md ${isExpanded ? 'border-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
      
      {/* CABECERA (Siempre visible) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none"
      >
        <div>
          <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md mb-2 inline-block">
            {businessUnit.replace('_', ' ')}
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            {customerName}
            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1 italic">
            Vence: {dueDate ? new Date(dueDate).toLocaleDateString('es-AR') : 'S/F'}
          </p>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Total: <span className="text-slate-900 dark:text-white">${totalAmount}</span></div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Seña: ${advancePayment}</div>
            {debt > 0 ? (
              <div className="text-[10px] mt-1 font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 inline-block">
                DEBE: ${debt}
              </div>
            ) : totalAmount > 0 ? (
              <div className="text-[10px] mt-1 font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 inline-block">
                PAGADO
              </div>
            ) : null}
          </div>
          <button className="text-slate-400 dark:text-slate-500 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            {isExpanded ? '🔼' : '🔽'}
          </button>
        </div>
      </div>

      {/* DETALLE (Solo visible si está expandido) */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-b-3xl space-y-6 animate-in slide-in-from-top-2">
          
          <div className="flex justify-end gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
             {/* ✅ BOTÓN DE EDITAR AGREGADO AQUÍ */}
             <button 
                onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase transition-colors shadow-sm border border-blue-200 dark:border-blue-800"
              >
                ✏️ Editar Pedido
              </button>
             <button 
                onClick={(e) => { e.stopPropagation(); onPrint(order); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase transition-colors shadow-sm"
              >
                🖨️ Imprimir Remito
              </button>
          </div>

          {order.items?.map((item: any) => (
            <div key={item.id} className="space-y-3">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">{item.productName}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {item.variations?.map((variation: any) => {
                  const delivered = variation.quantityDelivered || 0;
                  const pending = variation.quantityOrdered - delivered;
                  const progress = Math.round((delivered / variation.quantityOrdered) * 100);
                  const desc = `Talle ${variation.size} - ${variation.color}`;

                  return (
                    <div key={variation.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-sm">
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{desc}</p>
                          
                          {/* 🔥 CARTELITO "RESTAN" */}
                          {pending > 0 && delivered > 0 && (
                            <span className="inline-block mt-1 text-[9px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 animate-pulse">
                              ⚠️ FALTAN {pending}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {delivered} <span className="text-slate-400">/ {variation.quantityOrdered}</span>
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                      </div>

                      {pending > 0 ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeliver(order.id, item.id, variation.id, pending, desc); }}
                          className="w-full mt-2 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Registrar Entrega
                        </button>
                      ) : (
                        <div className="w-full mt-2 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl text-center text-[10px] font-black uppercase tracking-widest">
                          Entregado ✅
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// PANTALLA PRINCIPAL
// ==========================================
export const OrdersDashboard = () => {
  const { orders = [], fetchOrders, registerPartialDelivery } = useOrderStore();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'DELIVERED'>('ALL');
  
  // ✅ Estados para controlar el formulario y la edición
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const handleAfterPrint = () => setOrderToPrint(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  // 🧠 LÓGICA DE ALERTAS INTELIGENTES
  const alerts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      urgent: orders.filter(o => {
        const due = o.dueDate || o.due_date;
        return o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && due <= today;
      }),
      highDebt: orders.filter(o => {
        const total = o.totalAmount || o.total_amount || 0;
        const advance = o.advancePayment || o.advance_payment || 0;
        return o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (total - advance) > (total * 0.5);
      }),
      partial: orders.filter(o => o.status === 'PARTIAL')
    };
  }, [orders]);

  const handlePrintRemito = (order: any) => {
    setOrderToPrint(order);
    setTimeout(() => {
      window.print();
    }, 500); 
  };

  // ✅ Funciones para abrir el formulario
  const handleNewOrderClick = () => {
    setEditingOrder(null); // Nos aseguramos de que esté vacío
    setShowForm(true);
  };

  const handleEditOrderClick = (order: any) => {
    setEditingOrder(order); // Le pasamos el pedido a editar
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  const handleFormSuccess = () => {
    fetchOrders(); // Recarga la lista desde Supabase
    handleFormClose();
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
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Hoja de Ruta</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-widest mt-1 transition-colors">Control de Pedidos y Entregas</p>
          </div>
          <button 
            onClick={handleNewOrderClick}
            className="px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95"
          >
            Nuevo Pedido
          </button>
        </header>

        {/* 🔔 SECCIÓN DE ALERTAS RÁPIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.urgent.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-3xl flex items-center gap-4 animate-pulse">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Urgente</p>
                <p className="text-sm font-black text-rose-900 dark:text-rose-100">{alerts.urgent.length} Vencidos o para Hoy</p>
              </div>
            </div>
          )}

          {alerts.highDebt.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-3xl flex items-center gap-4">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Cobro</p>
                <p className="text-sm font-black text-amber-900 dark:text-amber-100">{alerts.highDebt.length} Con Deuda Mayor al 50%</p>
              </div>
            </div>
          )}

          {alerts.partial.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-3xl flex items-center gap-4">
              <span className="text-2xl">🚚</span>
              <div>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Logística</p>
                <p className="text-sm font-black text-blue-900 dark:text-blue-100">{alerts.partial.length} En Proceso de Entrega</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit transition-colors overflow-x-auto">
          {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED'] as const).map(tab => {
            const count = tab === 'ALL' ? orders.length : orders.filter(o => o.status === tab).length;
            return (
              <button 
                key={tab} 
                onClick={() => setFilter(tab)} 
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${filter === tab ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {tab === 'ALL' ? 'TODOS' : STATUS_LABELS[tab].substring(2)}
                <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${filter === tab ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-800'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center opacity-30">
               <span className="text-6xl mb-4 block">🚚</span>
               <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">No hay pedidos registrados</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onDeliver={handleDeliverVariation} 
                onPrint={handlePrintRemito} 
                onEdit={handleEditOrderClick} /* ✅ Pasamos la función de editar */
              />
            ))
          )}
        </div>

        {/* ✅ ACTUALIZACIÓN DEL LLAMADO A ORDER FORM */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 transition-colors">
            <OrderForm 
              orderToEdit={editingOrder} /* ✅ Magia: le pasamos el pedido vacío o lleno */
              onSuccess={handleFormSuccess} 
              onClose={handleFormClose} 
            />
          </div>
        )}
      </div>

      {/* TU REMITO ORIGINAL (Intacto) */}
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
            <p className="text-2xl font-black uppercase">{orderToPrint.customerName || orderToPrint.customer_name}</p>
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
                {orderToPrint.items?.map((item: any) => 
                  item.variations?.map((variation: any) => (
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