import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  toast: (message, options) => {
    const id = ++toastId;
    const type = options?.type ?? 'info';
    const duration = options?.duration ?? 4000;

    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));

    setTimeout(() => get().dismiss(id), duration);

    return id;
  },

  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
