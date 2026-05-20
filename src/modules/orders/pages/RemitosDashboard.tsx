import React, { useState, useEffect } from 'react';
import { Printer, Plus, Trash2, FileText, User, Zap, MessageCircle, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';

import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';

interface RemitoItem {
  id: string;
  qty: number;
  description: string;
  details: string;
}

export const RemitosDashboard = () => {
  const { products = [], sizes = [], colors = [], fetchAllCatalogs } = useCatalogStore();
  const { balances = [], fetchBalances } = useCrmStore();

  useEffect(() => {
    fetchAllCatalogs();
    fetchBalances();
  }, [fetchAllCatalogs, fetchBalances]);

  // Estados del formulario
  const [cliente, setCliente] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [estadoOperacion, setEstadoOperacion] = useState('ENTREGA PARCIAL');
  const [items, setItems] = useState<RemitoItem[]>([]);
  
  const [newItem, setNewItem] = useState({ qty: 1, description: '', details: '' });

  const [quickProductId, setQuickProductId] = useState('');
  const [quickSize, setQuickSize] = useState('');
  const [quickColor, setQuickColor] = useState('');

  // 🖨️ FUNCION PARA IMPRIMIR NATIVA
  const handlePrint = () => {
    window.print();
  };

  // 💬 FUNCION: COMPARTIR POR WHATSAPP
  const handleWhatsAppShare = () => {
    if (items.length === 0) {
      Swal.fire({ title: 'Atención', text: 'Agregá al menos un artículo.', icon: 'warning' });
      return;
    }

    let text = `*REMITO - RAÍCES* 📄\n`;
    text += `*Fecha:* ${new Date().toLocaleDateString('es-AR')}\n`;
    text += `*Destinatario:* ${cliente || 'Consumidor Final'}\n`;
    if (domicilio) text += `*Destino:* ${domicilio}\n`;
    text += `*Motivo:* ${estadoOperacion}\n\n`;
    text += `*Detalle de la entrega:*\n`;

    items.forEach(item => {
      text += `▪ ${item.qty}x ${item.description}`;
      if (item.details) text += ` (${item.details})`;
      text += `\n`;
    });

    text += `\n🌱 *Soluciones Textiles Integrales*\nBerisso, Buenos Aires`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim()) return;
    
    const existingItemIndex = items.findIndex(
      (item) => item.description === newItem.description && item.details === newItem.details
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].qty += newItem.qty;
      setItems(updatedItems);
    } else {
      setItems([...items, { ...newItem, id: crypto.randomUUID() }]);
    }
    
    setNewItem({ qty: 1, description: '', details: '' });
    setQuickProductId('');
    setQuickSize('');
    setQuickColor('');
  };

  const removeItem = (id: string) => setItems(items.filter(item => item.id !== id));
  const updateItemQty = (id: string, newQty: number) => {
    if (newQty < 1) return; 
    setItems(items.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const handleQuickProductSelect = (productId: string) => {
    setQuickProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) setNewItem({ ...newItem, description: prod.name });
  };

  const handleQuickSizeSelect = (talle: string) => {
    setQuickSize(talle);
    const text = talle ? `TALLE: ${talle}${quickColor ? ` | COLOR: ${quickColor}` : ''}` : (quickColor ? `COLOR: ${quickColor}` : '');
    setNewItem(prev => ({ ...prev, details: text }));
  };

  const handleQuickColorSelect = (color: string) => {
    setQuickColor(color);
    const text = color ? `${quickSize ? `TALLE: ${quickSize} | ` : ''}COLOR: ${color}` : (quickSize ? `TALLE: ${quickSize}` : '');
    setNewItem(prev => ({ ...prev, details: text }));
  };

  return (
    // "print-expand" quita las restricciones de pantalla al imprimir
    <div className="flex h-screen gap-6 bg-slate-50 dark:bg-slate-950 p-6 overflow-hidden relative print-expand">
      
      {/* ⚡ NUEVO TRUCO DE IMPRESIÓN SÚPER LIMPIO ⚡ */}
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            
            /* Ocultamos lo que no queremos que salga en papel */
            .hide-on-print { display: none !important; }
            
            /* Expandimos la vista del PDF */
            .print-expand { 
              height: auto !important; 
              overflow: visible !important; 
              padding: 0 !important; 
              background: white !important;
            }
            .print-container {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}
      </style>

      {/* COLUMNA IZQUIERDA: FORMULARIO (Se oculta al imprimir) */}
      <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden hide-on-print shrink-0">
        <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <h1 className="text-2xl font-black italic tracking-tighter dark:text-white uppercase flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> Generador de <span className="text-blue-600">Remitos</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Creación manual de comprobantes</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Datos Generales */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <User className="w-3 h-3" /> Destinatario / Cliente
              </label>
              <input 
                type="text" 
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Escribí o elegí de la lista..."
                list="clientes-guardados"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="clientes-guardados">
                {balances.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <MapPin className="w-3 h-3" /> Domicilio / Destino
              </label>
              <input 
                type="text" 
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                placeholder="Ej. Calle 123..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo de Entrega</label>
              <select 
                value={estadoOperacion}
                onChange={(e) => setEstadoOperacion(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none uppercase"
              >
                <option value="MUESTRA COMERCIAL">Muestra Comercial</option>
                <option value="ENTREGA PARCIAL">Entrega Parcial</option>
                <option value="ENTREGA TOTAL">Entrega Total</option>
                <option value="TRASLADO A TALLER">Traslado a Taller</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Carga de Artículos */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Agregar Artículo</h3>
            
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl space-y-3">
              <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                <Zap className="w-3 h-3" /> Selector Rápido
              </p>
              
              <select 
                value={quickProductId}
                onChange={(e) => handleQuickProductSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-blue-500 text-ellipsis"
              >
                <option value="">-- Seleccionar Producto --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={quickSize}
                  onChange={(e) => handleQuickSizeSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Talle (Sisa) --</option>
                  {sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>

                <select 
                  value={quickColor}
                  onChange={(e) => handleQuickColorSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Color --</option>
                  {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* FORMULARIO MANUAL / EDITABLE */}
            <form onSubmit={handleAddItem}>
              <div className="flex gap-2 mb-3">
                <div className="w-20">
                  <input 
                    type="number" min="1" value={newItem.qty}
                    onChange={(e) => setNewItem({...newItem, qty: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" placeholder="Descripción..." value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" placeholder="Detalles (opcional)" value={newItem.details}
                  onChange={(e) => setNewItem({...newItem, details: e.target.value})}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium dark:text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
                <button type="submit" disabled={!newItem.description} className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg transition-all disabled:opacity-50 flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Artículos Cargados */}
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                  <input 
                    type="number" min="1" value={item.qty}
                    onChange={(e) => updateItemQty(item.id, parseInt(e.target.value) || 1)}
                    className="w-14 text-center py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-black dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold dark:text-white uppercase">{item.description}</p>
                    {item.details && <p className="text-[10px] text-slate-500 uppercase">{item.details}</p>}
                  </div>
                </div>
                <button type="button" onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-rose-500 p-2 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA: VISTA PREVIA Y PDF */}
      <div className="flex-1 flex flex-col bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-[2rem] overflow-hidden relative shadow-inner print-expand print-container">
        
        {/* ⚡ BOTONES DE ACCIÓN (Se ocultan al imprimir) ⚡ */}
        <div className="absolute top-6 right-6 z-10 flex gap-3 hide-on-print">
          <button 
            onClick={handleWhatsAppShare}
            disabled={items.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-2xl disabled:opacity-30"
          >
            <MessageCircle className="w-4 h-4" /> Enviar WhatsApp
          </button>
          
          <button 
            onClick={handlePrint}
            disabled={items.length === 0}
            className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-2xl disabled:opacity-30"
          >
            <Printer className="w-4 h-4" /> Guardar PDF / Imprimir
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start custom-scrollbar mt-12 print-expand">
          
          {/* 📄 DISEÑO DE REMITO PROFESIONAL TIPO "R" 📄 */}
          <div className="bg-white text-black p-10 shadow-2xl shrink-0 print-expand border border-slate-200 print:border-none"
            style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }} 
          >
            
            {/* ENCABEZADO CON RECUADRO CENTRAL */}
            <div className="border-2 border-slate-800 rounded-xl mb-6 relative">
              
              {/* Recuadro Central con Letra "R" */}
              <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-white px-5 py-2 border-x-2 border-b-2 border-slate-800 rounded-b-xl flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 leading-none">R</span>
                <span className="text-[8px] font-bold mt-1 text-slate-500">REMITO</span>
              </div>

              <div className="flex justify-between p-6">
                {/* Datos Raíces */}
                <div className="w-5/12 pt-4">
                  <h1 className="text-4xl font-extrabold tracking-widest uppercase text-slate-900">RAÍCES</h1>
                  <p className="text-[11px] font-bold mt-2 text-slate-600 tracking-widest uppercase">Soluciones Textiles Integrales</p>
                  <div className="mt-4 text-xs font-medium text-slate-700 space-y-1">
                    <p>📍 Berisso, Buenos Aires</p>
                    <p>✉️ raices.textil@gmail.com</p>
                  </div>
                </div>

                {/* Datos Comprobante */}
                <div className="w-5/12 text-right pt-4">
                  <h2 className="text-2xl font-bold text-slate-900 uppercase">Remito</h2>
                  <p className="text-lg font-medium text-slate-700 mt-1">
                    Nº: <span className="font-bold">0001-{Math.floor(Math.random() * 100000).toString().padStart(8, '0')}</span>
                  </p>
                  <p className="text-sm font-semibold text-slate-600 mt-4">
                    Fecha: <span className="font-normal text-slate-900">{new Date().toLocaleDateString('es-AR')}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-6 font-bold tracking-widest uppercase">Documento no válido como factura</p>
                </div>
              </div>
            </div>

            {/* DATOS DEL CLIENTE / DESTINO */}
            <div className="border border-slate-400 rounded-lg p-4 mb-6 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4">
                <p className="text-sm"><strong className="text-slate-800 uppercase text-[11px] tracking-widest mr-2">Señor(es):</strong> <span className="font-bold text-base uppercase">{cliente || '_________________________________'}</span></p>
                <p className="text-sm"><strong className="text-slate-800 uppercase text-[11px] tracking-widest mr-2">Motivo:</strong> <span className="font-bold uppercase">{estadoOperacion}</span></p>
                <p className="text-sm col-span-2"><strong className="text-slate-800 uppercase text-[11px] tracking-widest mr-2">Domicilio:</strong> <span className="font-bold uppercase">{domicilio || '____________________________________________________________________'}</span></p>
              </div>
            </div>

            {/* TABLA DE ARTÍCULOS PRO */}
            <div className="min-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="py-2 px-4 text-[10px] uppercase font-bold text-center w-24 border border-slate-800">CANTIDAD</th>
                    <th className="py-2 px-4 text-[10px] uppercase font-bold border border-slate-800">DESCRIPCIÓN DE LA MERCADERÍA</th>
                    <th className="py-2 px-4 text-[10px] uppercase font-bold border border-slate-800 w-1/3">DETALLES / TALLE / COLOR</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={3} className="py-8 text-center text-slate-400 italic border border-slate-300">Vacío...</td></tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={index} className="border-b border-slate-300">
                        <td className="py-3 px-4 border-x border-slate-300 font-bold text-center text-sm">{item.qty}</td>
                        <td className="py-3 px-4 border-x border-slate-300 font-bold text-slate-900 uppercase text-sm">{item.description}</td>
                        <td className="py-3 px-4 border-x border-slate-300 text-xs font-semibold text-slate-600 uppercase">{item.details}</td>
                      </tr>
                    ))
                  )}
                  {/* Rellenamos con celdas vacías para mantener la estructura de la tabla */}
                  {items.length > 0 && Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="py-4 border-x border-slate-300"></td>
                      <td className="py-4 border-x border-slate-300"></td>
                      <td className="py-4 border-x border-slate-300"></td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-800">
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PIE DE PÁGINA Y FIRMAS */}
            <div className="mt-8">
              <p className="text-[10px] text-slate-500 font-semibold mb-8 text-center">La mercadería detallada viaja por cuenta y orden del comprador.</p>
              
              <div className="flex justify-between items-end px-12 pt-8">
                <div className="w-1/3 text-center border-t-2 border-slate-400 pt-2">
                  <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Firma Entregó</p>
                </div>
                <div className="w-1/3 text-center border-t-2 border-slate-400 pt-2">
                  <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Firma Recibió</p>
                  <p className="text-[9px] text-slate-500 mt-1 uppercase">Aclaración y DNI</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};