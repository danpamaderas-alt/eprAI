import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export const RemitoEnvio = () => {
  // Referencia al contenedor que queremos imprimir
  const componentRef = useRef(null);

  // Función que dispara la impresión/PDF
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: 'Remito_Envio_Raices_001',
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-end">
        <button 
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* Contenedor del documento. Usamos A4 proporciones (aprox) y fondo blanco para la impresión */}
      <div 
        ref={componentRef} 
        className="bg-white text-black p-10 shadow-lg mx-auto border"
        style={{ width: '210mm', minHeight: '297mm' }} 
      >
        {/* Encabezado */}
        <header className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-wider uppercase">RAÍCES</h1>
            <p className="text-sm mt-1">Soluciones Textiles Integrales</p>
            <p className="text-sm">Berisso, Buenos Aires</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-700">REMITO</h2>
            <p className="text-sm font-semibold mt-2">Nº: <span className="font-normal">0001-000045</span></p>
            <p className="text-sm font-semibold">Fecha: <span className="font-normal">20/05/2026</span></p>
          </div>
        </header>

        {/* Datos del Cliente */}
        <section className="mb-8 border border-gray-300 p-4 rounded">
          <p><strong>Cliente:</strong> Registro Provincial de las Personas</p>
          <p><strong>Dirección:</strong> La Plata, Buenos Aires</p>
        </section>

        {/* Tabla de Artículos */}
        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="py-2 px-4">Cant.</th>
              <th className="py-2 px-4">Descripción del Artículo</th>
              <th className="py-2 px-4">Sisa (cm)</th>
              <th className="py-2 px-4">Precio Unit.</th>
              <th className="py-2 px-4">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-3 px-4">150</td>
              <td className="py-3 px-4">Chombas de piqué institucional con logo DTF</td>
              <td className="py-3 px-4">54</td>
              <td className="py-3 px-4">$15,000</td>
              <td className="py-3 px-4">$2,250,000</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-3 px-4">50</td>
              <td className="py-3 px-4">Chombas de piqué institucional con logo DTF</td>
              <td className="py-3 px-4">58</td>
              <td className="py-3 px-4">$15,000</td>
              <td className="py-3 px-4">$750,000</td>
            </tr>
          </tbody>
        </table>

        {/* Pie de página / Firmas */}
        <footer className="mt-20 flex justify-between items-end">
          <div className="w-1/3 text-center border-t border-black pt-2">
            <p className="text-sm">Firma Entregado</p>
          </div>
          <div className="w-1/3 text-center border-t border-black pt-2">
            <p className="text-sm">Firma Recibido (Conformidad)</p>
          </div>
        </footer>
      </div>
    </div>
  );
};