import { useEffect, useMemo, useState } from 'react';
import { useProductionStore } from '../store/useProductionStore';
import { useCatalogStore } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

// 🎨 DEFINICIÓN DE ESTADOS Y COLORES AUTOMÁTICOS
const PRODUCTION_STATES = {
  PENDING: { 
    label: 'HACER', 
    color: 'bg-rose-500', 
    border: 'border-rose-200 dark:border-rose-900/30 shadow-rose-500/5 hover:border-rose-400 dark:hover:border-rose-700', 
    light: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' 
  },
  ORDERED: { 
    label: 'PEDIDO', 
    color: 'bg-amber-500', 
    border: 'border-amber-400 dark:border-amber-600/50 shadow-amber-500/5 hover:border-amber-500', 
    light: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' 
  }
};

export const ProductionDashboard = () => {
  const { activeOrders, isLoading, fetchActiveOrders } = useProductionStore();
  const { inventory, fetchAllCatalogs } = useCatalogStore();

  // ESTADOS PARA EL MODAL DE DERIVACIÓN
  const [isDerivationModalOpen, setIsDerivationModalOpen] = useState(false);
  const [selectedItemForDerivation, setSelectedItemForDerivation] = useState<any>(null);
  const [derivationForm, setDerivationForm] = useState({ supplier: '', notes: '' });
  const [derivationsRecord, setDerivationsRecord] = useState<Record<string, any>>({});

  // ✅ NUEVOS ESTADOS PARA SELECCIÓN DE IMPRESIÓN/WHATSAPP
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    fetchAllCatalogs();
  }, [fetchActiveOrders, fetchAllCatalogs]);
  
  const productionList = useMemo(() => {
    const needs: Record<string, any> = {};

    activeOrders.forEach(order => {
      const orderShortId = order.id?.split('-')[0].toUpperCase() || 'S/N';
      const items = order.items || [];
      
      items.forEach((item: any) => {
        const variations = item.variations || [];
        variations.forEach((v: any) => {
          const ordered = Number(v.quantityOrdered) || 0;
          const delivered = Number(v.quantityDelivered) || 0;
          const pendingToDeliver = ordered - delivered;
          
          if (pendingToDeliver > 0) {
            const key = `${item.productName}-${v.size}-${v.color}`;
            
            if (!needs[key]) {
              needs[key] = {
                id: key,
                productName: item.productName,
                size: v.size,
                color: v.color,
                totalPendingDelivery: 0,
                ordersWaiting: [] 
              };
            }
            needs[key].totalPendingDelivery += pendingToDeliver;
            needs[key].ordersWaiting.push({
              orderId: orderShortId,
              customer: order.customer_name,
              qty: pendingToDeliver
            });
          }
        });
      });
    });

    const finalProduction = Object.values(needs).map(need => {
      const stockItem = inventory.find(i => 
        i.products?.name === need.productName && 
        i.sizes?.name === need.size && 
        i.colors?.name === need.color
      );
      
      const currentStock = stockItem ? Number(stockItem.stock_quantity) : 0;
      const toManufacture = need.totalPendingDelivery - currentStock;

      return {
        ...need,
        currentStock,
        toManufacture: toManufacture > 0 ? toManufacture : 0
      };
    }).filter(item => item.toManufacture > 0);

    return finalProduction.sort((a, b) => b.toManufacture - a.toManufacture);
  }, [activeOrders, inventory]);

  // ✅ SELECCIONAR TODO POR DEFECTO LA PRIMERA VEZ QUE CARGA LA LISTA
  useEffect(() => {
    if (productionList.length > 0 && !hasInitializedSelection) {
      setSelectedIds(productionList.map(item => item.id));
      setHasInitializedSelection(true);
    }
  }, [productionList, hasInitializedSelection]);

  // ✅ FUNCIONES DE SELECCIÓN
  const isAllSelected = productionList.length > 0 && selectedIds.length === productionList.length;
  
  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]); // Desmarcar todo
    } else {
      setSelectedIds(productionList.map(item => item.id)); // Marcar todo
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSaveDerivation = () => {
    if (!derivationForm.supplier.trim()) {
      Swal.fire('Atención', 'Debes indicar a dónde se derivó o pidió.', 'warning');
      return;
    }

    if (selectedItemForDerivation) {
      setDerivationsRecord(prev => ({
        ...prev,
        [selectedItemForDerivation.id]: {
          date: new Date().toLocaleDateString('es-AR'),
          supplier: derivationForm.supplier,
          notes: derivationForm.notes
        }
      }));
      
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Estado actualizado', showConfirmButton: false, timer: 1500 });
      setIsDerivationModalOpen(false);
      setDerivationForm({ supplier: '', notes: '' });
      setSelectedItemForDerivation(null);
    }
  };

  const openDerivationModal = (item: any) => {
    setSelectedItemForDerivation(item);
    if (derivationsRecord[item.id]) {
        setDerivationForm({
            supplier: derivationsRecord[item.id].supplier,
            notes: derivationsRecord[item.id].notes
        });
    } else {
        setDerivationForm({ supplier: '', notes: '' });
    }
    setIsDerivationModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-slate-400 font-black animate-pulse uppercase tracking-widest text-sm">Calculando necesidades de producción...</div>;
  }

  // ✅ WHATSAPP AHORA SOLO MANDA LO SELECCIONADO
  const handleSendWhatsApp = () => {
    const itemsToExport = productionList.filter(item => selectedIds.includes(item.id));
    
    if (itemsToExport.length === 0) {
      Swal.fire('Atención', 'Marcá al menos una tarjeta con el tilde para enviarla.', 'warning');
      return;
    }

    let text = "🏭 *ORDEN DE FABRICACIÓN - RAÍCES*\n\n";
    itemsToExport.forEach((item: any) => {
      const qty = item.toManufacture; 
      text += `🔸 *HACER ${qty}x* ${item.productName}\n   ↳ Talle: ${item.size} | Color: ${item.color}\n\n`;
    });
    text += `🗓️ Fecha: ${new Date().toLocaleDateString('es-AR')}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // ✅ PDF AHORA IMPRIME SOLO LO SELECCIONADO
  const handlePrintPDF = () => {
    const itemsToExport = productionList.filter(item => selectedIds.includes(item.id));
    if (itemsToExport.length === 0) {
      Swal.fire('Atención', 'Marcá al menos una tarjeta con el tilde para imprimirla.', 'warning');
      return;
    }
    window.print();
  };
  
  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-300 relative">
      
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <span className="bg-rose-500 text-white p-2 rounded-xl text-xl">⚙️</span>
            A Fabricar
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 italic">
            Seleccioná lo que quieras imprimir o enviar
          </p>
        </div>
        
        {/* ✅ BOTONERA ACTUALIZADA CON SELECCIÓN MÚLTIPLE */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={handleToggleAll} 
            className="flex-1 md:flex-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm transition-colors flex justify-center items-center gap-2"
          >
            {isAllSelected ? '☐ Desmarcar Todo' : '☑ Seleccionar Todo'}
          </button>
          <button 
            onClick={handleSendWhatsApp} 
            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 transition-colors flex justify-center items-center gap-2"
          >
            📱 Enviar ({selectedIds.length})
          </button>
          <button 
            onClick={handlePrintPDF} 
            className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-colors flex justify-center items-center gap-2"
          >
            📄 PDF ({selectedIds.length})
          </button>
        </div>
      </header>

      <div className="print:hidden">
        {productionList.length === 0 ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 p-12 rounded-3xl text-center">
            <span className="text-4xl block mb-4">🙌</span>
            <h3 className="text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-widest text-lg">Taller al día</h3>
            <p className="text-emerald-600/70 dark:text-emerald-500/70 font-bold text-sm mt-2">Con el stock físico actual alcanza para cubrir todas las entregas pendientes de los remitos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productionList.map((item) => {
              const derivationInfo = derivationsRecord[item.id];
              const isDerived = !!derivationInfo;
              const state = isDerived ? PRODUCTION_STATES.ORDERED : PRODUCTION_STATES.PENDING;
              
              // ✅ VERIFICAMOS SI ESTA TARJETA ESTÁ SELECCIONADA
              const isSelected = selectedIds.includes(item.id);

              return (
              <div 
                key={item.id} 
                className={`bg-white dark:bg-slate-900 border-2 p-6 rounded-[2.5rem] relative flex flex-col h-full transition-colors 
                  ${isSelected ? 'shadow-2xl shadow-blue-500/10 scale-[1.02] border-blue-400 dark:border-blue-500' : `${state.border} opacity-80 hover:opacity-100 hover:scale-[1.01]`}`}
              >
                
                {/* ✅ CHECKBOX PARA SELECCIONAR (ARRIBA A LA IZQUIERDA) */}
                <div 
                  onClick={() => toggleSelection(item.id)}
                  className={`absolute top-5 left-5 w-7 h-7 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors z-10
                    ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600 text-transparent hover:border-blue-400'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>

                {/* ETIQUETA SUPERIOR DINÁMICA DE ESTADO */}
                <div className={`absolute top-0 right-0 text-white px-6 py-2 rounded-bl-[1.5rem] font-black text-lg shadow-lg ${state.color} ${isDerived ? 'text-sm py-3' : ''}`}>
                  {isDerived ? 'EN CURSO ⏳' : `${state.label} ${item.toManufacture}`}
                </div>

                <div className="mt-6 mb-6 pl-10"> {/* 👈 Agregamos padding left para dejar espacio al checkbox */}
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${state.light}`}>
                    {isDerived ? 'SOLICITADO / EN TALLER' : 'FALTANTE COMPROBADO'}
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight mt-3">
                    {item.productName}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Talle {item.size} — Color {item.color}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">Falta entregar:</span>
                    <span className="font-black text-slate-700 dark:text-slate-200">{item.totalPendingDelivery} un.</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">Stock físico:</span>
                    <span className="font-black text-emerald-500">{item.currentStock} un.</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <span className={`font-black uppercase tracking-widest ${isDerived ? 'text-amber-500' : 'text-rose-500'}`}>A Fabricar:</span>
                    <span className={`font-black ${isDerived ? 'text-amber-500' : 'text-rose-500'}`}>{item.toManufacture} un.</span>
                  </div>
                </div>

                <div className="mt-4 mb-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Destino por Pedido:</p>
                  <div className="flex flex-col gap-2">
                    {item.ordersWaiting.map((order: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-blue-500">#{order.orderId}</span>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate w-32">{order.customer}</span>
                        </div>
                        <span className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md text-xs font-black shadow-sm">
                          x{order.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECCIÓN DE DERIVACIÓN */}
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  {isDerived ? (
                    <div 
                      className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      onClick={(e) => { e.stopPropagation(); openDerivationModal(item); }}
                      title="Haz clic para editar"
                    >
                      <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase mb-1 flex justify-between">
                        <span>📦 Pedido el: {derivationInfo.date}</span>
                        <span>✎ Editar</span>
                      </p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">📍 {derivationInfo.supplier}</p>
                      {derivationInfo.notes && <p className="text-[10px] text-slate-500 mt-1 italic">"{derivationInfo.notes}"</p>}
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); openDerivationModal(item); }}
                      className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-600 font-black rounded-xl uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                    >
                      🚚 Derivar / Anotar Pedido
                    </button>
                  )}
                </div>

              </div>
            )})}
          </div>
        )}
      </div>

      {/* MODAL DE DERIVACIÓN FLOTANTE */}
      {isDerivationModalOpen && selectedItemForDerivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase italic">Registrar Pedido</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {selectedItemForDerivation.productName} ({selectedItemForDerivation.size})
                </p>
              </div>
              <button onClick={() => setIsDerivationModalOpen(false)} className="text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-800 p-2 rounded-full transition-colors">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Destino / Proveedor *</label>
                <input type="text" placeholder="Ej: Taller Central, Proveedor Piqué, etc." value={derivationForm.supplier} onChange={(e) => setDerivationForm({...derivationForm, supplier: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl p-3 focus:border-blue-500 transition-colors text-sm font-bold" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Notas / Detalles Adicionales</label>
                <textarea placeholder="Ej: Falta llevar hilo al tono, comprar etiquetas..." value={derivationForm.notes} onChange={(e) => setDerivationForm({...derivationForm, notes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl p-3 focus:border-blue-500 transition-colors text-sm h-24 resize-none" />
              </div>

              <div className="pt-4 flex gap-3">
                {derivationsRecord[selectedItemForDerivation.id] && (
                     <button onClick={() => { const newRecords = {...derivationsRecord}; delete newRecords[selectedItemForDerivation.id]; setDerivationsRecord(newRecords); setIsDerivationModalOpen(false); }} className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-xl font-black uppercase text-[10px] hover:bg-rose-100 transition-colors">
                       🗑️ Borrar
                     </button>
                )}
                <button onClick={handleSaveDerivation} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/30 transition-colors transition-transform active:scale-95">
                  💾 Guardar Estado
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ✅ VISTA PARA IMPRESIÓN / PDF (AHORA FILTRA POR LOS SELECCIONADOS) */}
      <style type="text/css" media="print">
        {`
          @page { size: A4; margin: 15mm; }
          html, body, #root { height: auto !important; background-color: white !important; }
          nav, aside, header, .print\\:hidden { display: none !important; }
        `}
      </style>

      <div className="hidden print:block w-full bg-white text-black">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">PLANILLA DE TALLER</h1>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mt-1">Raíces ERP - Orden de Corte y Confección</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black">FECHA</p>
            <p className="text-xl font-bold">{new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-gray-100">
              <th className="py-3 px-2 text-xs font-black uppercase text-center w-16">Cant.</th>
              <th className="py-3 px-2 text-xs font-black uppercase">Artículo a Fabricar</th>
              <th className="py-3 px-2 text-xs font-black uppercase text-center">Talle</th>
              <th className="py-3 px-2 text-xs font-black uppercase">Color</th>
              <th className="py-3 px-2 text-xs font-black uppercase text-center w-24">Hecho</th>
            </tr>
          </thead>
          <tbody>
            {/* 🚀 ACÁ FILTRAMOS PARA IMPRIMIR SOLO LO QUE TIENE TILDE */}
            {productionList?.filter(item => selectedIds.includes(item.id)).map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="py-4 px-2 text-2xl font-black text-center">{item.toManufacture}</td>
                <td className="py-4 px-2 font-bold uppercase text-sm">{item.productName}</td>
                <td className="py-4 px-2 font-black text-center text-lg">{item.size}</td>
                <td className="py-4 px-2 font-bold uppercase text-sm">{item.color}</td>
                <td className="py-4 px-2 text-center">
                  <div className="w-6 h-6 border-2 border-gray-400 rounded-md mx-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-12 pt-8 border-t border-gray-300 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generado automáticamente por Raíces ERP</p>
        </div>
      </div>

    </div>
  );
};