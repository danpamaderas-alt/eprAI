import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 🛠️ FUNCIÓN MÁGICA: Descarga la imagen de una URL y la prepara para el PDF en milisegundos
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("No se pudo cargar la imagen del logo:", error);
    return ""; 
  }
};

export const generateQuotePDF = async (quote: any, items: any[]) => {
  try {
    const doc = new jsPDF();

    // ==========================================
    // 🎨 DICCIONARIO DE ESTILOS POR UNIDAD DE NEGOCIO
    // ==========================================
    const unitStyles = {
      'RAICES_3D': {
        primary: [20, 50, 35] as [number, number, number],    // Verde Oscuro
        secondary: [100, 116, 139] as [number, number, number],
        accent: [184, 115, 51] as [number, number, number],     // Cobre / Bronce
        lightBg: [248, 250, 252] as [number, number, number],
        watermark: [230, 240, 230] as [number, number, number],
        title: "RAÍCES | 3D",
        subtitle: "Impresión y Fabricación Digital",
        
        // 👇 PONÉ ACÁ EL LINK DIRECTO DE TU IMAGEN (Ej: link de Supabase Storage, Imgur, etc.)
        logoUrl: "https://i.imgur.com/tu-logo-3d.png" 
      },
      'RAICES': {
        primary: [62, 39, 35] as [number, number, number],      // Café Oscuro
        secondary: [141, 110, 99] as [number, number, number],
        accent: [193, 154, 107] as [number, number, number],    // Camel
        lightBg: [252, 250, 245] as [number, number, number],
        watermark: [245, 238, 225] as [number, number, number],
        title: "RAÍCES",
        subtitle: "Inspiración & Diseño Textil",

        // 👇 PONÉ ACÁ EL LINK DIRECTO DE TU LOGO DE INDUMENTARIA
        logoUrl: "https://i.imgur.com/tu-logo-indumentaria.png" 
      }
    };

    const activeStyle = unitStyles[quote?.business_unit as keyof typeof unitStyles] || unitStyles['RAICES'];

    // ⏳ Descargamos el logo en la memoria antes de armar el PDF
    let logoBase64 = "";
    if (activeStyle.logoUrl) {
      logoBase64 = await getBase64ImageFromUrl(activeStyle.logoUrl);
    }

    // ==========================================
    // 🖼️ 1. MARCA DE AGUA EN EL FONDO GIGANTE
    // ==========================================
    if (logoBase64) {
      // Configuramos para que el fondo quede como marca de agua (difuminado/transparente)
      doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
      doc.addImage(logoBase64, 'PNG', 45, 100, 120, 120); 
      doc.setGState(new (doc as any).GState({ opacity: 1 })); // Restaurar opacidad normal
    } else {
      doc.setTextColor(activeStyle.watermark[0], activeStyle.watermark[1], activeStyle.watermark[2]);
      doc.setFontSize(70);
      doc.setFont("helvetica", "bolditalic");
      doc.text(activeStyle.title, 105, 185, { align: "center", angle: 45 });
    }

    // ==========================================
    // 📄 2. ENCABEZADO ELEGANTE (CON LOGO CHIQUITO)
    // ==========================================
    doc.setDrawColor(activeStyle.accent[0], activeStyle.accent[1], activeStyle.accent[2]);
    doc.setLineWidth(1.5);
    doc.line(14, 20, 14, 38);

    // Si hay logo, lo pone al lado de la línea. Si no, escribe el nombre.
    if (logoBase64) {logoUrl: "URL_DE_SUPABASE"
      doc.addImage(logoBase64, 'PNG', 18, 18, 22, 22);
      // Escribimos el subtítulo al lado del logo
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(activeStyle.secondary[0], activeStyle.secondary[1], activeStyle.secondary[2]);
      doc.text(activeStyle.subtitle, 45, 30);
    } else {
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(activeStyle.primary[0], activeStyle.primary[1], activeStyle.primary[2]);
      doc.text(activeStyle.title, 18, 28);

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(activeStyle.secondary[0], activeStyle.secondary[1], activeStyle.secondary[2]);
      doc.text(activeStyle.subtitle, 18, 34);
    }

    doc.setFillColor(activeStyle.accent[0], activeStyle.accent[1], activeStyle.accent[2]);
    doc.roundedRect(145, 18, 51, 9, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("PRESUPUESTO", 170.5, 24.5, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(activeStyle.primary[0], activeStyle.primary[1], activeStyle.primary[2]);
    doc.text(`Nº: ${quote?.quote_number || 'S/N'}`, 196, 33, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(activeStyle.secondary[0], activeStyle.secondary[1], activeStyle.secondary[2]);
    const date = quote?.created_at ? new Date(quote.created_at).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR');
    doc.text(`Fecha: ${date}`, 196, 39, { align: "right" });

    // ==========================================
    // 👤 3. CLIENTE
    // ==========================================
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(activeStyle.accent[0], activeStyle.accent[1], activeStyle.accent[2]);
    doc.text("PREPARADO PARA:", 14, 55);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(activeStyle.primary[0], activeStyle.primary[1], activeStyle.primary[2]);
    const clientName = quote?.customers?.name || quote?.clients?.name || 'Consumidor Final';
    doc.text(String(clientName).toUpperCase(), 14, 62);

    // ==========================================
    // 📋 4. TABLA DE ARTÍCULOS
    // ==========================================
    const tableData = items.map(item => [
      String(item.quantity || 0),
      String(item.description || 'Artículo sin descripción').toUpperCase(),
      `$${Number(item.unit_price || 0).toLocaleString('es-AR')}`,
      `$${(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString('es-AR')}`
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['CANT.', 'DESCRIPCIÓN / DETALLE', 'PRECIO UNIT.', 'SUBTOTAL']],
      body: tableData,
      theme: 'plain',
      headStyles: { fillColor: activeStyle.accent, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left', cellPadding: 5 },
      bodyStyles: { textColor: activeStyle.primary, fontSize: 10, fontStyle: 'bold', halign: 'left', cellPadding: 6 },
      alternateRowStyles: { fillColor: activeStyle.lightBg },
      columnStyles: { 0: { halign: 'center', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 40 }, 3: { halign: 'right', cellWidth: 40 } },
      styles: { lineWidth: 0 }
    });

    // ==========================================
    // 💰 5. SECCIÓN INFERIOR Y TOTALES
    // ==========================================
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    if (quote?.notes) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(activeStyle.accent[0], activeStyle.accent[1], activeStyle.accent[2]);
      doc.text("CONDICIONES:", 14, finalY);

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(activeStyle.secondary[0], activeStyle.secondary[1], activeStyle.secondary[2]);
      const splitNotes = doc.splitTextToSize(String(quote.notes), 100);
      doc.text(splitNotes, 14, finalY + 6);
    }

    doc.setFillColor(activeStyle.primary[0], activeStyle.primary[1], activeStyle.primary[2]); 
    doc.roundedRect(126, finalY - 5, 70, 25, 4, 4, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(activeStyle.accent[0], activeStyle.accent[1], activeStyle.accent[2]); 
    doc.text("TOTAL ESTIMADO", 190, finalY + 3, { align: "right" });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255); 
    doc.text(`$${Number(quote?.total || 0).toLocaleString('es-AR')}`, 190, finalY + 13, { align: "right" });

    // ==========================================
    // 📱 6. PIE DE PÁGINA
    // ==========================================
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(141, 110, 99);
    
    doc.text(quote.business_unit === 'RAICES_3D' ? "Soluciones de fabricación digital a medida." : "Gracias por elegirnos para inspirar tu marca.", 105, pageHeight - 20, { align: "center" });
    doc.text("WhatsApp: +54 9 221 XXX-XXXX  |  IG: @raices.arg  |  Berisso", 105, pageHeight - 15, { align: "center" });

    doc.save(`Presupuesto_${quote?.business_unit || 'RAICES'}_${quote?.quote_number || '001'}.pdf`);

  } catch (error) {
    console.error("🔥 Error crítico armando el PDF:", error);
    throw error; 
  }
};