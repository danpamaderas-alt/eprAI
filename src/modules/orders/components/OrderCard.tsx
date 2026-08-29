import { useState } from 'react';
import { supabase } from '../../../lib/supabase'; // Ajustá esta ruta si es necesario
import Swal from 'sweetalert2';
import { ARS } from '../../../shared/utils/format';

const STATUS_COLORS: Record<string, string> = {
  'PENDIENTE': 'bg-slate-100 text-slate-600 border-slate-200',
  'PARCIAL': 'bg-amber-100 text-amber-700 border-amber-200',
  'FINALIZADO': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'ENTREGADO': 'bg-blue-100 text-blue-700 border-blue-200',
  'CANCELADO': 'bg-rose-100 text-rose-700 border-rose-200',
};

export const OrderCard = ({ order: initialOrder }: any) => {
  const [order, setOrder] = useState(initialOrder);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Lógica de impresión nativa
  const handlePrint = () => {
    window.print();
  };

  // Cálculo de prendas pedidas vs entregadas (¡Ahora sí las usamos!)
  const totalOrdered = order.items?.reduce((acc: number, item: any) => 
    acc + item.variations.reduce((sum: number, v: any) => sum + (v.quantityOrdered || 0), 0), 0) || 0;
  
  const totalDelivered = order.items?.reduce((acc: number, item: any) => 
    acc + item.variations.reduce((sum: number, v: any) => sum + (v.quantityDelivered || 0), 0), 0) || 0;

  // Lógica inteligente de estado
  const isFullyProduced = totalOrdered > 0 && totalDelivered >= totalOrdered;
  const currentStatus = order.status || 'PENDIENTE';

  // Función para forzar el estado a mano
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      if (error) throw error;
      
      setOrder({ ...order, status: newStatus });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Pedido ${newStatus}`, showConfirmButton: false, timer: 1500 });
    } catch {
      Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const menuStatus = () => {
    Swal.fire({
      title: 'Cambiar Estado',
      input: 'select',
      inputOptions: {
        'PENDIENTE': 'PENDIENTE',
        'PARCIAL': 'PARCIAL',
        'FINALIZADO': 'FINALIZADO',
        'ENTREGADO': 'ENTREGADO',
        'CANCELADO': 'CANCELADO'
      },
      inputValue: currentStatus,
      showCancelButton: true,
      confirmButtonText: 'Actualizar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) handleStatusChange(result.value);
    });
  };

  return (
    <>
      {/* 1. LA TARJETA VISUAL */}
      <div className={`print:hidden bg-white rounded-3xl border transition-colors duration-300 ${isExpanded ? 'border-blue-500 shadow-xl shadow-blue-500/10' : 'border-slate-200 shadow-sm'}`}>
        <div className="p-5 flex justify-between items-center gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-4 flex-1">
            <div className="bg-slate-100 p-3 rounded-2xl text-xl">
              {isFullyProduced ? '✅' : '📦'}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight truncate">{order.customerName}</h3>
              <div className="flex items-center gap-2 mt-1">
                {/* BADGE CLICKEABLE PARA CAMBIAR ESTADO */}
                <button 
                  disabled={isUpdating}
                  onClick={(e) => { e.stopPropagation(); menuStatus(); }}
                  className={`text-[9px] font-black px-2 py-0.5 rounded-md border transition-transform hover:scale-105 ${STATUS_COLORS[isFullyProduced && currentStatus === 'PARCIAL' ? 'FINALIZADO' : currentStatus]}`}
                  title="Clic para cambiar estado manual"
                >
                  {isFullyProduced && currentStatus === 'PARCIAL' ? 'LISTO (AUTO)' : currentStatus}
                </button>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  {order.businessUnit} • Vence: {new Date(order.dueDate).toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-black text-slate-800">{ARS.format(order.totalAmount || 0)}</p>
            <p className={`text-[9px] font-black uppercase tracking-widest ${((order.totalAmount || 0) - (order.advancePayment || 0)) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              Saldo: {ARS.format((order.totalAmount || 0) - (order.advancePayment || 0))}
            </p>
          </div>
        </div>

        {/* CONTENIDO EXPANDIDO */}
        {isExpanded && (
          <div className="border-t border-slate-100 p-5 bg-slate-50/50 rounded-b-3xl">
            <div className="space-y-3 mb-4">
              {order.items?.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100">
                  <p className="font-black text-sm text-slate-800 uppercase">{item.productName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {item.variations.map((v: any) => (
                      <div key={v.id} className={`p-2 rounded-xl text-[10px] font-black flex justify-between border ${v.quantityDelivered >= v.quantityOrdered ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                        <span className="uppercase">{v.size} / {v.color}</span>
                        <span>{v.quantityDelivered} / {v.quantityOrdered} {v.quantityDelivered >= v.quantityOrdered && '✓'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button className="px-4 py-2 bg-white text-slate-600 font-black text-xs uppercase rounded-xl border hover:bg-slate-50">✏️ Editar</button>
              <button onClick={handlePrint} className="px-4 py-2 bg-blue-50 text-blue-600 font-black text-xs uppercase rounded-xl border border-blue-200 hover:bg-blue-100">🖨️ Remito</button>
              
              {isFullyProduced && currentStatus !== 'ENTREGADO' ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleStatusChange('ENTREGADO'); }}
                  className="px-6 py-2 bg-emerald-600 text-white font-black text-xs uppercase rounded-xl shadow-lg hover:bg-emerald-500"
                >
                  🚚 Entregar
                </button>
              ) : (
                <button className="px-6 py-2 bg-slate-900 text-white font-black text-xs uppercase rounded-xl shadow-lg hover:bg-slate-800">
                  📦 Gestión
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. EL REMITO OCULTO (Solo visible al imprimir) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-mono text-black">
        <div className="max-w-md mx-auto border-2 border-black p-6">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-black uppercase tracking-widest">{order.businessUnit?.replace('_', ' ') || 'PEDIDO'}</h1>
            <p className="text-sm tracking-tighter font-bold">REMITO DE ENTREGA</p>
            <p className="text-xs mt-2 italic font-bold">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
          </div>
          
          <div className="mb-6 text-sm font-bold uppercase">
            <p>CLIENTE: {order.customerName}</p>
            <p>VENCIMIENTO: {new Date(order.dueDate).toLocaleDateString('es-AR')}</p>
          </div>

          <table className="w-full text-sm mb-6 text-left border-collapse">
            <thead>
              <tr className="border-b border-black">
                <th className="pb-2">CANT</th>
                <th className="pb-2">DESCRIPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item: any) => (
                item.variations.map((v: any) => (
                  <tr key={v.id} className="border-b border-dashed border-gray-400">
                    <td className="py-2 font-black">{v.quantityOrdered}</td>
                    <td className="py-2 uppercase font-bold">{item.productName} ({v.size} - {v.color})</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-black pt-4 text-right mb-8 text-sm">
            <p>TOTAL PEDIDO: {ARS.format(order.totalAmount || 0)}</p>
            <p>SEÑA ABONADA: {ARS.format(order.advancePayment || 0)}</p>
            <p className="font-black text-lg mt-2">SALDO: {ARS.format((order.totalAmount || 0) - (order.advancePayment || 0))}</p>
          </div>

          <div className="text-center text-xs mt-12 border-t border-black pt-4">
            <p>Recibí conforme:</p>
            <p className="mt-8 border-b border-black w-48 mx-auto"></p>
            <p className="mt-1 font-bold">Firma / Aclaración</p>
          </div>
        </div>
      </div>
    </>
  );
};