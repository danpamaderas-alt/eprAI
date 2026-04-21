import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

const PREDEFINED_CATEGORIES = ['Remera', 'Chomba', 'Buzo', 'Campera', 'Pantalón', 'Accesorio', 'Uniformes', 'Conjunto'];
const PREDEFINED_LOCATIONS = ['Sector A', 'Sector B', 'Depósito Central', 'Taller', 'Showroom'];

export const InventoryDashboard = () => {
  const { 
    products, sizes, colors, inventory,
    fetchAllCatalogs, updateProductComplete, addProduct, addSize, addColor, updateStock, isLoading 
  } = useCatalogStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterColor, setFilterColor] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  
  const [quickSize, setQuickSize] = useState('');
  const [quickColor, setQuickColor] = useState('');
  const [quickQty, setQuickQty] = useState('');

  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState({ type: 'IN', sizeId: '', colorId: '', qty: '' });

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customLocations, setCustomLocations] = useState<string[]>([]);

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

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
      const searchLower = searchTerm.toLowerCase();
      const matchText = p.name?.toLowerCase().includes(searchLower) || p.sku?.toLowerCase().includes(searchLower);
      const matchCat = filterCategory === '' || p.category === filterCategory;
      const productVariants = inventory?.filter(v => v.product_id === p.id) || [];
      const matchSize = filterSize === '' || productVariants.some(v => v.size_id === filterSize && v.stock_quantity > 0);
      const matchColor = filterColor === '' || productVariants.some(v => v.color_id === filterColor && v.stock_quantity > 0);
      return matchText && matchCat && matchSize && matchColor;
    });
  }, [products, searchTerm, filterCategory, filterSize, filterColor, inventory]);

  // ✅ CÁLCULO DEL VALOR PATRIMONIAL
  const patrimonioTotal = useMemo(() => {
    if (!products || !inventory) return 0;
    
    let total = 0;
    // Recorremos todos los productos
    products.forEach(p => {
      // Si el producto tiene un costo definido (mayor a 0)
      const costo = p.cost_price || 0;
      if (costo > 0) {
        // Buscamos todas las variantes de este producto en el inventario
        const productVariants = inventory.filter(v => v.product_id === p.id);
        // Sumamos el stock total de este producto
        const stockTotalDelProducto = productVariants.reduce((sum, v) => sum + v.stock_quantity, 0);
        // Multiplicamos el stock por el precio de costo y lo sumamos al total
        total += (stockTotalDelProducto * costo);
      }
    });
    
    return total;
  }, [products, inventory]);

  const handleGenerateSKU = () => {
    if (!editForm.category || !editForm.location) {
      Swal.fire('Atención', 'Primero seleccioná una Categoría y una Ubicación para generar el SKU.', 'info');
      return;
    }
    const catPrefix = editForm.category.substring(0, 3).toUpperCase();
    const locPrefix = editForm.location.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 3);
    const baseSku = `${catPrefix}-${locPrefix}`;
    const similarProductsCount = products.filter(p => p.sku?.startsWith(baseSku)).length;
    const nextNumber = String(similarProductsCount + 1).padStart(3, '0');
    setEditForm(prev => ({ ...prev, sku: `${baseSku}-${nextNumber}` }));
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditForm({ sku: '', name: '', cost_price: 0, price: 0, category: '', location: '', notes: '' });
    setQuickSize(''); setQuickColor(''); setQuickQty('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setModalMode('edit');
    setEditForm({ ...product });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editForm.name) { Swal.fire('Atención', 'El nombre del artículo es obligatorio', 'warning'); return; }

    try {
      if (modalMode === 'create') {
        const newProd = await addProduct({ 
          sku: editForm.sku, 
          name: editForm.name, 
          cost_price: editForm.cost_price || 0, // ✅ Usamos cost_price
          price: editForm.price || 0, 
          category: editForm.category, 
          location: editForm.location, 
          notes: editForm.notes 
        } as Omit<Product, 'id'>);
        
        if (quickSize && quickColor && Number(quickQty) > 0) { await updateStock(newProd.id, quickSize, quickColor, Number(quickQty)); }
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Artículo creado', showConfirmButton: false, timer: 1500 });
      } else {
        await updateProductComplete(editForm.id!, editForm);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Artículo actualizado', showConfirmButton: false, timer: 1500 });
      }
      closeModal();
    } catch (error: any) { 
      console.error("Detalle del error:", error);
      Swal.fire('Error de Base de Datos', error?.message || error?.details || 'Revisa que el SKU no esté repetido.', 'error'); 
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const result = await Swal.fire({
      title: '¿Eliminar Producto?',
      text: `Se borrará "${product.name}" y todo su stock. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#f43f5e', cancelButtonColor: '#64748b', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' }
    });

    if (result.isConfirmed) {
      try {
        await supabase.from('product_variants').delete().eq('product_id', product.id);
        const { error } = await supabase.from('products').delete().eq('id', product.id);
        if (error) throw error;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Producto eliminado', showConfirmButton: false, timer: 1500 });
        fetchAllCatalogs();
      } catch (error) { Swal.fire('Error', 'No se pudo eliminar el producto.', 'error'); }
    }
  };

  const handleSaveStockAdjust = async () => {
    if (!stockForm.sizeId || !stockForm.colorId || !stockForm.qty || Number(stockForm.qty) <= 0) {
      Swal.fire('Atención', 'Selecciona Talle, Color e ingresa una cantidad válida.', 'warning');
      return;
    }
    
    const quantity = stockForm.type === 'IN' ? Number(stockForm.qty) : -Math.abs(Number(stockForm.qty));
    
    try {
      await updateStock(stockProduct!.id, stockForm.sizeId, stockForm.colorId, quantity);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Stock actualizado', showConfirmButton: false, timer: 1500 });
      setStockProduct(null);
    } catch (error) {
      Swal.fire('Error', 'No se pudo actualizar el stock', 'error');
    }
  };

  const handleAddNewCategory = async () => {
    const { value: newCat } = await Swal.fire({ title: 'Nueva Categoría', input: 'text', showCancelButton: true, confirmButtonText: 'Agregar', confirmButtonColor: '#2563eb' });
    if (newCat) {
      const formatted = newCat.trim().toUpperCase();
      setCustomCategories(prev => [...prev, formatted]);
      setEditForm(prev => ({ ...prev, category: formatted }));
    }
  };
  const handleAddNewLocation = async () => {
    const { value: newLoc } = await Swal.fire({ title: 'Nueva Ubicación', input: 'text', showCancelButton: true, confirmButtonText: 'Agregar', confirmButtonColor: '#2563eb' });
    if (newLoc) {
      const formatted = newLoc.trim().toUpperCase();
      setCustomLocations(prev => [...prev, formatted]);
      setEditForm(prev => ({ ...prev, location: formatted }));
    }
  };

  const handleAddNewSize = async () => {
    const { value: newSizeName } = await Swal.fire({ title: 'Crear Nuevo Talle', input: 'text', showCancelButton: true, confirmButtonText: 'Crear', confirmButtonColor: '#2563eb' });
    if (newSizeName) {
      try { 
        const created = await addSize(newSizeName.toUpperCase()); 
        setQuickSize(created.id);
        setStockForm(prev => ({ ...prev, sizeId: created.id }));
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Talle agregado', showConfirmButton: false, timer: 1500 });
      } catch { Swal.fire('Error', 'No se pudo crear', 'error'); }
    }
  };
  const handleAddNewColor = async () => {
    const { value: newColorName } = await Swal.fire({ title: 'Crear Nuevo Color', input: 'text', showCancelButton: true, confirmButtonText: 'Crear', confirmButtonColor: '#2563eb' });
    if (newColorName) {
      try { 
        const created = await addColor(newColorName.toUpperCase()); 
        setQuickColor(created.id);
        setStockForm(prev => ({ ...prev, colorId: created.id }));
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Color agregado', showConfirmButton: false, timer: 1500 });
      } catch { Swal.fire('Error', 'No se pudo crear', 'error'); }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Base de Artículos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Gestión centralizada de catálogo y stock.</p>
        </div>
        
        <button 
          onClick={openCreateModal}
          className="px-6 py-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          Nuevo Artículo
        </button>
      </header>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">🔍</div>
          <input 
            type="text" placeholder="Buscar por Nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="min-w-[140px] px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none">
            <option value="">👚 CATEGORÍA: TODAS</option>
            {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          
          <select value={filterSize} onChange={e => setFilterSize(e.target.value)} className="min-w-[120px] px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none">
            <option value="">📏 TALLE: TODOS</option>
            {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select value={filterColor} onChange={e => setFilterColor(e.target.value)} className="min-w-[120px] px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none">
            <option value="">🎨 COLOR: TODOS</option>
            {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {(searchTerm || filterCategory || filterSize || filterColor) && (
            <button onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterSize(''); setFilterColor(''); }} className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl text-xs font-black uppercase transition-colors hover:bg-rose-100">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Sincronizando Base de Datos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="py-5 px-6 w-1/3">SKU / Artículo</th>
                  <th className="py-5 px-6">Matriz de Stock</th>
                  <th className="py-5 px-6 text-center text-blue-500">Stock Total</th>
                  <th className="py-5 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredProducts.map(p => {
                  const productVariants = inventory?.filter(v => v.product_id === p.id) || [];
                  const totalStock = productVariants.reduce((sum, v) => sum + v.stock_quantity, 0);

                  const uniqueSizes = Array.from(new Set(productVariants.map(v => v.sizes?.name))).filter(Boolean).sort();
                  const uniqueColors = Array.from(new Set(productVariants.map(v => v.colors?.name))).filter(Boolean).sort();

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-white text-sm uppercase leading-tight">{p.name}</span>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {p.sku || 'S/N'}
                            </span>
                            <span className="text-[9px] font-bold text-blue-500 uppercase">{p.category || 'GENERAL'}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">📍 {p.location || '---'}</span>
                          </div>
                          <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase">
                              Costo: <span className="text-rose-600 font-black mr-2">${(p.cost_price || 0).toLocaleString('es-AR')}</span>
                              Venta: <span className="text-emerald-600 dark:text-emerald-400 font-black">${(p.price || 0).toLocaleString('es-AR')}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {productVariants.length === 0 ? (
                          <span className="text-[10px] font-bold text-slate-400 italic">Sin stock registrado</span>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 inline-block max-w-full">
                            <table className="text-[10px] text-center border-collapse">
                              <thead>
                                <tr>
                                  <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"></th>
                                  {uniqueSizes.map(sizeName => (
                                    <th key={sizeName} className="p-2 border-b border-slate-200 dark:border-slate-700 font-black text-slate-600 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800/50 min-w-[40px]">
                                      {sizeName}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {uniqueColors.map(colorName => (
                                  <tr key={colorName}>
                                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-bold text-slate-500 uppercase text-left whitespace-nowrap">
                                      {colorName}
                                    </td>
                                    {uniqueSizes.map(sizeName => {
                                      const variant = productVariants.find(v => v.colors?.name === colorName && v.sizes?.name === sizeName);
                                      const qty = variant?.stock_quantity || 0;
                                      return (
                                        <td key={`${colorName}-${sizeName}`} className={`p-2 font-black border-slate-100 dark:border-slate-800 border-b border-r ${qty > 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : 'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900'}`}>
                                          {qty > 0 ? qty : '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center align-top">
                        <span className={`text-base font-black px-3 py-1 rounded-lg inline-block ${totalStock > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          {totalStock}
                        </span>
                      </td>
                      
                      <td className="py-4 px-6 text-center align-top">
                        <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            setStockProduct(p);
                            setStockForm({ type: 'IN', sizeId: '', colorId: '', qty: '' });
                          }} className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-lg transition-all uppercase border border-emerald-200 dark:border-emerald-800" title="Ajustar Stock">📦</button>
                          
                          <button onClick={() => openEditModal(p)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-600 text-[10px] font-black rounded-lg transition-all uppercase border border-slate-200 dark:border-slate-700" title="Editar Producto">✏️</button>
                          <button onClick={() => handleDeleteProduct(p)} className="px-3 py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg transition-all uppercase border border-rose-200 dark:border-rose-800" title="Eliminar Producto">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE AJUSTE DE STOCK */}
      {stockProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                📦 Ajustar Stock
              </h2>
              <button onClick={() => setStockProduct(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm font-bold text-slate-500 uppercase">{stockProduct.name}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Talle</label>
                  <div className="flex gap-2">
                    <select value={stockForm.sizeId} onChange={e => setStockForm({...stockForm, sizeId: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none">
                      <option value="">Seleccionar...</option>
                      {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button onClick={handleAddNewSize} type="button" className="px-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black transition-colors">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Color</label>
                  <div className="flex gap-2">
                    <select value={stockForm.colorId} onChange={e => setStockForm({...stockForm, colorId: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none">
                      <option value="">Seleccionar...</option>
                      {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={handleAddNewColor} type="button" className="px-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black transition-colors">+</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Operación</label>
                  <select value={stockForm.type} onChange={e => setStockForm({...stockForm, type: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-800 dark:text-white outline-none">
                    <option value="IN">➕ INGRESO</option>
                    <option value="OUT">➖ SALIDA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Cantidad</label>
                  <input type="number" min="1" placeholder="Ej: 10" value={stockForm.qty} onChange={e => setStockForm({...stockForm, qty: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-800 dark:text-white outline-none text-center" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setStockProduct(null)} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-200 transition-colors uppercase tracking-widest">
                Cancelar
              </button>
              <button onClick={handleSaveStockAdjust} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-95 uppercase tracking-widest">
                Guardar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CREAR/EDITAR ARTÍCULO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {modalMode === 'create' ? 'Nuevo Artículo' : 'Editar Artículo'}
                </h2>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-700 hover:bg-rose-50 rounded-full shadow-sm transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoría (Tipo de Prenda)</label>
                  <div className="flex gap-2">
                    <select 
                      value={editForm.category || ''} 
                      onChange={e => setEditForm({...editForm, category: e.target.value})} 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Seleccionar --</option>
                      {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <button onClick={handleAddNewCategory} type="button" className="px-4 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-xl font-black transition-colors" title="Agregar Nueva Categoría">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sector / Ubicación</label>
                  <div className="flex gap-2">
                    <select 
                      value={editForm.location || ''} 
                      onChange={e => setEditForm({...editForm, location: e.target.value})} 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Seleccionar --</option>
                      {allLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                    <button onClick={handleAddNewLocation} type="button" className="px-4 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-xl font-black transition-colors" title="Agregar Nueva Ubicación">+</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Código SKU</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ej: REM-SA-001" 
                      value={editForm.sku || ''} 
                      onChange={e => setEditForm({...editForm, sku: e.target.value.toUpperCase()})} 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                    <button 
                      onClick={handleGenerateSKU} 
                      type="button" 
                      title="Autogenerar SKU Mágico"
                      className="px-4 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white rounded-xl font-black transition-colors flex items-center justify-center"
                    >
                      🪄
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Producto *</label>
                  <input type="text" placeholder="Ej: Remera Algodón Premium" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="relative">
                  {/* ✅ AQUÍ APUNTAMOS A cost_price */}
                  <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Valor de Costo ($)</label>
                  <input type="number" value={editForm.cost_price || ''} onChange={e => setEditForm({...editForm, cost_price: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-900/30 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none" />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Precio de Venta ($)</label>
                  <input type="number" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              {modalMode === 'create' && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 mt-6">
                  <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase mb-4">Stock Físico Inicial (Opcional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Talle</label>
                      <div className="flex gap-2">
                        <select value={quickSize} onChange={e => setQuickSize(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                          <option value="">Seleccionar...</option>
                          {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button onClick={handleAddNewSize} type="button" className="px-3 bg-blue-100 text-blue-600 rounded-xl font-black">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Color</label>
                      <div className="flex gap-2">
                        <select value={quickColor} onChange={e => setQuickColor(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-sm font-bold outline-none">
                          <option value="">Seleccionar...</option>
                          {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={handleAddNewColor} type="button" className="px-3 bg-blue-100 text-blue-600 rounded-xl font-black">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Cantidad</label>
                      <input type="number" placeholder="Ej: 50" value={quickQty} onChange={e => setQuickQty(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas Adicionales</label>
                <textarea rows={2} value={editForm.notes || ''} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>

            </div>

            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-10">
              <button onClick={closeModal} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-200 transition-colors uppercase tracking-widest">
                Cancelar
              </button>
              <button onClick={handleSave} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-widest">
                {modalMode === 'create' ? 'Crear Artículo' : 'Guardar Cambios'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};