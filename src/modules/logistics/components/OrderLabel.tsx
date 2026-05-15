import React from 'react';
import Barcode from 'react-barcode';

interface OrderLabelProps {
  order: any;
}

export const OrderLabel = React.forwardRef<HTMLDivElement, OrderLabelProps>(({ order }, ref) => {
  if (!order) return null;

  const totalItems = order.items?.reduce((acc: number, item: any) => 
    acc + item.variations?.reduce((vAcc: number, v: any) => vAcc + v.quantityOrdered, 0), 0) || 0;

  return (
    <div ref={ref} className="p-4 bg-white text-black w-[100mm] h-[50mm] flex flex-col justify-between border border-slate-200">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-black uppercase italic leading-none">RAÍCES</h2>
          <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">Logística e Identificación</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase">{new Date().toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      <div className="border-y border-black py-2 my-1">
        <p className="text-[8px] font-black uppercase text-slate-500">Destinatario:</p>
        <p className="text-lg font-black uppercase truncate">{order.customerName || order.customer_name}</p>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex flex-col items-center">
           <Barcode 
              value={order.id.substring(0, 8).toUpperCase()} 
              width={1.2} 
              height={30} 
              fontSize={10}
              margin={0}
           />
        </div>
        <div className="text-right">
           <p className="text-[8px] font-black uppercase italic">Unidades: <span className="text-sm not-italic">{totalItems}</span></p>
           <p className="text-[8px] font-bold mt-1 uppercase">Pistolear para Despacho</p>
        </div>
      </div>
    </div>
  );
});