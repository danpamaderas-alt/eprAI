import type { Product, ProductVariant } from '../store/useCatalogStore';

// Le enseñamos al archivo qué opciones pueden llegar
export interface ReportOptions {
  showSku: boolean;
  showCategory: boolean;
  showSize: boolean;
  showColor: boolean;
  showBase: boolean;
  showFinished: boolean;
  showTotal: boolean;
  showCost: boolean;
}

export const generateStockPDF = (products: Product[], inventory: ProductVariant[], options: ReportOptions) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error("El navegador bloqueó la ventana emergente para el PDF.");
    return;
  }

  let totalItems = 0;
  let totalPatrimony = 0;

  // SEGURIDAD: Prevenir inyección de código (XSS) al imprimir datos del usuario
  const escapeHTML = (str: string) => str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));

  // Armamos las filas ocultando o mostrando los <td> según lo que elegiste
  const rowsHtml = products.map(p => {
    const variants = inventory.filter(v => v.product_id === p.id);
    if (variants.length === 0) return '';

    return variants.map(v => {
      const qty = v.stock_quantity || 0;
      if (qty <= 0) return ''; 
      
      totalItems += qty;
      const valorCosto = qty * (p.cost_price || 0);
      totalPatrimony += valorCosto;

      return `
        <tr>
          ${options.showSku ? `<td class="mono">${escapeHTML(p.sku || 'S/N')}</td>` : ''}
          <td><strong>${escapeHTML(p.name)}</strong></td>
          ${options.showCategory ? `<td>${escapeHTML(p.category || '-')}</td>` : ''}
          ${options.showSize ? `<td class="center">${escapeHTML(v.sizes?.name || '-')}</td>` : ''}
          ${options.showColor ? `<td class="center">${escapeHTML(v.colors?.name || '-')}</td>` : ''}
          ${options.showBase ? `<td class="right">${v.base_quantity || 0}</td>` : ''}
          ${options.showFinished ? `<td class="right">${v.finished_quantity || 0}</td>` : ''}
          ${options.showTotal ? `<td class="right highlight">${qty}</td>` : ''}
          ${options.showCost ? `<td class="right text-rose">$${valorCosto.toLocaleString('es-AR')}</td>` : ''}
        </tr>
      `;
    }).join('');
  }).join('');

  const dateStr = new Date().toLocaleString('es-AR');

  // Armamos las cabeceras (<th>) ocultando o mostrando según lo que elegiste
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reporte de Stock - Raíces</title>
        <style>
          @page { margin: 1cm; size: A4 portrait; }
          body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 0; color: #1e293b; background: #fff; margin: 0; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
          .header h1 { margin: 0; text-transform: uppercase; letter-spacing: 1px; font-size: 24px; color: #0f172a; }
          .header p { margin: 5px 0 0 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 11px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; }
          th { background-color: #f8fafc; text-transform: uppercase; font-size: 9px; color: #64748b; font-weight: 900; letter-spacing: 0.5px; text-align: left; }
          .center { text-align: center; }
          .right { text-align: right; }
          .mono { font-family: monospace; color: #64748b; }
          .highlight { font-weight: 900; color: #10b981; font-size: 12px; }
          .text-rose { color: #e11d48; font-weight: bold; }
          .summary { display: flex; justify-content: flex-end; gap: 20px; font-size: 12px; }
          .summary-box { border: 2px solid #e2e8f0; padding: 10px 20px; border-radius: 8px; background-color: #f8fafc; text-align: right; }
          .summary-box span { color: #64748b; text-transform: uppercase; font-weight: 900; font-size: 9px; display: block; margin-bottom: 4px; }
          .summary-box strong { display: block; font-size: 18px; color: #0f172a; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Inventario Detallado</h1>
          <p>Holder Raíces | Generado el: ${dateStr}</p>
        </div>
        <table>
          <thead>
            <tr>
              ${options.showSku ? `<th>SKU</th>` : ''}
              <th>Artículo</th>
              ${options.showCategory ? `<th>Categoría</th>` : ''}
              ${options.showSize ? `<th class="center">Talle</th>` : ''}
              ${options.showColor ? `<th class="center">Color</th>` : ''}
              ${options.showBase ? `<th class="right">Liso (Base)</th>` : ''}
              ${options.showFinished ? `<th class="right">Terminado</th>` : ''}
              ${options.showTotal ? `<th class="right">Total Stock</th>` : ''}
              ${options.showCost ? `<th class="right">Costo Total</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="9" class="center" style="padding: 20px;">No hay stock físico registrado</td></tr>`}
          </tbody>
        </table>
        
        <div class="summary">
          ${options.showTotal ? `
          <div class="summary-box">
            <span>Total Prendas Físicas</span>
            <strong>${totalItems} un.</strong>
          </div>` : ''}
          ${options.showCost ? `
          <div class="summary-box">
            <span>Valor Patrimonial (Costo)</span>
            <strong>$${totalPatrimony.toLocaleString('es-AR')}</strong>
          </div>` : ''}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
};