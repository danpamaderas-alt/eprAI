import { useEffect, type ReactNode, type FormEvent } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: (e: FormEvent) => void;
  submitLabel?: string;
  submitColor?: string;
  showCancel?: boolean;
  width?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel,
  submitColor = 'bg-brand-600 hover:bg-brand-500',
  showCancel = true,
  width = 'max-w-lg',
}: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${width} bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            if (onSubmit) onSubmit(e);
          }}
        >
          <div className="p-6 space-y-5">{children}</div>

          {(submitLabel || showCancel) && (
            <div className="flex gap-3 p-6 pt-0">
              {showCancel && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
              )}
              {submitLabel && (
                <button
                  type="submit"
                  className={`flex-1 py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${submitColor}`}
                >
                  {submitLabel}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
