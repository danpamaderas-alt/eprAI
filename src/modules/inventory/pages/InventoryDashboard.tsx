import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';
import { generateStockPDF } from '../../../utils/printStockReport';
import { printThermalLabel } from '../../../utils/printLabel';

const PREDEFINED_CATEGORIES = ['Remera', 'Chomba', 'Buzo', 'Campera', 'Pantalón', 'Accesorio', 'Uniformes', 'Conjunto'];
const PREDEFINED_LOCATIONS = ['Sector A', 'Sector B', 'Depósito Central', 'Taller', 'Showroom'];

interface QuickVariant {
  sizeId: string;
  colorId: string;
  qty: string;
  originalQty?: number;
}

export const InventoryDashboard = () => {
  const { 
    products, sizes, colors, inventory,
    fetchAllCatalogs, updateProductComplete, addProduct, addSize, addColor, updateStock, isLoading,
    transformToFinished 
  } = useCatalogStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterColor, setFilterColor] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  
  const [quickVariants, setQuickVariants] = useState<QuickVariant[]>([{ sizeId: '', colorId: '', qty: '' }]);
  const [niches, setNiches] = useState<{id: string, name: string}[]>([]);

  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({ type: 'IN', sizeId: '', colorId: '', qty: '' });

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customLocations, setCustomLocations] = useState<string[]>([]);

  useEffect(() => {
    fetchAllCatalogs();
    fetchNiches();
  }, [fetchAllCatalogs]);

  const fetchNiches = async () => {
    const { data } = await supabase.from('niches').select('id, name');
    if (data) setNiches(data);
  };

  // --- LÓGICA DE FILTROS Y CÁLCULOS (Original) ---
  const allCategories = useMemo(() => {
    const fromDB = products.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set([...PREDEFINED_CATEGORIES, ...fromDB, ...customCategories])).sort();
  }, [products, customCategories]);

  const allLocations = useMemo(() => {
    const fromDB = products.map(p => p.location).filter(Boolean) as string[];
    return Array.from(new Set([...PREDEFINED_LOCATIONS, ...fromDB, ...customLocations])).sort();
  }, [products, customLocations]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchText = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === '' || p.category === filterCategory;
      const productVariants = inventory?.filter(v => v.product_id === p.id) || [];
      const matchSize = filterSize === '' || productVariants.some(v => v.size_id === filterSize && v.stock_quantity > 0);
      const matchColor = filterColor === '' || productVariants.some(v => v.color_id === filterColor && v.stock_quantity > 0);
      return matchText && matchCat && matchSize && matchColor;
    });
  }, [products, searchTerm, filterCategory, filterSize, filterColor, inventory]);

  const patrimonioTotal = useMemo(() => {
    if (!products || !inventory) return 0;
    let total = 0;
    products.forEach(p => {
      const costo = p.cost_price || 0;
      const stockTotal = (inventory.filter(v => v.product_id === p.id)).reduce((sum, v) => sum + v.stock_quantity, 0);
      total += (stockTotal * costo);
    });
    return total;
  }, [products, inventory]);

  // --- ACCIONES DE MODAL Y GUARDADO ---
  const handleGenerateSKU = () => {
    if (!editForm.category || !editForm.location) {
      Swal.fire('Atención', 'Seleccioná Categoría y Ubicación.', 'info');
      return;
    }
    const catPrefix = editForm.category.substring(0, 3).toUpperCase();
    const locPrefix = editForm.location.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3);
    const baseSku = `${catPrefix}-${locPrefix}`;
    const count = products.filter(p => p.sku?.startsWith(baseSku)).length;
    setEditForm(prev => ({ ...prev, sku: `${baseSku}-${String(count + 1).padStart(3, '0')}` }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditForm({ sku: '', name: '', cost_price: 0, price: 0, category: '', location: '', notes: '', niche_id: '' });
    setQuickVariants([{ sizeId: '', colorId: '', qty: '' }]);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setModalMode('edit');
    setEditForm({ ...product });
    const currentVars = inventory.filter(v => v.product_id === product.id).map(v => ({
      sizeId: v.size_id, colorId: v.color_id, qty: String(v.stock_quantity), originalQty: v.stock_quantity
    }));
    setQuickVariants(currentVars.length > 0 ? currentVars : [{ sizeId: '', colorId: '', qty: '' }]);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.name) return;
    try {
      let productId = editForm.id;
      if (modalMode === 'create') {
        const newProd = await addProduct(editForm as Omit<Product, 'id'>);
        productId = newProd.id;
      } else {
        await updateProductComplete(productId!, editForm);
      }

      for (const v of quickVariants) {
        if (v.sizeId && v.colorId) {
          const delta = (Number(v.qty) || 0) - (v.originalQty || 0);
          if (delta !== 0) await updateStock(productId!, v.sizeId, v.colorId, delta);
        }
      }
      setIsModalOpen(false);
      fetchAllCatalogs();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cambios guardados', showConfirmButton: false, timer: 1500 });
    } catch (e) { Swal.fire('Error', 'Error al guardar', 'error'); }
  };

  // --- FUNCIONES ORIGINALES RESTAURADAS ---
  const handleProcessStock = async (product: Product) => {
    const availableVariants = inventory?.filter(v => v.product_id === product.id && v.base_quantity > 0) || [];
    if (availableVariants.length === 0) { Swal.fire('Sin Stock Base', 'No hay prendas lisas disponibles.', 'info'); return; }
    const optionsHtml = availableVariants.map(v => `<option value="${v.id}">${v.sizes?.name} - ${v.colors?.name} (Disp: ${v.base_quantity})</option>`).join('');
    const { value: form } = await Swal.fire({
      title: 'Acondicionar Prenda ✨',
      html: `<div class="text-left flex flex-col gap-3 mt-4"><label class="text-[10px] font-black text-slate-500 uppercase">Variante</label><select id="swal-var" class="swal2-select !w-full !m-0 !text-sm">${optionsHtml}</select><label class="text-[10px] font-black text-slate-500 uppercase mt-2">Cantidad</label><input id="swal-qty" type="number" min="1" class="swal2-input !w-full !m-0"></div>`,
      showCancelButton: true, confirmButtonText: 'Procesar', confirmButtonColor: '#10b981',
      preConfirm: () => ({ variantId: (document.getElementById('swal-var') as HTMLSelectElement).value, qty: Number((document.getElementById('swal-qty') as HTMLInputElement).value) })
    });
    if (form && form.qty > 0) {
      await transformToFinished(form.variantId, form.qty);
      const vData = availableVariants.find(v => v.id === form.variantId);
      if (vData) printThermalLabel(product.name, product.sku || 'S/N', vData.sizes?.name || '-', vData.colors?.name || '-', form.qty);
      fetchAllCatalogs();
    }
  };

  const handleOpenReportConfig = async () => {
    const { value: options } = await Swal.fire({
      title: 'Configurar Reporte 🖨️',
      html: `<div class="text-left grid grid-cols-2 gap-4 mt-4 text-sm font-bold dark:text-slate-300"><label><input type="checkbox" id="col-sku" checked> SKU</label><label><input type="checkbox" id="col-cat" checked> Categoría</label><label><input type="checkbox" id="col-size" checked> Talle</label><label><input type="checkbox" id="col-color" checked> Color</label><label><input type="checkbox" id="col-base" checked> Stock Base</label><label><input type="checkbox" id="col-fin" checked> Terminado</label><label><input type="checkbox" id="col-tot" checked> Total</label><label><input type="checkbox" id="col-cost"> Costo ($)</label></div>`,
      showCancelButton: true, confirmButtonText: 'Generar PDF', preConfirm: () => ({
        showSku: (document.getElementById('col-sku') as HTMLInputElement).checked, showCategory: (document.getElementById('col-cat') as HTMLInputElement).checked, showSize: (document.getElementById('col-size') as HTMLInputElement).checked, showColor: (document.getElementById('col-color') as HTMLInputElement).checked, showBase: (document.getElementById('col-base') as HTMLInputElement).checked, showFinished: (document.getElementById('col-fin') as HTMLInputElement).checked, showTotal: (document.getElementById('col-tot') as HTMLInputElement).checked, showCost: (document.getElementById('col-cost') as HTMLInputElement).checked,
      })
    });
    if (options) generateStockPDF(filteredProducts, inventory, options);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Base de Artículos</h1>
          <p className="text-sm font-bold text-slate-500 uppercase">Patrimonio en Stock: <span className="text-emerald-500">${patrimonioTotal.toLocaleString('es-AR')}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleOpenReportConfig} className="bg-white dark:bg-slate-800 border dark:border-slate-700 dark:text-white px-5 py-3 rounded-2xl font-black text-xs uppercase shadow-sm">🖨️ Reporte</button>
          <button onClick={openCreateModal} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Nuevo Artículo +</button>
        </div>
      </header>

      {/* FILTROS (Original) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border dark:border-slate-700 shadow-sm flex gap-4">
        <input type="text" placeholder="🔍 Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-xs font-black uppercase dark:text-white">
          <option value="">Categorías</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* TABLA CON MATRIZ DE STOCK (Nueva Función) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 border-b dark:border-slate-700">
              <th className="p-6">Artículo / SKU</th>
              <th className="p-6">Matriz de Stock (Talle | Color)</th>
              <th className="p-6 text-center">Stock Total</th>
              <th className="p-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-700">
            {filteredProducts.map(p => {
              const pInv = inventory?.filter(v => v.product_id === p.id) || [];
              const tStock = pInv.reduce((s, v) => s + v.stock_quantity, 0);
              const uSizes = Array.from(new Set(pInv.map(v => v.sizes?.name))).filter(Boolean).sort();
              const uColors = Array.from(new Set(pInv.map(v => v.colors?.name))).filter(Boolean).sort();

              return (
                <tr key={p.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="p-6 align-top">
                    <span className="font-black text-sm dark:text-white uppercase block leading-none mb-1">{p.name}</span>
                    <span className="text-[10px] font-bold text-blue-500">{p.sku}</span>
                  </td>
                  <td className="p-6">
                    {pInv.length > 0 ? (
                      <div className="inline-block border dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                        <table className="text-[9px] text-center bg-white dark:bg-slate-900">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400">
                              <th className="p-2 border-r dark:border-slate-700"></th>
                              {uSizes.map(s => <th key={s} className="p-2 min-w-[35px] uppercase">{s}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {uColors.map(c => (
                              <tr key={c} className="border-t dark:border-slate-700">
                                <td className="p-2 border-r dark:border-slate-700 font-bold dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 uppercase">{c}</td>
                                {uSizes.map(s => {
                                  const v = pInv.find(i => i.colors?.name === c && i.sizes?.name === s);
                                  const qty = v?.stock_quantity || 0;
                                  return <td key={s} className={`p-2 font-black ${qty > 0 ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-700'}`}>{qty || '-'}</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <span className="text-[10px] text-slate-400 italic">Sin stock cargado</span>}
                  </td>
                  <td className="p-6 text-center align-top"><span className="font-black text-sm dark:text-white">{tStock}</span></td>
                  <td className="p-6 text-center align-top flex justify-center gap-2">
                    <button onClick={() => handleProcessStock(p)} className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg text-xs" title="Acondicionar">✨</button>
                    <button onClick={() => openEditModal(p)} className="bg-slate-900 dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">Editar ✏️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL INTEGRADO (Original + Nuevas Funciones) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl border dark:border-slate-700 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-900/50">
              <h2 className="font-black dark:text-white uppercase">{modalMode === 'create' ? '✨ Nuevo Artículo' : '✏️ Edición Integral'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="dark:text-white text-xl">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block mb-2 tracking-widest">Nicho (Holding)</label>
                <select value={editForm.niche_id || ''} onChange={e => setEditForm({...editForm, niche_id: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none">
                  <option value="">-- Seleccionar --</option>
                  {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Nombre" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold" />
                <div className="flex gap-2">
                  <input placeholder="SKU" value={editForm.sku || ''} onChange={e => setEditForm({...editForm, sku: e.target.value})} className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-mono" />
                  <button onClick={handleGenerateSKU} className="px-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl">🪄</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Costo ($)" value={editForm.cost_price || ''} onChange={e => setEditForm({...editForm, cost_price: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-rose-500 font-bold" />
                <input type="number" placeholder="Precio ($)" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-emerald-500 font-bold" />
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl space-y-4 border dark:border-slate-700 shadow-inner">
                <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Variantes y Cantidades</span><button onClick={() => setQuickVariants([...quickVariants, {sizeId: '', colorId: '', qty: ''}])} className="text-[9px] bg-blue-600 text-white px-3 py-1.5 rounded-lg uppercase font-black shadow-md">+ Añadir Fila</button></div>
                <div className="space-y-2">
                  {quickVariants.map((v, i) => (
                    <div key={i} className="flex gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border dark:border-slate-700 shadow-sm animate-in slide-in-from-top-1">
                      <select value={v.sizeId} onChange={e => { const n = [...quickVariants]; n[i].sizeId = e.target.value; setQuickVariants(n); }} className="flex-1 bg-transparent text-[11px] font-bold dark:text-white uppercase"><option value="">Talle</option>{sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      <select value={v.colorId} onChange={e => { const n = [...quickVariants]; n[i].colorId = e.target.value; setQuickVariants(n); }} className="flex-1 bg-transparent text-[11px] font-bold dark:text-white uppercase"><option value="">Color</option>{colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      <input type="number" placeholder="0" value={v.qty} onChange={e => { const n = [...quickVariants]; n[i].qty = e.target.value; setQuickVariants(n); }} className="w-16 bg-blue-50 dark:bg-slate-800 text-center font-black rounded-lg text-xs dark:text-blue-400 outline-none" />
                      {quickVariants.length > 1 && <button onClick={() => setQuickVariants(quickVariants.filter((_, idx) => idx !== i))} className="text-rose-500 px-1 font-bold">✕</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end gap-3 sticky bottom-0">
              <button onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 px-4">Cancelar</button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition-all">Confirmar Guardado 💾</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};