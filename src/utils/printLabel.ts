// Archivo: src/utils/printLabel.ts

export const printThermalLabel = (productName: string, sku: string, size: string, color: string, quantity: number = 1) => {
  // Abrimos una ventana oculta para la impresión
  const printWindow = window.open('', '_blank', 'width=400,height=400');
  if (!printWindow) {
    console.error("El navegador bloqueó la ventana emergente de impresión.");
    return;
  }

  // SEGURIDAD: Función para sanitizar HTML y evitar inyección de código (XSS)
  const escapeHTML = (str: string) => str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));

  // Generamos el diseño de la etiqueta térmica (Blanco y negro puro, alto contraste)
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Etiqueta Raíces</title>
        <style>
          /* Forzamos el tamaño de etiqueta térmica estándar (Ej: 50mm x 25mm) */
          @page { margin: 0; size: 50mm 25mm; }
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 2mm;
            text-align: center;
            color: #000;
            background: #fff;
            width: 46mm; /* Ajuste para márgenes de impresora */
          }
          .brand { 
            font-size: 14px; 
            font-weight: 900; 
            letter-spacing: 2px; 
            text-transform: uppercase; 
            border-bottom: 2px solid #000; 
            margin-bottom: 2px;
            padding-bottom: 2px;
          }
          .name { 
            font-size: 10px; 
            font-weight: bold; 
            text-transform: uppercase;
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            margin-bottom: 4px;
          }
          .details { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-top: 2px;
          }
          .size { 
            font-size: 20px; 
            font-weight: 900; 
            border: 2px solid #000; 
            padding: 0px 6px; 
            border-radius: 4px; 
          }
          .color { 
            font-size: 11px; 
            font-weight: 900; 
            text-transform: uppercase; 
          }
          .sku { 
            font-size: 8px; 
            margin-top: 4px;
            font-family: monospace;
          }
        </style>
      </head>
      <body>
        ${Array(quantity).fill(`
          <div style="page-break-after: always; height: 100%; display: flex; flex-direction: column; justify-content: center;">
            <div class="brand">RAÍCES</div>
            <div class="name">${escapeHTML(productName)}</div>
            <div class="details">
              <span class="color">${escapeHTML(color)}</span>
              <span class="size">${escapeHTML(size)}</span>
            </div>
            <div class="sku">* ${escapeHTML(sku || 'S/N')} *</div>
          </div>
        `).join('')}
      </body>
      <script>
        window.onload = function() {
          window.print();
          window.close();
        };
      </script>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
};