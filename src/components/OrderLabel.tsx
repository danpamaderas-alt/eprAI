import React from 'react';

// 1. 🛡️ CHAU "ANY": Definimos exactamente qué trae el pedido para evitar cuelgues
interface OrderLabelProps {
  order: {
    id: string;
    customer_name?: string;
    customerName?: string;
    items?: Array<{
      variations?: Array<{ quantityOrdered: number | string | null }>;
    }>;
  };
}

// 2. 🧠 MATEMÁTICA SEGURA AFUERA DEL HTML: Blindado contra valores nulos o textos
const calculateTotalItems = (items?: OrderLabelProps['order']['items']): number => {
  if (!items) return 0;
  
  return items.reduce((total, item) => {
    const itemQuantity = item.variations?.reduce((sum, v) => {
      const qty = Number(v.quantityOrdered || 0);
      return sum + (isNaN(qty) ? 0 : qty); // Si no es número, suma 0.
    }, 0) || 0;
    
    return total + itemQuantity;
  }, 0);
};

export const OrderLabel = ({ order }: OrderLabelProps) => {
  if (!order) return null;

  const totalItems = calculateTotalItems(order.items);
  
  // Normalizamos nombres por si vienen distinto de la base de datos
  const shortId = order.id ? order.id.split('-')[0].toUpperCase() : 'S/N';
  const clientName = order.customer_name || order.customerName || 'Cliente sin nombre';

  return (
    <div className="bg-white text-black p-6 border-2 border-black w-80 font-sans flex flex-col gap-4">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2">
        <h2 className="text-2xl font-black tracking-tighter">RAÍCES</h2>
        <p className="text-sm font-black border border-black px-2 py-1 rounded-none uppercase">
          Pedido: #{shortId}
        </p>
      </div>

      {/* DATOS DEL CLIENTE */}
      <div>
        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Para:</p>
        <p className="text-xl font-black uppercase leading-tight truncate">
          {clientName}
        </p>
      </div>

      {/* CANTIDAD TOTAL */}
      <div className="bg-black text-white p-3 flex justify-between items-center">
        <p className="text-xs uppercase font-bold tracking-widest">Prendas Totales</p>
        <p className="text-2xl font-black">{totalItems}</p>
      </div>

      {/* ALERTA DE PEDIDO VACÍO */}
      {totalItems === 0 && (
        <p className="text-xs font-bold text-rose-600 uppercase text-center border border-rose-600 py-1">
          ⚠️ Sin prendas registradas
        </p>
      )}

      {/* PIE Y FECHA */}
      <div className="flex justify-between items-end pt-4 mt-auto border-t-2 border-black">
        <p className="text-sm font-black">{new Date().toLocaleDateString('es-AR')}</p>
        
        {/* Código de barras estético */}
        <div className="font-barcode text-4xl opacity-80 tracking-widest pointer-events-none">
          ||||| | ||| || |||
        </div>
      </div>
      
    </div>
  );
};