export const DELIVERY_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400',
} as const;

export const DELIVERY_STATUS_LABELS = {
  PENDING: 'PENDIENTE',
  IN_TRANSIT: 'EN CAMINO',
  DELIVERED: 'ENTREGADO',
  FAILED: 'RECHAZADO',
} as const;

export const ORDER_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PENDIENTE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PARTIAL: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  DELIVERED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
} as const;

export const CUSTOMER_TYPES = [
  { id: 'MINORISTA', label: 'Minorista / Consumidor', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { id: 'MAYORISTA', label: 'Mayorista / Revendedor', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { id: 'INSTITUCION', label: 'Institución / Empresa', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
] as const;

export const PAYMENT_METHODS = ['EFECTIVO', 'MERCADO_PAGO', 'BANCO', 'CTA_CTE'] as const;
