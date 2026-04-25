import { useState, useEffect, useMemo, useRef } from 'react';
import { useOrderStore } from '../store/useOrderStore';
import Swal from 'sweetalert2';
import { OrderForm } from '../components/OrderForm';
import { useReactToPrint } from 'react-to-print';
import { OrderLabel } from '../../logistics/components/OrderLabel';
import { RemitoModal } from '../components/RemitoModal'; // ✅ Importado

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
// COMPONENTE: TARJETA DE PEDIDO (INDIVIDUAL)
// ==========================================
const OrderCard = ({ order, onDeliver, onOpenRemito, onEdit, onPrintLabel }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalAmount = order.totalAmount || order.total_amount || 0;
  const advancePayment = order.advancePayment || order.advance_payment || 0;
  const debt = totalAmount - advancePayment;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md ${isExpanded ? 'border-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700'}`}>
      
      <div onClick={() => setIsExpanded(!isExpanded)} className="p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none">
        <div>
          <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md mb-2 inline-block">
            {(order.business_unit || 'RAÍCES').replace('_', ' ')}
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            {order.customer_name || order.customerName}
            <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mt-1 italic">
            Vence: {order.due_date ? new Date(order.due_date).toLocaleDateString('es-AR') : 'S/F'}
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
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-b-3xl space-y-6">
          
          {/* ACCIONES DE CABECERA */}
          <div className="flex flex-wrap justify-end gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
             <button 
                onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-slate-50"
              >
                ✏️ Editar
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); onPrintLabel(order); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-500/20 transition-all"
              >
                🏷️ Etiqueta
              </button>

              {/* ✅ BOTÓN QUE ABRE EL NUEVO REMITO CON SELECCIÓN */}
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenRemito(order); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 transition-all"
              >
                📑 Generar Remito
              </button>
          </div>

          {/* LISTA DE ITEMS (VARIACIONES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.items?.map((item: any) => item.variations?.map((v: any) => {
              const delivered = v.quantityDelivered || 0;
              const progress = Math.round((delivered / v.quantityOrdered) * 100);
              const pending = v.quantityOrdered - delivered;

              return (
                <div key={v.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    
                    {/* 🔥 ACÁ AGREGAMOS EL COLOR */}
                    <p className="text-xs font-black uppercase">
                      {item.productName} 
                      <span className="text-blue-500 ml-1">
                        T{v.size} {v.color ? `— ${v.color}` : ''}
                      </span>
                    </p>
                    
                    <span className="text-[10px] font-bold">{delivered} / {v.quantityOrdered}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-3">
                    <div className={`h-1.5 rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                  </div>
                  {pending > 0 ? (
                    <button 
                      // 🔥 ACÁ TAMBIÉN LE PASAMOS EL COLOR AL BOTÓN PARA CUANDO TE PREGUNTE CUÁNTAS ENTREGÁS
                      onClick={() => onDeliver(order.id, item.id, v.id, pending, `${item.productName} T${v.size} - ${v.color || ''}`)}
                      className="w-full py-2 bg-slate-900 dark:bg-slate-700 hover:bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Registrar Entrega
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-center rounded-xl text-[9px] font-black uppercase">
                      Completado ✅
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL: PANTALLA DASHBOARD
// ==========================================
export const OrdersDashboard = () => {
  const { orders = [], fetchOrders, registerPartialDelivery } = useOrderStore();
  const [filter, setFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  
  // ✅ Estados para los Remitos y Etiquetas
  const [isRemitoOpen, setIsRemitoOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [orderForLabel, setOrderForLabel] = useState<any>(null);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handlePrintLabelAction = useReactToPrint({ content: () => labelRef.current });

  const triggerLabelPrint = (order: any) => {
    setOrderForLabel(order);
    setTimeout(() => { handlePrintLabelAction(); }, 150);
  };

  const handleDeliverVariation = async (orderId: string, itemId: string, variationId: string, pendingQty: number, desc: string) => {
    const { value: qty } = await Swal.fire({
      title: `Entregar ${desc}`,
      input: 'number',
      inputLabel: `Pendiente: ${pendingQty}`,
      inputAttributes: { min: '1', max: pendingQty.toString() },
      showCancelButton: true,
      confirmButtonColor: '#2563eb'
    });

    if (!qty) return;

    try {
      await registerPartialDelivery(orderId, {
        date: new Date().toISOString(),
        itemsDelivered: [{ itemId, variationId, quantity: Number(qty) }]
      });
      fetchOrders();
      Swal.fire('¡Éxito!', 'Entrega registrada.', 'success');
    } catch (e) {
      Swal.fire('Error', 'No se pudo guardar.', 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    if (filter === 'ALL') return orders;
    return orders.filter((o: any) => o.status === filter);
  }, [orders, filter]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Hoja de Ruta</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Gestión de Producción y Entregas Parciales</p>
        </div>
        <button onClick={() => { setEditingOrder(null); setShowForm(true); }} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all active:scale-95">
          Crear Nuevo Pedido
        </button>
      </header>

      {/* FILTROS */}
      <nav className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit">
        {['ALL', 'PENDING', 'PARTIAL', 'DELIVERED'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setFilter(tab)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filter === tab ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-slate-400'}`}
          >
            {tab === 'ALL' ? 'Todos' : STATUS_LABELS[tab].substring(2)}
          </button>
        ))}
      </nav>

      {/* LISTADO */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.map((order: any) => (
          <OrderCard 
            key={order.id} 
            order={order} 
            onDeliver={handleDeliverVariation}
            onEdit={(o: any) => { setEditingOrder(o); setShowForm(true); }}
            onOpenRemito={(o: any) => { setActiveOrder(o); setIsRemitoOpen(true); }}
            onPrintLabel={triggerLabelPrint}
          />
        ))}
      </div>

      {/* MODALES Y ELEMENTOS OCULTOS */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <OrderForm orderToEdit={editingOrder} onClose={() => setShowForm(false)} onSuccess={() => { fetchOrders(); setShowForm(false); }} />
        </div>
      )}

      {/* 🚀 EL NUEVO REMITO CON SELECCIÓN DE TALLA */}
      <RemitoModal 
        isOpen={isRemitoOpen} 
        onClose={() => setIsRemitoOpen(false)} 
        order={activeOrder} 
      />

      {/* ETIQUETA OCULTA PARA IMPRESIÓN */}
      <div style={{ display: 'none' }}>
        <OrderLabel ref={labelRef} order={orderForLabel} />
      </div>

    </div>
  );
};