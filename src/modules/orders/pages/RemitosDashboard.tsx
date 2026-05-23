import React, { useState, useEffect } from 'react';
import { Printer, Plus, Trash2, FileText, User, Zap, MessageCircle, MapPin, CheckSquare, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

// Importamos la base de datos de tu catálogo y clientes
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';

export interface PedidoItem {
  id: string;
  qtyOrdered: number;
  qtyDelivered: number;
  description: string;
  details: string;
  unitPrice: number;
}

export const RemitosDashboard = () => {
  const { products = [], sizes = [], colors = [], fetchAllCatalogs } = useCatalogStore();
  const { balances = [], fetchBalances } = useCrmStore();

  useEffect(() => {
    fetchAllCatalogs();
    fetchBalances();
  }, [fetchAllCatalogs, fetchBalances]);

  const [viewType, setViewType] = useState<'STANDARD' | 'PENDING' | 'VALUED'>('STANDARD');

  const [cliente, setCliente] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [estadoOperacion, setEstadoOperacion] = useState('ENTREGA PARCIAL');
  const [items, setItems] = useState<PedidoItem[]>([]);
  
  const [newItem, setNewItem] = useState({ 
    qtyOrdered: 1, 
    qtyDelivered: 1, 
    description: '', 
    details: '',
    unitPrice: 0 
  });

  const [quickProductId, setQuickProductId] = useState('');
  const [quickSize, setQuickSize] = useState('');
  const [quickColor, setQuickColor] = useState('');

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (items.length === 0) {
      Swal.fire({ title: 'Atención', text: 'Agregá al menos un artículo.', icon: 'warning' });
      return;
    }

    let text = `*📋 DOCUMENTO INTERNO - RAÍCES*\n`;
    text += `*Fecha:* ${new Date().toLocaleDateString('es-AR')}\n`;
    text += `*Cliente:* ${cliente || 'Consumidor Final'}\n`;
    if (domicilio) text += `*Destino:* ${domicilio}\n`;
    text += `*Estado:* ${estadoOperacion}\n\n`;
    text += `*Detalle de mercadería:*\n`;

    items.forEach(item => {
      if (viewType === 'PENDING') {
        const falta = item.qtyOrdered - item.qtyDelivered;
        text += `▪ ${item.description} (${item.details}) -> Ped: ${item.qtyOrdered} | Ent: ${item.qtyDelivered} | Falta: ${falta > 0 ? falta : 0}\n`;
      } else if (viewType === 'VALUED') {
        const subtotal = item.qtyOrdered * item.unitPrice;
        text += `▪ ${item.qtyOrdered}x ${item.description} -> $${item.unitPrice.toLocaleString('es-AR')} c/u (Subt: $${subtotal.toLocaleString('es-AR')})\n`;
      } else {
        text += `▪ ${item.qtyOrdered}x ${item.description} (${item.details})\n`;
      }
    });

    if (viewType === 'VALUED') {
      const total = items.reduce((acc, i) => acc + (i.qtyOrdered * i.unitPrice), 0);
      text += `\n*TOTAL ESTIMADO:* $${total.toLocaleString('es-AR')}\n`;
    }

    text += `\n🌱 *Soluciones Textiles Integrales*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim()) return;
    
    const existingItemIndex = items.findIndex(
      (item) => item.description === newItem.description && item.details === newItem.details
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].qtyOrdered += newItem.qtyOrdered;
      updatedItems[existingItemIndex].qtyDelivered += newItem.qtyDelivered;
      setItems(updatedItems);
    } else {
      setItems([...items, { ...newItem, id: crypto.randomUUID() }]);
    }
    
    setNewItem({ qtyOrdered: 1, qtyDelivered: 1, description: '', details: '', unitPrice: 0 });
    setQuickProductId('');
    setQuickSize('');
    setQuickColor('');
  };

  const removeItem = (id: string) => setItems(items.filter(item => item.id !== id));

  const updateItemField = (id: string, field: keyof PedidoItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleQuickProductSelect = (productId: string) => {
    setQuickProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setNewItem({ 
        ...newItem, 
        description: prod.name,
        unitPrice: Number(prod.price) || 0
      });
    }
  };

  const handleQuickSizeSelect = (talle: string) => {
    setQuickSize(talle);
    const text = talle ? `SISA: ${talle}${quickColor ? ` | COLOR: ${quickColor}` : ''}` : (quickColor ? `COLOR: ${quickColor}` : '');
    setNewItem(prev => ({ ...prev, details: text }));
  };

  const handleQuickColorSelect = (color: string) => {
    setQuickColor(color);
    const text = color ? `${quickSize ? `SISA: ${quickSize} | ` : ''}COLOR: ${color}` : (quickSize ? `SISA: ${quickSize}` : '');
    setNewItem(prev => ({ ...prev, details: text }));
  };

  const totalGeneral = items.reduce((acc, item) => acc + (item.qtyOrdered * item.unitPrice), 0);

  return (
    // 1. ROOT CONTAINER: Flex-col en móviles, flex-row en pantallas grandes (xl). Altura máxima controlada.
    <div className="flex flex-col xl:flex-row h-full xl:h-[calc(100vh-2rem)] max-h-screen gap-6 bg-slate-50 dark:bg-slate-950 p-4 xl:p-6 overflow-hidden relative print-expand">
      
      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 10mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .hide-on-print { display: none !important; }
            .print-expand { height: auto !important; overflow: visible !important; padding: 0 !important; background: white !important; }
            .print-container { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important;}
          }
        `}
      </style>

      {/* PANEL IZQUIERDO DE CARGA */}
      {/* 2. Se adapta a 100% en pantallas chicas, fijo a 450px en pantallas grandes */}
      <div className="w-full xl:w-[450px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden hide-on-print shrink-0 h-full">
        <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <h1 className="text-2xl font-black italic tracking-tighter dark:text-white uppercase flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" /> Carga de <span className="text-blue-600">Pedidos</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Generador Manual de Documentos</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <User className="w-3 h-3" /> Cliente / Destinatario
              </label>
              <input 
                type="text" value={cliente} onChange={(e) => setCliente(e.target.value)}
                placeholder="Seleccionar de CRM..." list="clientes-list"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="clientes-list">
                {balances.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <MapPin className="w-3 h-3" /> Destino / Domicilio
              </label>
              <input 
                type="text" value={domicilio} onChange={(e) => setDomicilio(e.target.value)}
                placeholder="Ej. Taller Costura..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estado</label>
              <select 
                value={estadoOperacion} onChange={(e) => setEstadoOperacion(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none uppercase"
              >
                <option value="ENTREGA PARCIAL">Entrega Parcial</option>
                <option value="ENTREGA TOTAL">Entrega Total</option>
                <option value="PRESUPUESTO">Presupuesto</option>
                <option value="TRASLADO A TALLER">Traslado a Taller</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Agregar Prendas</h3>
            
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl space-y-3">
              <select 
                value={quickProductId} onChange={(e) => handleQuickProductSelect(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Catálogo --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={quickSize} onChange={(e) => handleQuickSizeSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Sisa --</option>
                  {sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <select 
                  value={quickColor} onChange={(e) => handleQuickColorSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900/50 rounded-lg text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Color --</option>
                  {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="flex gap-2">
                <div className="w-20">
                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Ped.</label>
                  <input type="number" min="1" value={newItem.qtyOrdered} onChange={(e) => { const v = parseInt(e.target.value) || 1; setNewItem({...newItem, qtyOrdered: v, qtyDelivered: v}); }} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white text-center"/>
                </div>
                <div className="w-20">
                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Ent.</label>
                  <input type="number" min="0" value={newItem.qtyDelivered} onChange={(e) => setNewItem({...newItem, qtyDelivered: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white text-center"/>
                </div>
                <div className="flex-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Precio Unit.</label>
                  <input type="number" min="0" value={newItem.unitPrice} onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white text-right"/>
                </div>
              </div>

              <div className="space-y-2">
                <input type="text" placeholder="Artículo..." value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white uppercase outline-none focus:ring-1 focus:ring-blue-500"/>
                <div className="flex gap-2">
                  <input type="text" placeholder="Sisa/Color..." value={newItem.details} onChange={(e) => setNewItem({...newItem, details: e.target.value})} className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium dark:text-white uppercase outline-none focus:ring-1 focus:ring-blue-500"/>
                  <button type="submit" disabled={!newItem.description} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-lg transition-all disabled:opacity-50"><Plus className="w-5 h-5" /></button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-xs font-black dark:text-white uppercase">{item.description}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">{item.details}</p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-50 dark:border-slate-700/50">
                  <div>
                    <label className="text-[7px] font-black text-slate-400 block uppercase">Ped.</label>
                    <input type="number" value={item.qtyOrdered} onChange={(e) => updateItemField(item.id, 'qtyOrdered', parseInt(e.target.value) || 1)} className="w-full bg-slate-50 dark:bg-slate-900 text-center text-xs font-bold rounded p-1 dark:text-white"/>
                  </div>
                  <div>
                    <label className="text-[7px] font-black text-slate-400 block uppercase">Ent.</label>
                    <input type="number" value={item.qtyDelivered} onChange={(e) => updateItemField(item.id, 'qtyDelivered', parseInt(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-900 text-center text-xs font-bold rounded p-1 dark:text-white"/>
                  </div>
                  <div>
                    <label className="text-[7px] font-black text-slate-400 block uppercase">Precio</label>
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItemField(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-900 text-right text-xs font-bold rounded p-1 dark:text-white"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: HOJA A4 Y VISTAS */}
      <div className="w-full xl:flex-1 flex flex-col bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-[2rem] overflow-hidden relative shadow-inner print-expand print-container h-full">
        
        <div className="absolute top-4 right-4 xl:top-6 xl:right-6 z-10 flex flex-wrap gap-2 xl:gap-3 hide-on-print items-center">
          <div className="flex bg-slate-950/90 backdrop-blur p-1 rounded-xl border border-slate-800 shadow-xl">
            <button onClick={() => setViewType('STANDARD')} className={`px-2 xl:px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewType === 'STANDARD' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><FileText className="w-3 h-3" /> Ficha Detalle</button>
            <button onClick={() => setViewType('PENDING')} className={`px-2 xl:px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewType === 'PENDING' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><CheckSquare className="w-3 h-3" /> Control Saldos</button>
            <button onClick={() => setViewType('VALUED')} className={`px-2 xl:px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${viewType === 'VALUED' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><DollarSign className="w-3 h-3" /> Valorado</button>
          </div>

          <button onClick={handleWhatsAppShare} disabled={items.length === 0} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 xl:px-5 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl disabled:opacity-30"><MessageCircle className="w-4 h-4" /> WhatsApp</button>
          <button onClick={handlePrint} disabled={items.length === 0} className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white px-4 xl:px-5 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl disabled:opacity-30"><Printer className="w-4 h-4" /> Imprimir</button>
        </div>

        {/* 3. SCROLL AREA: overflow-auto permite scroll vertical y horizontal sin romper el layout */}
        <div className="flex-1 overflow-auto p-4 xl:p-8 custom-scrollbar mt-20 xl:mt-16 print-expand flex flex-col items-center">
          
          {/* 4. HOJA A4: Restringida a proporciones físicas */}
          <div id="printable-a4" className="bg-white text-black p-10 shadow-2xl shrink-0 print-expand mx-auto" style={{ minWidth: '210mm', maxWidth: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            
            <div className="border-2 border-slate-800 rounded-xl mb-6 relative">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-white px-5 py-2 border-x-2 border-b-2 border-slate-800 rounded-b-xl flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 leading-none">X</span>
                <span className="text-[8px] font-bold mt-1 text-slate-500">INTERNO</span>
              </div>

              <div className="flex justify-between p-6">
                <div className="w-5/12 pt-2">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="/logo.png" alt="Logo" className="h-10 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <h1 className="text-4xl font-extrabold tracking-widest text-slate-900">RAÍCES</h1>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">Soluciones Textiles Integrales</p>
                  <div className="mt-4 text-xs font-medium text-slate-700 space-y-0.5">
                    <p>📍 Berisso, Buenos Aires</p>
                    <p>✉️ raices.textil@gmail.com</p>
                  </div>
                </div>

                <div className="w-5/12 text-right pt-2">
                  <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tighter">
                    {viewType === 'PENDING' ? 'Control de Saldos' : viewType === 'VALUED' ? 'Hoja Valorada' : 'Orden Interna'}
                  </h2>
                  <p className="text-base font-semibold text-slate-700 mt-1">
                    Nº Comprobante: <span className="font-bold">0001-{Math.floor(Math.random() * 100000).toString().padStart(6, '0')}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-600 mt-3">
                    Fecha Emisión: <span className="font-normal text-slate-900">{new Date().toLocaleDateString('es-AR')}</span>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-6 font-bold tracking-widest uppercase">Documento interno no válido como factura</p>
                </div>
              </div>
            </div>

            <div className="border border-slate-400 rounded-lg p-4 mb-6 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><strong className="text-slate-700 uppercase text-[10px] tracking-wider mr-2">Señor(es):</strong> <span className="font-bold text-base uppercase">{cliente || '_________________________________'}</span></p>
                <p><strong className="text-slate-700 uppercase text-[10px] tracking-wider mr-2">Estado:</strong> <span className="font-bold uppercase text-blue-700">{estadoOperacion}</span></p>
                <p className="col-span-2"><strong className="text-slate-700 uppercase text-[10px] tracking-wider mr-2">Destino / Taller:</strong> <span className="font-bold uppercase">{domicilio || '____________________________________________________________________'}</span></p>
              </div>
            </div>

            <div className="min-h-[500px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                    {viewType === 'PENDING' ? (
                      <>
                        <th className="py-2.5 px-2 text-center border border-slate-800 w-16 bg-slate-700">Ped.</th>
                        <th className="py-2.5 px-2 text-center border border-slate-800 w-16 bg-blue-700">Ent.</th>
                        <th className="py-2.5 px-2 text-center border border-slate-800 w-16 bg-rose-700">Falta</th>
                      </>
                    ) : (
                      <th className="py-2.5 px-4 text-center w-24 border border-slate-800">CANT.</th>
                    )}
                    <th className="py-2.5 px-4 border border-slate-800">DESCRIPCIÓN DEL ARTÍCULO / PRENDA</th>
                    <th className="py-2.5 px-4 border border-slate-800 w-1/3">DETALLES ESPECÍFICOS</th>
                    {viewType === 'VALUED' && (
                      <>
                        <th className="py-2.5 px-4 text-right border border-slate-800 w-24">P. UNIT.</th>
                        <th className="py-2.5 px-4 text-right border border-slate-800 w-28">SUBTOTAL</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const falta = item.qtyOrdered - item.qtyDelivered;
                    const subtotal = item.qtyOrdered * item.unitPrice;
                    return (
                      <tr key={index} className="border-b border-slate-300 text-sm">
                        {viewType === 'PENDING' ? (
                          <>
                            <td className="py-2.5 px-2 border-x border-slate-300 font-medium text-center text-slate-500">{item.qtyOrdered}</td>
                            <td className="py-2.5 px-2 border-x border-slate-300 font-bold text-center text-blue-700">{item.qtyDelivered}</td>
                            <td className="py-2.5 px-2 border-x border-slate-300 font-black text-center text-rose-600">{falta > 0 ? falta : '-'}</td>
                          </>
                        ) : (
                          <td className="py-2.5 px-4 border-x border-slate-300 font-bold text-center text-base">{item.qtyOrdered}</td>
                        )}
                        <td className="py-2.5 px-4 border-x border-slate-300 font-bold text-slate-900 uppercase">{item.description}</td>
                        <td className="py-2.5 px-4 border-x border-slate-300 text-xs font-semibold text-slate-600 uppercase">{item.details}</td>
                        {viewType === 'VALUED' && (
                          <>
                            <td className="py-2.5 px-4 border-x border-slate-300 text-right font-medium tabular-nums">${item.unitPrice.toLocaleString('es-AR')}</td>
                            <td className="py-2.5 px-4 border-x border-slate-300 text-right font-bold tabular-nums">${subtotal.toLocaleString('es-AR')}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 14 - items.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-slate-200/50">
                      <td className="py-4 border-x border-slate-300" colSpan={viewType === 'PENDING' ? 3 : 1}></td>
                      <td className="py-4 border-x border-slate-300"></td>
                      <td className="py-4 border-x border-slate-300"></td>
                      {viewType === 'VALUED' && <td className="py-4 border-x border-slate-300" colSpan={2}></td>}
                    </tr>
                  ))}
                  {viewType === 'VALUED' && (
                    <tr className="border-t-2 border-slate-800 bg-slate-50">
                      <td colSpan={3} className="py-4 px-4 text-right text-xs font-black uppercase tracking-widest text-slate-700">Total Liquidación:</td>
                      <td colSpan={2} className="py-4 px-4 text-right text-xl font-black text-slate-900 tabular-nums">${totalGeneral.toLocaleString('es-AR')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-end px-12 pt-12">
                <div className="w-1/3 text-center border-t-2 border-slate-400 pt-2">
                  <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Responsable Raíces</p>
                </div>
                <div className="w-1/3 text-center border-t-2 border-slate-400 pt-2">
                  <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Conformidad Recibo</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Doble protección de exportación para Vite
export default RemitosDashboard;