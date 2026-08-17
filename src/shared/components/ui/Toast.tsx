import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { useToastStore } from '../../../store/useToastStore';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const typeConfig: Record<ToastType, { icon: React.ReactNode; styles: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    styles: 'bg-success-600 text-white',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    styles: 'bg-danger-600 text-white',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    styles: 'bg-warning-600 text-white',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    styles: 'bg-info-600 text-white',
  },
};

export { useToastStore as useToast };

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none" aria-live="polite" aria-label="Notificaciones">
      {toasts.map((t) => {
        const config = typeConfig[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg pointer-events-auto animate-in slide-in-from-right-full duration-300',
              config.styles,
            )}
          >
            <span className="shrink-0">{config.icon}</span>
            <span className="text-xs font-bold flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-1 rounded-xl hover:bg-white/20 transition-all focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
