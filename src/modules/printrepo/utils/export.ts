import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PrintModel } from '../types';

const HEADERS = [
  'Nombre',
  'Categoría',
  'Estado',
  'Material',
  'Capa (mm)',
  'Infill (%)',
  'Tiempo (h)',
  'Peso (g)',
  'Link descarga',
] as string[];

const STATUSES = ['Idea', 'En Cola', 'Imprimiendo', 'Completado', 'Descartado'] as const;

const csvEscape = (value: unknown): string => {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const countByStatus = (models: PrintModel[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const s of STATUSES) counts[s] = 0;
  for (const m of models) counts[m.status] = (counts[m.status] ?? 0) + 1;
  return counts;
};

const totalHours = (models: PrintModel[]): number =>
  models.reduce((acc, m) => acc + (m.estimated_time_hours ?? 0), 0);

const totalGrams = (models: PrintModel[]): number =>
  models.reduce((acc, m) => acc + (m.estimated_grams ?? 0), 0);

export function exportModelsCSV(models: PrintModel[], filename = 'repositorio-3d') {
  const counts = countByStatus(models);

  const summaryRows = [
    ['Resumen por estado', 'Cantidad'],
    ...STATUSES.map((s) => [s, String(counts[s] ?? 0)]),
    ['TOTAL MODELOS', String(models.length)],
    ['TIEMPO TOTAL ESTIMADO (h)', totalHours(models).toFixed(1)],
    ['PESO TOTAL ESTIMADO (g)', totalGrams(models).toFixed(0)],
  ];

  const dataRows = models.map((m) => [
    m.name,
    m.category ?? '',
    m.status,
    m.material ?? '',
    m.layer_height ?? '',
    m.infill ?? '',
    m.estimated_time_hours ?? '',
    m.estimated_grams ?? '',
    m.link_descarga ?? '',
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
  Idea: [100, 116, 139],
  'En Cola': [245, 158, 11],
  Imprimiendo: [59, 130, 246],
  Completado: [16, 185, 129],
  Descartado: [225, 29, 72],
};

export async function exportModelsPDF(models: PrintModel[]) {
  const doc = new jsPDF();
  const primary: [number, number, number] = [124, 58, 237];
  const counts = countByStatus(models);
  const hours = totalHours(models);
  const grams = totalGrams(models);

  doc.setFillColor(...primary);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255);
  doc.text('Repositorio Impresión 3D', 14, 12);
  doc.setFontSize(10);
  doc.text(`Emitido: ${new Date().toLocaleString('es-AR')}`, 14, 19);
  doc.text(`Modelos: ${models.length}`, 14, 26);

  doc.setTextColor(0);

  // KPI por estado
  doc.setFontSize(11);
  doc.text('Resumen por estado', 14, 38);
  autoTable(doc, {
    startY: 42,
    head: [['Estado', 'Cantidad']],
    body: [
      ...STATUSES.map((s) => [s, String(counts[s] ?? 0)]),
      ['Total modelos', String(models.length)],
      ['Tiempo total estimado (h)', hours.toFixed(1)],
      ['Peso total estimado (g)', grams.toFixed(0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
  });

  let y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 50;
  y += 10;

  doc.setFontSize(12);
  doc.text('Detalle de modelos', 14, y);
  y += 5;

  // Cargar imágenes en paralelo (mejor esfuerzo; si fallan se omite la imagen)
  const images = await Promise.all(
    models.map((m) => (m.imagen ? toDataURL(m.imagen) : Promise.resolve(null))),
  );

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const img = images[i];

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Cabecera del modelo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${model.name}`, 14, y);
    doc.setFont('helvetica', 'normal');

    const statusColor = STATUS_COLORS[model.status] ?? [100, 116, 139];
    doc.setFillColor(...statusColor);
    doc.roundedRect(190, y - 4, 12, 5, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setTextColor(255);
    doc.text(model.status, 196, y - 0.5, { align: 'center' });
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text(
      `Categoría: ${model.category ?? '—'}  ·  Material: ${model.material ?? '—'}`,
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
      head: [['Capa (mm)', 'Infill (%)', 'Tiempo (h)', 'Peso (g)']],
      body: [[
        model.layer_height != null ? String(model.layer_height) : '—',
        model.infill != null ? String(model.infill) : '—',
        model.estimated_time_hours != null ? String(model.estimated_time_hours) : '—',
        model.estimated_grams != null ? String(model.estimated_grams) : '—',
      ]],
      theme: 'grid',
      headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 8, halign: 'center' },
    });

    const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

    if (model.link_descarga) {
      doc.setFontSize(8);
      doc.setTextColor(...primary);
      doc.text(`Link: ${model.link_descarga}`, 14, tableEnd + 4);
      doc.setTextColor(0);
    }

    y = tableEnd + (model.link_descarga ? 10 : 7);
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}