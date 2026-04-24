import { useState, useEffect, useMemo, useRef } from 'react'; // ✅ Agregamos useRef
import { useOrderStore } from '../store/useOrderStore';
import Swal from 'sweetalert2';
import { OrderForm } from '../components/OrderForm';
import { useReactToPrint } from 'react-to-print'; // ✅ Librería para etiquetas
import { OrderLabel } from '../../logistics/components/OrderLabel'; // ✅ Importamos la etiqueta

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
const OrderCard = ({ order, onDeliver, onPrint, onEdit, onPrintLabel }: { order: any, onDeliver: Function, onPrint: Function, onEdit: Function, onPrintLabel: Function }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalAmount = order.totalAmount || order.total_amount || 0;
  const advancePayment = order.advancePayment || order.advance_payment || 0;
  const debt = totalAmount - advancePayment;

  const dueDate = order.dueDate || order.due_date;
  const businessUnit = order.businessUnit || order.business_unit || '';
  const customerName = order.customerName || order.customer_name;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md ${isExpanded ? 'border-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
      
      <div onClick={() => setIsExpanded(!isExpanded)} className="p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
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
            {debt > 0 && (
              <div className="text-[10px] mt-1 font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 inline-block">
                DEBE: ${debt}
              </div>
            )}
          </div>
          <button className="text-slate-400 dark:text-slate-500 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            {isExpanded ? '🔼' : '🔽'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-b-3xl space-y-6 animate-in slide-in-from-top-2">
          
          <div className="flex justify-end gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
             <button 
                onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase transition-colors shadow-sm border border-blue-200 dark:border-blue-800"
              >
                ✏️ Editar
              </button>

              {/* ✅ BOTÓN DE ETIQUETA AGREGADO */}
              <button 
                onClick={(e) => { e.stopPropagation(); onPrintLabel(order); }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase transition-colors shadow-lg shadow-indigo-500/20"
              >
                🏷️ Etiqueta
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); onPrint(order); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase transition-colors shadow-sm"
              >
                🖨️ Remito
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
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);

  // ✅ LOGICA DE IMPRESION DE ETIQUETAS
  const labelRef = useRef<HTMLDivElement>(null);
  const [orderForLabel, setOrderForLabel] = useState<any | null>(null);

  const handlePrintLabelAction = useReactToPrint({
    content: () => labelRef.current,
  });

  const triggerLabelPrint = (order: any) => {
    setOrderForLabel(order);
    // Timeout para asegurar que el ref tenga los datos cargados antes de disparar
    setTimeout(() => {
      handlePrintLabelAction();
    }, 150);
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setOrderToPrint(null);
      setOrderForLabel(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

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
    setTimeout(() => { window.print(); }, 500); 
  };

  const handleNewOrderClick = () => { setEditingOrder(null); setShowForm(true); };
  const handleEditOrderClick = (order: any) => { setEditingOrder(order); setShowForm(true); };
  const handleFormClose = () => { setShowForm(false); setEditingOrder(null); };
  const handleFormSuccess = () => { fetchOrders(); handleFormClose(); };

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
      Swal.fire({ icon: 'error', title: 'Error', text: 'Hubo un fallo.', customClass: { popup: 'dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-3xl' }});
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
          html, body, #root { height: auto !important; overflow: visible !important; background-color: white !important; }
          nav, aside, .print\\:hidden { display: none !important; }
        `}
      </style>

      <div className="animate-in fade-in duration-500 space-y-6 print:hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Hoja de Ruta</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-widest mt-1">Control de Pedidos y Entregas</p>
          </div>
          <button onClick={handleNewOrderClick} className="px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
            Nuevo Pedido
          </button>
        </header>

        {/* ALERTAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.urgent.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-3xl flex items-center gap-4 animate-pulse">
              <span className="text-2xl">🚨</span>
              <div><p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Urgente</p><p className="text-sm font-black text-rose-900 dark:text-rose-100">{alerts.urgent.length} Vencidos</p></div>
            </div>
          )}
          {alerts.highDebt.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-3xl flex items-center gap-4">
              <span className="text-2xl">💰</span>
              <div><p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Cobro</p><p className="text-sm font-black text-amber-900 dark:text-amber-100">{alerts.highDebt.length} Con Deuda</p></div>
            </div>
          )}
          {alerts.partial.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-3xl flex items-center gap-4">
              <span className="text-2xl">🚚</span>
              <div><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Logística</p><p className="text-sm font-black text-blue-900 dark:text-blue-100">{alerts.partial.length} En Proceso</p></div>
            </div>
          )}
        </div>

        {/* FILTROS */}
        <nav className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit overflow-x-auto">
          {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED'] as const).map(tab => (
            <button key={tab} onClick={() => setFilter(tab)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === tab ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              {tab === 'ALL' ? 'TODOS' : STATUS_LABELS[tab].substring(2)}
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[8px] bg-slate-200 dark:bg-slate-800">{tab === 'ALL' ? orders.length : orders.filter(o => o.status === tab).length}</span>
            </button>
          ))}
        </nav>

        {/* LISTADO DE TARJETAS */}
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center opacity-30"><span className="text-6xl mb-4 block">🚚</span><p className="text-xs font-black uppercase tracking-widest">No hay pedidos</p></div>
          ) : (
            filteredOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onDeliver={handleDeliverVariation} 
                onPrint={handlePrintRemito} 
                onEdit={handleEditOrderClick}
                onPrintLabel={triggerLabelPrint} // ✅ NUEVO PROP
              />
            ))
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <OrderForm orderToEdit={editingOrder} onSuccess={handleFormSuccess} onClose={handleFormClose} />
          </div>
        )}
      </div>

      {/* ✅ ELEMENTO OCULTO PARA IMPRESION DE ETIQUETAS */}
      <div style={{ display: 'none' }}>
        <OrderLabel ref={labelRef} order={orderForLabel} />
      </div>

      {/* REMITO A4 (Tu original) */}
      {orderToPrint && (
        <div className="hidden print:block w-full bg-white text-black p-4">
          <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div><h1 className="text-5xl font-black uppercase">RAÍCES</h1><h2 className="text-xl font-bold uppercase mt-4">Remito de Envío</h2></div>
            <div className="text-right border border-gray-300 p-4 rounded-lg bg-gray-50"><p className="text-sm font-bold text-gray-500">Fecha</p><p className="text-xl font-black">{new Date().toLocaleDateString('es-AR')}</p></div>
          </div>
          <div className="border border-gray-300 rounded-xl p-5 mb-8 bg-gray-50"><p className="text-xs font-bold text-gray-500 mb-1">Cliente</p><p className="text-2xl font-black uppercase">{orderToPrint.customerName || orderToPrint.customer_name}</p></div>
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b-2 border-black"><th className="py-3 text-sm">Artículo</th><th className="py-3 text-sm text-center">Talle</th><th className="py-3 text-sm">Color</th><th className="py-3 text-sm text-center">Cantidad</th></tr></thead>
            <tbody className="text-sm">
              {orderToPrint.items?.map((item: any) => item.variations?.map((v: any) => (
                <tr key={v.id} className="border-b border-gray-200"><td className="py-3 font-bold uppercase">{item.productName}</td><td className="py-3 font-black text-center">{v.size}</td><td className="py-3 font-bold uppercase">{v.color}</td><td className="py-3 font-black text-center text-lg">{v.quantityOrdered}</td></tr>
              )))}
            </tbody>
          </table>
          <div className="mt-20 pt-10 border-t border-gray-200"><div className="w-1/2 ml-auto"><div className="border-b border-black mb-2 h-10"></div><p className="text-xs font-bold text-center text-gray-500 uppercase">Firma Receptor</p></div></div>
        </div>
      )}
    </>
  );
};