import { resolveImageSrc } from '../../../shared/utils/designStorage';
import type { SublimationDesign } from '../types';

type JsPdfDoc = InstanceType<(typeof import('jspdf'))['default']>;

const HEADERS = [
  'Nombre',
  'Categoría',
  'Estado',
  'Plataforma',
  'Formato',
  'DPI',
  'Proyecto',
  'Licencia',
  'POD',
  'Precio',
  'Diseñador',
  'Link',
] as string[];

const STATUSES = ['Nuevo', 'Descargado', 'En Preparación', 'Listo para Imprimir', 'Usado', 'Archivado'] as const;

const csvEscape = (value: unknown): string => {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const countByStatus = (designs: SublimationDesign[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const s of STATUSES) counts[s] = 0;
  for (const d of designs) counts[d.status] = (counts[d.status] ?? 0) + 1;
  return counts;
};

const totalPrice = (designs: SublimationDesign[]): number =>
  designs.reduce((acc, d) => acc + (d.price ?? 0), 0);

export function exportDesignsCSV(designs: SublimationDesign[], filename = 'repositorio-sublimacion') {
  const counts = countByStatus(designs);

  const summaryRows = [
    ['Resumen por estado', 'Cantidad'],
    ...STATUSES.map((s) => [s, String(counts[s] ?? 0)]),
    ['TOTAL DISEÑOS', String(designs.length)],
    ['COSTO TOTAL', totalPrice(designs).toFixed(2)],
  ];

  const dataRows = designs.map((d) => [
    d.name,
    d.category ?? '',
    d.status,
    d.platform ?? '',
    d.file_format ?? '',
    d.dpi ?? '',
    d.project_dest ?? '',
    d.license_type ?? '',
    d.pod_permitido ? 'Sí' : 'No',
    d.price ?? '',
    d.designer ?? '',
    d.link_descarga ?? '',
  ]);

  const csv = [...summaryRows, [], HEADERS, ...dataRows]
    .map((r) => r.map(csvEscape).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const toDataURL = async (url: string, maxBytes = 2_000_000): Promise<string | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > maxBytes) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
};

const imageFormat = (dataUrl: string | null): 'JPEG' | 'PNG' | 'WEBP' => {
  if (!dataUrl) return 'JPEG';
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  Nuevo: [139, 92, 246],
  Descargado: [14, 165, 233],
  'En Preparación': [245, 158, 11],
  'Listo para Imprimir': [59, 130, 246],
  Usado: [16, 185, 129],
  Archivado: [225, 29, 72],
};

export async function exportDesignsPDF(designs: SublimationDesign[]) {
  const [{ default: JsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new JsPDF();
  const primary: [number, number, number] = [217, 70, 239];
  const counts = countByStatus(designs);
  const cost = totalPrice(designs);

  doc.setFillColor(...primary);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255);
  doc.text('Repositorio Sublimación', 14, 12);
  doc.setFontSize(10);
  doc.text(`Emitido: ${new Date().toLocaleString('es-AR')}`, 14, 19);
  doc.text(`Diseños: ${designs.length}`, 14, 26);

  doc.setTextColor(0);

  // KPI por estado
  doc.setFontSize(11);
  doc.text('Resumen por estado', 14, 38);
  autoTable(doc, {
    startY: 42,
    head: [['Estado', 'Cantidad']],
    body: [
      ...STATUSES.map((s) => [s, String(counts[s] ?? 0)]),
      ['Total diseños', String(designs.length)],
      ['Costo total', cost.toFixed(2)],
    ],
    theme: 'grid',
    headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
  });

  let y = (doc as JsPdfDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 50;
  y += 10;

  doc.setFontSize(12);
  doc.text('Detalle de diseños', 14, y);
  y += 5;

  // Cargar imágenes en paralelo (mejor esfuerzo; si fallan se omite la imagen)
  const images = await Promise.all(
    designs.map(async (d) => {
      if (!d.imagen) return null;
      const src = await resolveImageSrc(d.imagen);
      return src ? toDataURL(src) : null;
    }),
  );

  for (let i = 0; i < designs.length; i++) {
    const design = designs[i];
    const img = images[i];

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Cabecera del diseño
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${design.name}`, 14, y);
    doc.setFont('helvetica', 'normal');

    const statusColor = STATUS_COLORS[design.status] ?? [139, 92, 246];
    doc.setFillColor(...statusColor);
    doc.roundedRect(190, y - 4, 12, 5, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setTextColor(255);
    doc.text(design.status, 196, y - 0.5, { align: 'center' });
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text(
      `Categoría: ${design.category ?? '—'}  ·  Plataforma: ${design.platform ?? '—'}`,
      14,
      y + 5,
    );

    // Imagen (izquierda) + specs (derecha)
    const imgX = 14;
    const imgY = y + 9;
    const imgW = 34;
    const imgH = 26;

    if (img) {
      try {
        doc.addImage(img, imageFormat(img), imgX, imgY, imgW, imgH);
      } catch {
        /* imagen corrupta o no soportada: se omite */
      }
    } else {
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 130);
      doc.text('sin imagen', imgX + imgW / 2, imgY + imgH / 2, { align: 'center' });
      doc.setTextColor(0);
    }

    autoTable(doc, {
      startY: y + 9,
      margin: { left: 52 },
      tableWidth: 144,
      head: [['Formato', 'DPI', 'Proyecto', 'Licencia', 'POD']],
      body: [[
        design.file_format ?? '—',
        design.dpi != null ? String(design.dpi) : '—',
        design.project_dest ?? '—',
        design.license_type ?? '—',
        design.pod_permitido ? 'Sí' : 'No',
      ]],
      theme: 'grid',
      headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 8, halign: 'center' },
    });

    const tableEnd = (doc as JsPdfDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

    if (design.link_descarga) {
      doc.setFontSize(8);
      doc.setTextColor(...primary);
      doc.text(`Link: ${design.link_descarga}`, 14, tableEnd + 4);
      doc.setTextColor(0);
    }

    y = tableEnd + (design.link_descarga ? 10 : 7);
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}