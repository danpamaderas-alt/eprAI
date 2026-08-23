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

// ─────────────────────────────────────────────
// FECHA Y HORA
// ─────────────────────────────────────────────

/** dd/mm/aaaa */
export const formatDate = (value: string | number | Date) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** dd/mm/aaaa hh:mm (24h) */
export const formatDateTime = (value: string | number | Date) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
};

/** hh:mm:ss para relojes */
export const formatTime = (value: string | number | Date) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
};

/** Convierte horas decimales a HH:MM (soporta >24h, ej. 25.5 → 25:30) */
export const hoursToTime = (hours: number) => {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

/** Convierte HH:MM (o "HH:MM:SS") a horas decimales */
export const timeToHours = (time: string) => {
  const m = time.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return 0;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ss = m[3] ? parseInt(m[3], 10) : 0;
  return hh + mm / 60 + ss / 3600;
};
