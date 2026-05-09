import { memo, useMemo } from 'react';

interface Variation {
  quantityOrdered: number;
}

interface OrderItem {
  variations?: Variation[];
}

interface Order {
  id: string;
  customerName: string;
  items?: OrderItem[];
}

interface OrderLabelProps {
  order: Order;
}

const calculateTotalItems = (items?: OrderItem[]): number => {
  if (!items?.length) return 0;

  return items.reduce((total, item) => {
    const subtotal =
      item.variations?.reduce(
        (sum, variation) => sum + variation.quantityOrdered,
        0
      ) ?? 0;

    return total + subtotal;
  }, 0);
};

const formatShortId = (id: string): string => {
  if (!id) return 'S/N';

  return id.includes('-')
    ? id.split('-')[0].toUpperCase()
    : id.toUpperCase();
};

// 🚀 OPTIMIZACIÓN: Envolvemos en memo para evitar re-renders innecesarios
export const OrderLabel = memo(({ order }: OrderLabelProps) => {
  if (!order) return null;

  const totalItems = useMemo(
    () => calculateTotalItems(order.items),
    [order.items]
  );

  const shortId = useMemo(
    () => formatShortId(order.id),
    [order.id]
  );

  // 💡 CORRECCIÓN: Calculamos la fecha en tiempo real (sin useMemo) 
  // para que si se imprime más tarde, salga la hora exacta del remito.
  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());

  return (
    <div
      className="
        bg-white text-black
        p-6
        border-2 border-black
        w-80
        font-sans
        flex flex-col gap-4
      "
    >
      {/* HEADER */}
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
        <h2 className="text-2xl font-black tracking-tighter">
          RAÍCES
        </h2>

        <div className="text-sm font-black border border-slate-900 px-2 py-1 uppercase">
          #{shortId}
        </div>
      </div>

      {/* CLIENTE */}
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
          Cliente
        </p>

        <p className="text-lg font-black uppercase leading-tight break-words">
          {order.customerName}
        </p>
      </div>

      {/* TOTAL */}
      <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
        <p className="text-xs uppercase font-bold tracking-widest">
          Prendas Totales
        </p>

        <p className="text-2xl font-black tabular-nums">
          {totalItems}
        </p>
      </div>

      {/* ALERTA */}
      {totalItems <= 0 && (
        <div className="text-xs font-bold text-rose-600 uppercase text-center border border-rose-600 py-1">
          Sin prendas registradas
        </div>
      )}

      {/* FOOTER */}
      <div className="flex justify-between items-end pt-4 mt-auto border-t-2 border-slate-900">
        <p className="text-[10px] font-black tracking-widest">
          {formattedDate}
        </p>

        {/* Barcode fake */}
        <div className="text-3xl tracking-[0.2em] select-none opacity-70">
          ||||| || |||| ||
        </div>
      </div>
    </div>
  );
});

// Buenas prácticas: nombrar el componente cuando usamos memo
OrderLabel.displayName = 'OrderLabel';