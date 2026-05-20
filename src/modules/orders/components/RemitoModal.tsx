import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { X, Printer } from 'lucide-react';

interface RemitoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export const RemitoModal: React.FC<RemitoModalProps> = ({ isOpen, onClose, order }) => {
  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Remito_${order?.customerName || order?.customer_name || 'Generico'}_${new Date().toLocaleDateString('es-AR')}`,
  });

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl w-full max-w-4xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Generador de Remitos</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Pedido de: {order.customerName || order.customer_name}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase transition-all shadow-lg shadow-blue-900/20"
            >
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button 
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenedor escroleable para la previsualización */}
        <div className="p-8 bg-slate-950 overflow-y-auto flex-1 flex justify-center">
          
          {/* AQUÍ EMPIEZA LA HOJA A4 DEL REMITO PARA IMPRIMIR */}
          <div 
            ref={componentRef} 
            className="bg-white text-black p-10 shadow-lg mx-auto"
            style={{ width: '210mm', minHeight: '297mm', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} 
          >
            {/* Encabezado */}
            <header className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-wider uppercase text-slate-900">RAÍCES</h1>
                <p className="text-sm mt-1 text-slate-700 font-medium">Soluciones Textiles Integrales</p>
                <p className="text-sm text-slate-600">Berisso, Buenos Aires</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-slate-800">REMITO</h2>
                <p className="text-sm font-semibold mt-2">Nº Pedido: <span className="font-normal">{order.id?.slice(0,8).toUpperCase()}</span></p>
                <p className="text-sm font-semibold">Fecha: <span className="font-normal">{new Date().toLocaleDateString('es-AR')}</span></p>
              </div>
            </header>

            {/* Datos del Cliente */}
            <section className="mb-8 border border-slate-300 p-4 rounded-lg bg-slate-50">
              <p className="mb-1"><strong className="text-slate-800">Cliente:</strong> {order.customerName || order.customer_name}</p>
              <p><strong className="text-slate-800">Estado de Operación:</strong> {order.status === 'PENDING' ? 'Pendiente' : order.status === 'PARTIAL' ? 'Parcial' : 'Completado'}</p>
            </section>

            {/* Tabla de Artículos */}
            <table className="w-full text-left border-collapse mb-8 border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="py-3 px-4 text-sm font-bold text-slate-800 border-r border-slate-200">Cant.</th>
                  <th className="py-3 px-4 text-sm font-bold text-slate-800 border-r border-slate-200">Descripción del Artículo</th>
                  <th className="py-3 px-4 text-sm font-bold text-slate-800">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any, itemIndex: number) => 
                  item.variations?.map((v: any, vIndex: number) => (
                    <tr key={`${itemIndex}-${vIndex}`} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-3 px-4 border-r border-slate-200 font-semibold">{v.quantityDelivered || v.quantityOrdered || 0}</td>
                      <td className="py-3 px-4 border-r border-slate-200">
                        <span className="font-medium text-slate-900">{item.productName}</span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium mr-2">T: {v.size}</span>
                        {v.color && <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium">{v.color}</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pie de página / Firmas */}
            <footer className="mt-32 flex justify-between items-end px-10">
              <div className="w-2/5 text-center border-t border-slate-800 pt-2">
                <p className="text-sm font-semibold text-slate-800">Firma Entregado</p>
              </div>
              <div className="w-2/5 text-center border-t border-slate-800 pt-2">
                <p className="text-sm font-semibold text-slate-800">Firma Recibido (Conformidad)</p>
              </div>
            </footer>
          </div>
        </div>

      </div>
    </div>
  );
};