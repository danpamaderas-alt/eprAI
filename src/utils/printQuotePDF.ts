type JsPdfDoc = InstanceType<(typeof import('jspdf'))['default']>;

// 🛡️ Interfaces para eliminar los 'any'
export interface QuoteItem {
  quantity: number;
  description?: string;
  unit_price: number;
}

export interface QuoteData {
  quote_number: string | number;
  created_at: string;
  total: number;
  notes?: string;
  clients?: {
    name?: string;
    document_id?: string;
  };
}

/**
 * Genera un PDF de cotización y lo devuelve como Blob.
 * jsPDF se carga bajo demanda (~580 kB) para no penalizar la ruta del Cotizador.
 */
export const getQuotePDFBlob = async (quote: QuoteData, items: QuoteItem[]): Promise<Blob> => {
  const [{ default: JsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new JsPDF();
  const primaryColor: [number, number, number] = [37, 99, 235];

  doc.setFontSize(26);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('RAÍCES', 14, 25);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Indumentaria Institucional y de Trabajo', 14, 32);

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('PRESUPUESTO', 140, 25);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Nº: ${quote.quote_number}`, 140, 32);

  // SEGURIDAD: Prevenir 'Invalid Date' si la fecha viene mal formateada
  const parsedDate = new Date(quote.created_at);
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  doc.text(`Fecha: ${validDate.toLocaleDateString('es-AR')}`, 140, 38);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Cliente / Institución: ${quote.clients?.name || 'Consumidor Final'}`, 14, 50);

  if (quote.clients?.document_id) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`CUIT / Doc: ${quote.clients.document_id}`, 14, 56);
  }

  const tableColumn = ["Cant.", "Descripción / Detalle", "Precio Unit.", "Subtotal"];
  const tableRows = items.map(item => [
    item.quantity,
    item.description || 'Artículo de catálogo',
    `$${item.unit_price.toLocaleString('es-AR')}`,
    `$${(item.quantity * item.unit_price).toLocaleString('es-AR')}`
  ]);

  autoTable(doc, {
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    }
  });

  // 🚀 FIX: Tipado seguro para la propiedad inyectada por autoTable
  const finalY = (doc as JsPdfDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 65;

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFillColor(240, 248, 255);
  doc.rect(130, finalY + 8, 65, 12, 'F');
  doc.text(`TOTAL: $${quote.total.toLocaleString('es-AR')}`, 135, finalY + 16);

  if (quote.notes) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Condiciones comerciales:', 14, finalY + 15);
    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(doc.splitTextToSize(quote.notes, 100), 14, finalY + 21);
  }

  // VANGUARDIA (UX Institucional): Footer estándar de validez
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Validez del presupuesto: 15 días. Precios sujetos a modificación sin previo aviso.', 14, 280);

  // Devolver como Blob
  return doc.output('blob') as Blob;
};

/**
 * Genera un PDF de cotización y lo abre en una nueva pestaña (comportamiento original).
 */
export const generateQuotePDF = async (quote: QuoteData, items: QuoteItem[]) => {
  const pdfBlob = await getQuotePDFBlob(quote, items);
  const blobUrl = URL.createObjectURL(pdfBlob);
  window.open(blobUrl, '_blank');
};
