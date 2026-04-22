import React from 'react';

interface GiftCardProps {
  message: string;
  onClose: () => void;
}

export const GiftCardPrintable: React.FC<GiftCardProps> = ({ message, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      
      {/* Botonera superior */}
      <div className="flex gap-4 mb-6 print:hidden">
        <button onClick={handlePrint} className="px-6 py-3 bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg hover:bg-indigo-400 transition-colors">
          ✨ Imprimir Tarjeta
        </button>
        <button onClick={onClose} className="px-6 py-3 bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg hover:bg-rose-500 transition-colors">
          ✕ Cerrar
        </button>
      </div>

      {/* LA TARJETA - Estructura Holding */}
      <div className="w-[100mm] h-[150mm] bg-[#f8fafc] p-3 print:m-0 relative overflow-hidden box-border shadow-2xl print:shadow-none">

        {/* 🎨 Blobs de colores de la división tecnológica */}
        <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
        <div className="absolute top-[-20px] right-[-50px] w-48 h-48 bg-cyan-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>
        <div className="absolute bottom-[-50px] left-10 w-48 h-48 bg-blue-100 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>

        {/* 🪟 Contenedor de Vidrio */}
        <div className="relative z-10 h-full flex flex-col bg-white/60 backdrop-blur-xl border border-white shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] rounded-3xl p-6">
          
          {/* Header del Holding */}
          <div className="text-center mt-4">
            {/* Indicador de jerarquía (Holding) */}
            <div className="inline-block border border-slate-300 px-3 py-1 rounded-full mb-3">
              <span className="text-[6px] font-black tracking-[0.3em] text-slate-400 uppercase">
                Una división de Raíces Holding
              </span>
            </div>
            
            {/* Marca específica de la división */}
            <h1 className="text-3xl font-black tracking-widest text-slate-800 flex items-center justify-center gap-1">
              RAÍCES <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">LAB</span>
            </h1>
            <p className="text-[7px] font-bold tracking-[0.4em] text-slate-500 uppercase mt-1">
              Fabricación Digital & 3D
            </p>
          </div>

          {/* Divisor estético */}
          <div className="w-8 h-1 bg-gradient-to-r from-indigo-300 to-cyan-300 mx-auto my-6 rounded-full opacity-50"></div>

          {/* Cuerpo del mensaje */}
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-700 text-sm font-medium text-center leading-relaxed italic px-2">
              "{message}"
            </p>
          </div>

          {/* Footer Corporativo pero Aesthetic */}
          <div className="mt-auto flex flex-col items-center gap-2 mb-2">
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-2"></div>
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[7px] font-black tracking-[0.2em] text-slate-400 uppercase">
                BERISSO, ARG
              </span>
              <span className="text-[7px] font-black tracking-[0.2em] text-slate-400 uppercase">
                GRUPO RAÍCES ©
              </span>
            </div>
          </div>

        </div>
      </div>

      <style type="text/css" media="print">
        {`
          @page { size: 100mm 150mm; margin: 0; }
          body { 
            margin: 0; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
        `}
      </style>
    </div>
  );
};