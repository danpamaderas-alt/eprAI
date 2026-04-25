import React, { useState, useEffect } from 'react';

export const RemitoModal = ({ isOpen, onClose, order }: any) => {
  const [deliveryItems, setDeliveryItems] = useState<any[]>([]);

  // 1. CARGA AUTOMÁTICA DE DATOS
  useEffect(() => {
    if (order && order.items) {
      const flattened = order.items.flatMap((item: any) => 
        item.variations.map((v: any) => ({
          id: v.id,
          name: item.productName,
          size: v.size,
          color: v.color,
          total: v.quantityOrdered,
          delivered: v.quantityDelivered || 0,
          current: 0 
        }))
      );
      setDeliveryItems(flattened);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleQtyChange = (id: string, val: number) => {
    setDeliveryItems(prev => prev.map(item => 
      item.id === id ? { ...item, current: val } : item
    ));
  };

  const itemsToPrint = deliveryItems.filter(i => i.current > 0);

  // 💰 VÍNCULO AUTOMÁTICO CON LOS VALORES DEL TRABAJO
  // Buscamos los valores exactos que vienen de tu base de datos/store
  const totalAgordado = Number(order.total_amount || order.totalAmount || 0);
  const senaRecibida = Number(order.advance_payment || order.advancePayment || 0);
  const saldoRestante = totalAgordado - senaRecibida;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      
      {/* 🖥️ VISTA PARA LA PANTALLA (No se imprime) */}
      <div className="bg-white text-slate-900 w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden screen-only flex flex-col max-h-[80vh]">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-800">Preparar Despacho</h2>
            <p className="text-[10px] font-black text-blue-600 mt-1 uppercase tracking-[0.2em]">
              Cliente: {order.customer_name || order.customerName} | Pedido: #{order.id.split('-')[0]}
            </p>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-rose-100 hover:text-rose-500 rounded-full transition-all text-xl">✕</button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-100">
                <th className="pb-6">Artículo / Detalle</th>
                <th className="pb-6 text-center">Pedido</th>
                <th className="pb-6 text-center">Ya Entregado</th>
                <th className="pb-6 text-center bg-indigo-50 text-indigo-600 rounded-t-3xl">Cargar Ahora</th>
                <th className="pb-6 text-center">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveryItems.map((item) => {
                const pending = item.total - item.delivered;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-6">
                      <p className="font-black text-sm uppercase tracking-tight">{item.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Talle {item.size} — {item.color}</p>
                    </td>
                    <td className="py-6 text-center font-bold text-slate-400">{item.total}</td>
                    <td className="py-6 text-center font-bold text-slate-400">{item.delivered}</td>
                    <td className="py-6 bg-indigo-50/30 text-center">
                      <input 
                        type="number"
                        value={item.current}
                        min="0"
                        max={pending}
                        onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 p-3 border-2 border-indigo-200 rounded-2xl font-black text-center focus:border-indigo-500 outline-none transition-all"
                      />
                    </td>
                    <td className={`py-6 text-center font-black ${pending - item.current > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {pending - item.current <= 0 ? 'LISTO ✅' : pending - item.current}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 💰 BARRA FINANCIERA AUTOMÁTICA */}
        <div className="p-8 bg-slate-900 flex justify-between items-center gap-4 shrink-0">
          <div className="flex gap-10">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Acordado</p>
              <p className="text-2xl font-black text-white">${totalAgordado.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Saldo de Obra</p>
              <p className={`text-2xl font-black ${saldoRestante > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                ${saldoRestante.toLocaleString()}
              </p>
            </div>
          </div>
          <button 
            onClick={() => window.print()} 
            disabled={itemsToPrint.length === 0}
            className="px-10 py-5 bg-blue-600 disabled:bg-slate-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all"
          >
            🖨️ Imprimir Remito
          </button>
        </div>
      </div>

      {/* 📄 REMITO IMPRESO (El que ve el cliente) */}
      <div id="remito-impreso" className="hidden print:flex flex-col text-black bg-white font-sans min-h-[297mm]">
        
        <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
          <div>
            <h1 className="text-6xl font-black italic tracking-tighter leading-none">RAÍCES</h1>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mt-2 text-gray-600">Confección & Diseño Textil</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase tracking-tight">Remito de Entrega</h2>
            <div className="mt-2 text-sm">
              <p><span className="font-bold text-gray-500 uppercase text-[10px]">Fecha:</span> <span className="font-black">{new Date().toLocaleDateString('es-AR')}</span></p>
              <p><span className="font-bold text-gray-500 uppercase text-[10px]">Pedido:</span> <span className="font-black">#{order.id.split('-')[0].toUpperCase()}</span></p>
            </div>
          </div>
        </div>

        <div className="mb-10 bg-gray-100 p-8 rounded-2xl border border-gray-300">
          <p className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">Receptor / Cliente</p>
          <p className="text-3xl font-black uppercase">{order.customer_name || order.customerName}</p>
        </div>

        <table className="w-full text-left mb-16 border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th className="py-3 px-2 text-[10px] font-black uppercase tracking-widest">Artículo</th>
              <th className="py-3 px-2 text-[10px] font-black uppercase tracking-widest text-center">Variante</th>
              <th className="py-3 px-2 text-[10px] font-black uppercase tracking-widest text-center">Cant. Entregada</th>
              <th className="py-3 px-2 text-[10px] font-black uppercase tracking-widest text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {itemsToPrint.map((item, idx) => {
              const pending = item.total - (item.delivered + item.current);
              return (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-6 px-2 font-bold uppercase text-sm">{item.name}</td>
                  <td className="py-6 px-2 text-center text-xs uppercase font-bold text-gray-600">T{item.size} - {item.color}</td>
                  <td className="py-6 px-2 text-center font-black text-3xl">x {item.current}</td>
                  <td className="py-6 px-2 text-right text-[10px] font-black uppercase text-gray-500 italic">
                    {pending > 0 ? `Quedan ${pending}` : 'ENTREGA FINAL'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* RESUMEN DE CUENTA AUTOMÁTICO AL FINAL DEL PAPEL */}
        <div className="flex justify-end mt-auto mb-20">
          <div className="border-2 border-black p-6 rounded-[2rem] min-w-[350px] bg-white">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-4 text-center italic">Estado Financiero del Pedido</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase italic">Valor Total Acordado:</span>
                <span className="text-lg font-black">${totalAgordado.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center text-emerald-600">
                <span className="text-xs font-bold uppercase italic">Seña / Entregado:</span>
                <span className="text-lg font-black">${senaRecibida.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t-2 border-black">
                <span className="text-sm font-black uppercase italic">Saldo a Cancelar:</span>
                <span className="text-2xl font-black italic tracking-tighter">${saldoRestante.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FIRMAS */}
        <div className="grid grid-cols-2 gap-20 px-10 pb-10">
          <div className="border-t-2 border-black pt-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Responsable Raíces</p>
          </div>
          <div className="border-t-2 border-black pt-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recibí Conforme</p>
          </div>
        </div>
      </div>

      <style>{`
        @media screen { .screen-only { display: flex; } }
        @media print {
          body * { visibility: hidden; }
          .screen-only { display: none !important; }
          #remito-impreso, #remito-impreso * { visibility: visible; }
          #remito-impreso {
            position: absolute; left: 0; top: 0; width: 210mm !important;
            padding: 15mm 15mm 20mm 15mm !important; box-sizing: border-box;
            background: white !important; -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4; margin: 0mm !important; }
          html, body { background: white !important; height: auto; overflow: visible; }
        }
      `}</style>
    </div>
  );
};