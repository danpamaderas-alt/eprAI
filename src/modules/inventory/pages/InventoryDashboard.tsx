import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

// 📋 LISTAS BASE (El sistema le va a sumar automáticamente las que vos vayas creando)
const PREDEFINED_CATEGORIES = ['Remera', 'Chomba', 'Buzo', 'Campera', 'Pantalón', 'Accesorio', 'Uniformes', 'Conjunto'];
const PREDEFINED_LOCATIONS = ['Sector A', 'Sector B', 'Depósito Central', 'Taller', 'Showroom'];

export const InventoryDashboard = () => {
  const { 
    products, sizes, colors, 
    fetchAllCatalogs, updateProductComplete, addProduct, addSize, addColor, updateStock, isLoading 
  } = useCatalogStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  
  const [quickSize, setQuickSize] = useState('');
  const [quickColor, setQuickColor] = useState('');
  const [quickQty, setQuickQty] = useState('');

  // 🧠 ESTADOS PARA APRENDER NUEVAS CATEGORÍAS/UBICACIONES EN LA SESIÓN
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customLocations, setCustomLocations] = useState<string[]>([]);

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      return p.name?.toLowerCase().includes(searchLower) || p.sku?.toLowerCase().includes(searchLower);
    });
  }, [products, searchTerm]);

  // 🧠 LÓGICA INTELIGENTE: Mezclamos las listas base + lo que ya tenés en la base de datos + lo que agregues nuevo hoy
  const allCategories = useMemo(() => {
    const fromDB = products.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set([...PREDEFINED_CATEGORIES, ...fromDB, ...customCategories])).sort();
  }, [products, customCategories]);

  const allLocations = useMemo(() => {
    const fromDB = products.map(p => p.location).filter(Boolean) as string[];
    return Array.from(new Set([...PREDEFINED_LOCATIONS, ...fromDB, ...customLocations])).sort();
  }, [products, customLocations]);


  // --- GENERADOR INTELIGENTE DE SKU 🪄 ---
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
    setEditForm({ sku: '', name: '', cost: 0, price: 0, category: '', location: '', notes: '' });
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
    if (!editForm.name) {
      Swal.fire('Atención', 'El nombre del artículo es obligatorio', 'warning');
      return;
    }

    try {
      if (modalMode === 'create') {
        const newProd = await addProduct({
          sku: editForm.sku,
          name: editForm.name,
          cost: editForm.cost || 0,
          price: editForm.price || 0,
          category: editForm.category,
          location: editForm.location,
          notes: editForm.notes
        } as Omit<Product, 'id'>);

        if (quickSize && quickColor && Number(quickQty) > 0) {
          await updateStock(newProd.id, quickSize, quickColor, Number(quickQty));
        }
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Artículo creado', showConfirmButton: false, timer: 1500 });
      } else {
        await updateProductComplete(editForm.id!, editForm);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Artículo actualizado', showConfirmButton: false, timer: 1500 });
      }
      closeModal();
    } catch (e) {
      Swal.fire('Error', 'Hubo un problema al guardar', 'error');
    }
  };

  // --- FUNCIONES PARA AGREGAR OPCIONES AL VUELO ---
  const handleAddNewCategory = async () => {
    const { value: newCat } = await Swal.fire({ title: 'Nueva Categoría', input: 'text', inputPlaceholder: 'Ej: Camperas, Tazas...', showCancelButton: true, confirmButtonText: 'Agregar', confirmButtonColor: '#2563eb' });
    if (newCat) {
      const formatted = newCat.trim().toUpperCase();
      setCustomCategories(prev => [...prev, formatted]);
      setEditForm(prev => ({ ...prev, category: formatted }));
    }
  };

  const handleAddNewLocation = async () => {
    const { value: newLoc } = await Swal.fire({ title: 'Nueva Ubicación', input: 'text', inputPlaceholder: 'Ej: Estante 4, Pasillo B...', showCancelButton: true, confirmButtonText: 'Agregar', confirmButtonColor: '#2563eb' });
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
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Talle agregado', showConfirmButton: false, timer: 1500 });
      } catch (e) { Swal.fire('Error', 'No se pudo crear el talle', 'error'); }
    }
  };

  const handleAddNewColor = async () => {
    const { value: newColorName } = await Swal.fire({ title: 'Crear Nuevo Color', input: 'text', showCancelButton: true, confirmButtonText: 'Crear', confirmButtonColor: '#2563eb' });
    if (newColorName) {
      try {
        const created = await addColor(newColorName.toUpperCase());
        setQuickColor(created.id);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Color agregado', showConfirmButton: false, timer: 1500 });
      } catch (e) { Swal.fire('Error', 'No se pudo crear el color', 'error'); }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Base de Artículos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Gestión centralizada de catálogo y costos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="Buscar por Nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="px-6 py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Nuevo Artículo
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Sincronizando Base de Datos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="py-5 px-6">SKU / Artículo</th>
                  <th className="py-5 px-6">Ubicación</th>
                  <th className="py-5 px-6 text-right text-rose-500">Costo Compra</th>
                  <th className="py-5 px-6 text-right text-emerald-500">Precio Venta</th>
                  <th className="py-5 px-6 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 dark:text-white text-sm uppercase">{p.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {p.sku || 'S/N'}
                          </span>
                          <span className="text-[10px] font-bold text-blue-500 uppercase">{p.category || 'GENERAL'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-bold text-slate-500">{p.location || '---'}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">${(p.cost || 0).toLocaleString('es-AR')}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-base font-black text-slate-900 dark:text-white">${(p.price || 0).toLocaleString('es-AR')}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => openEditModal(p)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 text-xs font-black rounded-lg transition-all opacity-0 group-hover:opacity-100 uppercase tracking-wide">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              
              {/* 🛠️ CATEGORÍA Y UBICACIÓN CON BOTÓN "+" */}
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

              {/* 🪄 CÓDIGO SKU CON GENERADOR */}
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

              {/* PRECIOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="relative">
                  <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Costo de Compra ($)</label>
                  <input type="number" value={editForm.cost || ''} onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-900/30 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none" />
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Precio de Venta ($)</label>
                  <input type="number" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              {/* CARGA INICIAL (Solo en Create) */}
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

              {/* NOTAS */}
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