import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';
import { generateStockPDF } from '../../../utils/printStockReport';
import { printThermalLabel } from '../../../utils/printLabel';

// 🚀 Formateador global de moneda
const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const PREDEFINED_CATEGORIES = ['Remera', 'Chomba', 'Buzo', 'Campera', 'Pantalón', 'Accesorio', 'Uniformes', 'Conjunto'];
const PREDEFINED_LOCATIONS = ['Sector A', 'Sector B', 'Depósito Central', 'Taller', 'Showroom'];

interface QuickVariant {
  sizeId: string;
  colorId: string;
  qty: string;
  originalQty?: number;
}

export const InventoryDashboard = memo(() => {
  const { 
    products, sizes, colors, inventory,
    fetchAllCatalogs, updateProductComplete, addProduct, updateStock, isLoading,
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

  useEffect(() => {
    fetchAllCatalogs();
    const fetchNiches = async () => {
      const { data } = await supabase.from('niches').select('id, name');
      if (data) setNiches(data);
    };
    fetchNiches();
  }, [fetchAllCatalogs]);

  // 🧠 CÁLCULO DE PATRIMONIO BLINDADO
  const patrimonioTotal = useMemo(() => {
    return products.reduce((total, p) => {
      const cost = Number(p.cost_price) || 0;
      const stock = (inventory?.filter(v => v.product_id === p.id) || [])
        .reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
      return total + (stock * cost);
    }, 0);
  }, [products, inventory]);

  const allCategories = useMemo(() => {
    const fromDB = products.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set([...PREDEFINED_CATEGORIES, ...fromDB])).sort();
  }, [products]);

  // 🚀 FILTRADO OPTIMIZADO
  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return products.filter(p => {
      const matchText = p.name?.toLowerCase().includes(search) || p.sku?.toLowerCase().includes(search);
      const matchCat = filterCategory === '' || p.category === filterCategory;
      
      const pVariants = inventory?.filter(v => v.product_id === p.id) || [];
      const matchSize = filterSize === '' || pVariants.some(v => v.size_id === filterSize && v.stock_quantity > 0);
      const matchColor = filterColor === '' || pVariants.some(v => v.color_id === filterColor && v.stock_quantity > 0);
      
      return matchText && matchCat && matchSize && matchColor;
    });
  }, [products, searchTerm, filterCategory, filterSize, filterColor, inventory]);

  const handleGenerateSKU = useCallback(() => {
    if (!editForm.category || !editForm.location) {
      return Swal.fire('Faltan Datos', 'Necesito Categoría y Ubicación para el código.', 'info');
    }
    const cat = editForm.category.substring(0, 3).toUpperCase();
    const loc = editForm.location.substring(0, 3).toUpperCase();
    const count = products.filter(p => p.sku?.startsWith(`${cat}-${loc}`)).length + 1;
    setEditForm(prev => ({ ...prev, sku: `${cat}-${loc}-${String(count).padStart(3, '0')}` }));
  }, [editForm.category, editForm.location, products]);

  const openEditModal = useCallback((product: Product) => {
    setModalMode('edit');
    setEditForm({ ...product });
    const vars = (inventory?.filter(v => v.product_id === product.id) || []).map(v => ({
      sizeId: v.size_id, colorId: v.color_id, qty: String(v.stock_quantity), originalQty: v.stock_quantity
    }));
    setQuickVariants(vars.length > 0 ? vars : [{ sizeId: '', colorId: '', qty: '' }]);
    setIsModalOpen(true);
  }, [inventory]);

  const handleSave = useCallback(async () => {
    if (!editForm.name) return;
    try {
      let pId = editForm.id;
      if (modalMode === 'create') {
        const newP = await addProduct(editForm as Omit<Product, 'id'>);
        pId = newP.id;
      } else {
        await updateProductComplete(pId!, editForm);
      }

      for (const v of quickVariants) {
        if (v.sizeId && v.colorId) {
          const delta = (Number(v.qty) || 0) - (v.originalQty || 0);
          if (delta !== 0) await updateStock(pId!, v.sizeId, v.colorId, delta);
        }
      }
      setIsModalOpen(false);
      fetchAllCatalogs();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Inventario Actualizado', showConfirmButton: false, timer: 1500 });
    } catch (e) { Swal.fire('Error', 'No se pudo guardar.', 'error'); }
  }, [editForm, modalMode, quickVariants, addProduct, updateProductComplete, updateStock, fetchAllCatalogs]);

  const handleProcessStock = useCallback(async (product: Product) => {
    const vars = inventory?.filter(v => v.product_id === product.id && v.base_quantity > 0) || [];
    if (!vars.length) return Swal.fire('Sin Base', 'No hay prendas lisas para acondicionar.', 'info');
    
    const html = vars.map(v => `<option value="${v.id}">${v.sizes?.name} - ${v.colors?.name} (Lote: ${v.base_quantity})</option>`).join('');
    const { value: form } = await Swal.fire({
      title: 'Acondicionar Prenda ✨',
      html: `<div class="text-left flex flex-col gap-3 mt-4"><label class="text-[10px] font-black uppercase text-slate-400">Variante Lisa</label><select id="sw-var" class="swal2-select !w-full !m-0">${html}</select><label class="text-[10px] font-black uppercase text-slate-400 mt-2">Cantidad a Terminar</label><input id="sw-qty" type="number" class="swal2-input !w-full !m-0"></div>`,
      showCancelButton: true, confirmButtonText: 'PROCESAR', confirmButtonColor: '#10b981',
      preConfirm: () => ({ vId: (document.getElementById('sw-var') as HTMLSelectElement).value, qty: Number((document.getElementById('sw-qty') as HTMLInputElement).value) })
    });

    if (form?.qty > 0) {
      await transformToFinished(form.vId, form.qty);
      const v = vars.find(x => x.id === form.vId);
      if (v) printThermalLabel(product.name, product.sku || 'S/N', v.sizes?.name || '-', v.colors?.name || '-', form.qty);
      fetchAllCatalogs();
    }
  }, [inventory, transformToFinished, fetchAllCatalogs]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6 bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Base de <span className="text-blue-500">Artículos</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Valuación Total: <span className="text-emerald-500">{ARS.format(patrimonioTotal)}</span></p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => generateStockPDF(filteredProducts, inventory, { showSku: true, showCategory: true, showSize: true, showColor: true, showTotal: true })} className="px-6 py-4 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-xl">🖨️ Reporte</button>
          <button onClick={() => { setModalMode('create'); setEditForm({}); setIsModalOpen(true); }} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all">+ NUEVO ARTÍCULO</button>
        </div>
      </header>

      {/* FILTROS DINÁMICOS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <input type="text" placeholder="🔍 BUSCAR POR NOMBRE O SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-black dark:text-white uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black uppercase dark:text-white outline-none">
          <option value="">TODAS LAS CATEGORÍAS</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* TABLA MAESTRA DE INVENTARIO */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b dark:border-slate-800">
                <th className="p-8">Artículo / Identificación</th>
                <th className="p-8">Matriz de Stock (Talle | Color)</th>
                <th className="p-8 text-center">Cant. Total</th>
                <th className="p-8 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800/50">
              {filteredProducts.map(p => {
                const pInv = inventory?.filter(v => v.product_id === p.id) || [];
                const tStock = pInv.reduce((s, v) => s + v.stock_quantity, 0);
                const uSizes = Array.from(new Set(pInv.map(v => v.sizes?.name))).filter(Boolean).sort();
                const uColors = Array.from(new Set(pInv.map(v => v.colors?.name))).filter(Boolean).sort();

                return (
                  <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                    <td className="p-8 align-top">
                      <span className="font-black text-sm dark:text-white uppercase block leading-none mb-1 italic">{p.name}</span>
                      <span className="text-[10px] font-black text-blue-500 tracking-widest">{p.sku}</span>
                    </td>
                    <td className="p-8">
                      {pInv.length > 0 ? (
                        <div className="inline-block border dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-950">
                          <table className="text-[10px] text-center">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black">
                                <th className="p-3 border-r dark:border-slate-800"></th>
                                {uSizes.map(s => <th key={s} className="p-3 min-w-[45px] uppercase">{s}</th>)}
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                              {uColors.map(c => (
                                <tr key={c}>
                                  <td className="p-3 border-r dark:border-slate-800 font-black text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50">{c}</td>
                                  {uSizes.map(s => {
                                    const qty = pInv.find(i => i.colors?.name === c && i.sizes?.name === s)?.stock_quantity || 0;
                                    return <td key={s} className={`p-3 font-black tabular-nums ${qty > 0 ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-800'}`}>{qty || '-'}</td>;
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <span className="text-[10px] text-slate-400 font-black uppercase italic tracking-widest">Sin stock registrado</span>}
                    </td>
                    <td className="p-8 text-center align-top">
                       <span className="font-black text-xl dark:text-white tabular-nums">{tStock}</span>
                    </td>
                    <td className="p-8 text-right align-top">
                      <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleProcessStock(p)} className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Acondicionar">✨</button>
                        <button onClick={() => openEditModal(p)} className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Editar ✏️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN / ALTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-xl font-black dark:text-white uppercase italic tracking-tighter">{modalMode === 'create' ? '✨ Nuevo Artículo' : '✏️ Edición de Catálogo'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-all">✕</button>
            </header>
            
            <div className="p-10 space-y-8 overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Producto</label>
                  <input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-white font-black uppercase text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Identificador (SKU)</label>
                  <div className="flex gap-2">
                    <input value={editForm.sku || ''} onChange={e => setEditForm({...editForm, sku: e.target.value.toUpperCase()})} className="flex-1 p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl dark:text-blue-400 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={handleGenerateSKU} className="p-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg">🪄</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Costo de Reposición ($)</label>
                   <input type="number" value={editForm.cost_price || ''} onChange={e => setEditForm({...editForm, cost_price: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-rose-500 font-black text-xl outline-none" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Precio de Venta ($)</label>
                   <input type="number" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-emerald-500 font-black text-xl outline-none" />
                </div>
              </div>

              <div className="bg-blue-600/5 dark:bg-blue-600/10 p-8 rounded-[2rem] border border-blue-500/10 space-y-6">
                <div className="flex justify-between items-center border-b border-blue-500/10 pb-4">
                  <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.3em]">Variantes de Stock</p>
                  <button onClick={() => setQuickVariants([...quickVariants, {sizeId: '', colorId: '', qty: ''}])} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all">+ AGREGAR</button>
                </div>
                <div className="space-y-3">
                  {quickVariants.map((v, i) => (
                    <div key={i} className="flex gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
                      <select value={v.sizeId} onChange={e => { const n = [...quickVariants]; n[i].sizeId = e.target.value; setQuickVariants(n); }} className="flex-1 bg-transparent text-xs font-black dark:text-white uppercase outline-none"><option value="">Talle</option>{sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                      <select value={v.colorId} onChange={e => { const n = [...quickVariants]; n[i].colorId = e.target.value; setQuickVariants(n); }} className="flex-1 bg-transparent text-xs font-black dark:text-white uppercase outline-none"><option value="">Color</option>{colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      <input type="number" value={v.qty} onChange={e => { const n = [...quickVariants]; n[i].qty = e.target.value; setQuickVariants(n); }} className="w-20 bg-slate-50 dark:bg-slate-800 text-center font-black rounded-xl text-xs dark:text-blue-500" placeholder="0" />
                      <button onClick={() => setQuickVariants(quickVariants.filter((_, idx) => idx !== i))} className="w-10 h-10 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-all">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <footer className="p-8 bg-slate-50 dark:bg-slate-900/80 border-t dark:border-slate-800 flex justify-end gap-4 sticky bottom-0">
              <button onClick={() => setIsModalOpen(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-12 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all">GUARDAR CAMBIOS 💾</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
});

InventoryDashboard.displayName = 'InventoryDashboard';