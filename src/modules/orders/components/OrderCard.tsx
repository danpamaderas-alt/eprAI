import { useState } from 'react';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const OrderCard = ({ order }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Lógica de impresión nativa
  const handlePrint = () => {
    window.print();
  };

  const totalOrdered = order.items?.reduce((acc: number, item: any) => acc + item.variations.reduce((sum: number, v: any) => sum + v.quantityOrdered, 0), 0) || 0;
  const totalDelivered = order.items?.reduce((acc: number, item: any) => acc + item.variations.reduce((sum: number, v: any) => sum + v.quantityDelivered, 0), 0) || 0;

  return (
    <>
      {/* =========================================
          1. LA TARJETA VISUAL (Se oculta al imprimir)
          ========================================= */}
      <div className={`print:hidden bg-white rounded-3xl border transition-all duration-300 ${isExpanded ? 'border-blue-500 shadow-xl shadow-blue-500/10' : 'border-slate-200 shadow-sm'}`}>
        <div onClick={() => setIsExpanded(!isExpanded)} className="p-5 cursor-pointer flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-3 rounded-2xl">📦</div>
            <div>
              <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">{order.customerName}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.businessUnit} • Vence: {new Date(order.dueDate).toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-slate-800">{ARS.format(order.totalAmount)}</p>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Seña: {ARS.format(order.advancePayment)}</p>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-slate-100 p-5 bg-slate-50/50 rounded-b-3xl">
            <div className="space-y-3 mb-4">
              {order.items?.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100">
                  <p className="font-black text-sm text-slate-800 uppercase">{item.productName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {item.variations.map((v: any) => (
                      <div key={v.id} className="bg-slate-50 p-2 rounded-xl text-[10px] font-black flex justify-between">
                        <span className="uppercase text-slate-500">{v.size} / {v.color}</span>
                        <span>{v.quantityDelivered} / {v.quantityOrdered}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button className="px-4 py-2 bg-white text-slate-600 font-black text-xs uppercase rounded-xl border hover:bg-slate-50">✏️ Editar</button>
              <button onClick={handlePrint} className="px-4 py-2 bg-blue-50 text-blue-600 font-black text-xs uppercase rounded-xl border border-blue-200 hover:bg-blue-100">🖨️ Imprimir</button>
              <button className="px-6 py-2 bg-slate-900 text-white font-black text-xs uppercase rounded-xl shadow-lg hover:bg-slate-800">🚚 Entregar</button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================
          2. EL REMITO OCULTO (Solo visible al imprimir)
          ========================================= */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-mono text-black">
        <div className="max-w-md mx-auto border-2 border-black p-6">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-black uppercase tracking-widest">{order.businessUnit.replace('_', ' ')}</h1>
            <p className="text-sm">REMITO DE ENTREGA</p>
            <p className="text-xs mt-2">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
          </div>
          
          <div className="mb-6 text-sm">
            <p><strong>CLIENTE:</strong> {order.customerName}</p>
            <p><strong>VENCIMIENTO:</strong> {new Date(order.dueDate).toLocaleDateString('es-AR')}</p>
          </div>

          <table className="w-full text-sm mb-6 text-left">
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
                    <td className="py-2 font-bold">{v.quantityOrdered}</td>
                    <td className="py-2 uppercase">{item.productName} ({v.size} - {v.color})</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-black pt-4 text-right mb-8 text-sm">
            <p>TOTAL PEDIDO: {ARS.format(order.totalAmount)}</p>
            <p>SEÑA ABONADA: {ARS.format(order.advancePayment)}</p>
            <p className="font-black text-lg mt-2">SALDO: {ARS.format(order.totalAmount - order.advancePayment)}</p>
          </div>

          <div className="text-center text-xs mt-12 border-t border-black pt-4">
            <p>Recibí conforme:</p>
            <p className="mt-8 border-b border-black w-48 mx-auto"></p>
            <p className="mt-1">Firma / Aclaración</p>
          </div>
        </div>
      </div>
    </>
  );
};