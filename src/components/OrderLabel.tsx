import React from 'react';

export const OrderLabel = ({ order }: any) => {
  if (!order) return null;

  // Calculamos cuántas prendas hay en total en el pedido
  const totalItems = order.items?.reduce((acc: number, item: any) => {
    return acc + item.variations?.reduce((sum: number, v: any) => sum + v.quantityOrdered, 0);
  }, 0) || 0;

  return (
    <div className="w-[100mm] h-[150mm] bg-white text-black p-6 flex flex-col font-sans border border-gray-200">
      
      {/* CABECERA */}
      <div className="border-b-4 border-black pb-4 mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter">RAÍCES</h1>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-1">Berisso, Buenos Aires</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase border border-black px-2 py-1 rounded-md">
            Pedido: #{order.id?.split('-')[0].toUpperCase()}
          </p>
        </div>
      </div>

      {/* DESTINATARIO */}
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Entregar a:</p>
        <h2 className="text-3xl font-black uppercase leading-none mb-4">
          {order.customer_name || order.customerName}
        </h2>
        
        {/* INFO DEL BULTO */}
        <div className="mt-6 border-2 border-black p-4 rounded-xl bg-gray-50">
          <p className="text-xs font-bold uppercase mb-2 border-b border-gray-300 pb-2">Detalle del Bulto</p>
          <p className="text-lg font-black">{totalItems} <span className="text-sm font-bold text-gray-600">PRENDAS EN TOTAL</span></p>
        </div>
      </div>

      {/* PIE DE ETIQUETA / FECHA */}
      <div className="border-t-2 border-black pt-4 mt-4 flex justify-between items-end">
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">Fecha de Empaque</p>
          <p className="text-sm font-black">{new Date().toLocaleDateString('es-AR')}</p>
        </div>
        {/* Un código de barras falso de adorno para que quede pro */}
        <div className="font-barcode text-4xl opacity-80 tracking-widest">
          ||||| | ||| || |||
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};