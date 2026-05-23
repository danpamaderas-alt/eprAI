import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export const RemitoEnvio = () => {
  const componentRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Remito_Raices_001',
    pageStyle: `
      @media print {
        @page { size: A4; margin: 20mm; }
        body { -webkit-print-color-adjust: exact; }
      }
    `
  });

  return (
    // CAMBIO AQUI: Quitamos max-w-4xl y dejamos que el contenedor padre (el Grid) maneje el espacio.
    <div className="p-2 w-full flex flex-col items-center">
      
      <div className="mb-6 flex justify-end w-full max-w-[210mm] print:hidden">
        <button 
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          Imprimir / PDF
        </button>
      </div>

      {/* Hoja A4 */}
      {/* CAMBIO AQUI: Usamos minWidth en lugar de width fijo para asegurar la proporción */}
      <div 
        ref={componentRef} 
        className="bg-white text-slate-900 p-10 shadow-2xl border border-slate-200 mx-auto print-container"
        style={{ minWidth: '210mm', minHeight: '297mm', maxWidth: '210mm' }} 
      >
        {/* Encabezado */}
        <header className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">RAÍCES</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Soluciones Textiles Integrales</p>
          </div>
          <div className="text-right border-l-2 border-blue-600 pl-4">
            <h2 className="text-lg font-black text-blue-600 uppercase">Remito</h2>
            <p className="text-sm">Nº 0001-000045</p>
            <p className="text-sm">Fecha: 20/05/2026</p>
          </div>
        </header>

        {/* ... (El resto de tu código queda exactamente igual, desde Datos Cliente hacia abajo) ... */}
         <section className="bg-slate-50 p-6 rounded-lg mb-8 border border-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Cliente</p>
              <p className="font-bold">Registro Provincial de las Personas</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Dirección</p>
              <p className="font-medium text-slate-700">La Plata, Buenos Aires</p>
            </div>
          </div>
        </section>

        <table className="w-full mb-12">
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-300">
              <th className="py-3 text-left">Cant.</th>
              <th className="py-3 text-left">Descripción</th>
              <th className="py-3 text-right">Sisa</th>
              <th className="py-3 text-right">Precio Unit.</th>
              <th className="py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[1, 2].map((i) => (
              <tr key={i} className="text-sm">
                <td className="py-4 font-bold">150</td>
                <td className="py-4">Chombas piqué logo DTF</td>
                <td className="py-4 text-right">54</td>
                <td className="py-4 text-right">$15.000</td>
                <td className="py-4 text-right font-bold">$2.250.000</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-900">
            <tr>
              <td colSpan={4} className="py-4 text-right font-bold text-lg">TOTAL</td>
              <td className="py-4 text-right font-black text-lg">$3.000.000</td>
            </tr>
          </tfoot>
        </table>

        <footer className="mt-20 grid grid-cols-2 gap-20">
          <div className="border-t border-slate-900 pt-2 text-center text-xs font-bold uppercase">Entregado</div>
          <div className="border-t border-slate-900 pt-2 text-center text-xs font-bold uppercase">Recibido (Conformidad)</div>
        </footer>

      </div>
    </div>
  );
};