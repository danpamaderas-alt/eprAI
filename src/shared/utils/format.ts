export const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export const USD = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export const formatNumber = (n: number) => n.toLocaleString('es-AR');

export const formatPercent = (n: number) => `${n.toFixed(1)}%`;
