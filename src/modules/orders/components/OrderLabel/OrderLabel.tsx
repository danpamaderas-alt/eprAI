import { memo, useMemo } from 'react';
import type { Order } from '../../../../shared/types/order.types';

interface OrderLabelProps {
  readonly order: Order;
  // Propiedad inyectable opcional para el momento de impresión
  readonly printTimestamp?: Date; 
}

// 🚀 OPTIMIZACIÓN: Instanciación única del formateador (fuera del render loop)
const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});

const calculateTotalItems = (items?: Order['items']): number => {
  if (!items?.length) return 0;
  return items.reduce((total, item) => {
    const subtotal = item.variations?.reduce(
      (sum, variation) => sum + (Number(variation.quantityOrdered) || 0), 0
    ) ?? 0;
    return total + subtotal;
  }, 0);
};

const formatShortId = (id: string): string => {
  if (!id) return 'S/N';
  return id.includes('-') ? id.split('-')[0].toUpperCase() : id.toUpperCase();
};

export const OrderLabel = memo(({ order, printTimestamp = new Date() }: OrderLabelProps) => {
  // useMemo justificado solo por la iteración de arrays potencialmente grandes
  const totalItems = useMemo(() => calculateTotalItems(order?.items), [order?.items]);

  if (!order) return null;
  
  // SIN useMemo: Es una operación de string trivial, es más rápido ejecutarla directo.
  const shortId = formatShortId(order.id);
  const formattedDate = DATE_FORMATTER.format(printTimestamp);

  return (
    <div className="bg-white text-black p-6 border-2 border-black w-full max-w-[80mm] font-sans flex flex-col gap-4 print:max-w-none print:w-full print:border-none print:p-0">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
        <h2 className="text-2xl font-black tracking-tighter">RAÍCES</h2>
        <div className="text-sm font-black border border-slate-900 px-2 py-1 uppercase">
          #{shortId}
        </div>
      </div>

      {/* CLIENTE */}
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Cliente</p>
        <p className="text-lg font-black uppercase leading-tight wrap-break-word">
          {order.customerName}
        </p>
      </div>

      {/* TOTAL */}
      <div className="bg-slate-900 text-white p-3 flex justify-between items-center print:border-2 print:border-black print:bg-transparent print:text-black">
        <p className="text-xs uppercase font-bold tracking-widest">Prendas Totales</p>
        <p className="text-2xl font-black tabular-nums">{totalItems}</p>
      </div>

      {/* ALERTA */}
      {totalItems <= 0 && (
        <div className="text-xs font-bold text-rose-600 uppercase text-center border border-rose-600 py-1">
          Sin prendas registradas
        </div>
      )}

      {/* FOOTER */}
      <div className="flex justify-between items-end pt-4 mt-auto border-t-2 border-slate-900">
        <p className="text-[10px] font-black tracking-widest">{formattedDate}</p>

        {/* TODO: Reemplazar por componente <Barcode value={order.id} /> en el futuro */}
        <div 
          className="text-3xl tracking-[0.2em] select-none opacity-70"
          aria-label="Código de barras del remito"
        >
          ||||| || |||| ||
        </div>
      </div>
    </div>
  );
});

OrderLabel.displayName = 'OrderLabel';