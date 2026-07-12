import { useEffect, useCallback, memo, useRef } from "react";
import { Printer, X } from "lucide-react";

interface GiftCardProps {
  message: string;
  onClose: () => void;
}

export const GiftCardPrintable = memo(({ message, onClose }: GiftCardProps) => {
  const printButtonRef = useRef<HTMLButtonElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    printButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handlePrint = useCallback(() => {
    globalThis.print();
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      role="dialog"
  aria-modal="true"
  aria-labelledby="gift-card-title"
  aria-describedby="gift-card-message"
  onMouseDown={handleBackdropClick}
  tabIndex={-1} /* 🔥 Agrega esto para solucionar la advertencia de interactividad */
  className="gift-card-print-root fixed inset-0 z-[100]..."
>
      <div className="gift-card-actions flex gap-3 mb-6 print:hidden">
        <button
          ref={printButtonRef}
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-lg hover:bg-indigo-500 transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <Printer aria-hidden="true" size={16} strokeWidth={2.5} />
          Imprimir
        </button>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-5 py-3 bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-lg hover:bg-rose-600 transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <X aria-hidden="true" size={16} strokeWidth={2.5} />
          Cerrar
        </button>
      </div>

      <div className="gift-card-print-card w-[100mm] h-[150mm] max-w-full max-h-[calc(100vh-6rem)] bg-[#f8fafc] p-3 relative overflow-hidden box-border shadow-2xl print:m-0 print:shadow-none">
        <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-indigo-200 rounded-full mix-blend-multiply blur-2xl opacity-70" />
        <div className="absolute top-[-20px] right-[-50px] w-48 h-48 bg-cyan-200 rounded-full mix-blend-multiply blur-2xl opacity-70" />
        <div className="absolute bottom-[-50px] left-10 w-48 h-48 bg-sky-100 rounded-full mix-blend-multiply blur-2xl opacity-70" />

        <div className="relative z-10 h-full flex flex-col bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] rounded-2xl p-6">
          <div className="text-center mt-4">
            <div className="inline-block border border-slate-300 bg-white/50 px-3 py-1 rounded-full mb-3 shadow-sm">
              <span className="text-[6px] font-black tracking-[0.3em] text-slate-400 uppercase">
                Una división de Raíces Holding
              </span>
            </div>

            <h1
              id="gift-card-title"
              className="text-3xl font-black tracking-widest text-slate-800 flex items-center justify-center gap-1"
            >
              RAÍCES{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-cyan-500">
                LAB
              </span>
            </h1>
            <p className="text-[7px] font-bold tracking-[0.4em] text-slate-500 uppercase mt-1">
              Fabricación Digital y 3D
            </p>
          </div>

          <div className="w-8 h-1 bg-linear-to-r from-indigo-300 to-cyan-300 mx-auto my-6 rounded-full opacity-50"></div>

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <p
              id="gift-card-message"
              className="text-slate-700 text-sm font-medium text-center leading-relaxed italic px-2 wrap-break-word text-balance"
            >
              “{message}”
            </p>
          </div>

          <div className="mt-auto flex flex-col items-center gap-2 mb-2">
            <div className="w-full h-px bg-linear-to-r from-transparent via-slate-200 to-transparent mb-2"></div>
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[7px] font-black tracking-[0.2em] text-slate-400 uppercase">
                BERISSO, ARG
              </span>
              <span className="text-[7px] font-black tracking-[0.2em] text-slate-400 uppercase">
                Grupo Raíces
              </span>
            </div>
          </div>
        </div>
      </div>

      <style type="text/css" media="print">
        {`
          @page { size: 100mm 150mm; margin: 0; }
          html,
          body,
          #root {
            width: 100mm;
            height: 150mm;
            margin: 0;
            overflow: hidden;
          }
          body { 
            margin: 0; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          body * {
            visibility: hidden;
          }
          .gift-card-print-root {
            position: fixed !important;
            inset: 0 auto auto 0 !important;
            width: 100mm !important;
            height: 150mm !important;
            padding: 0 !important;
            background: #ffffff !important;
            display: block !important;
            visibility: visible !important;
          }
          .gift-card-print-root * {
            visibility: visible !important;
          }
          .gift-card-actions {
            display: none !important;
          }
          .gift-card-print-card {
            width: 100mm !important;
            height: 150mm !important;
            max-width: none !important;
            max-height: none !important;
            box-shadow: none !important;
          }
        `}
      </style>
</div>
  );
   }); 