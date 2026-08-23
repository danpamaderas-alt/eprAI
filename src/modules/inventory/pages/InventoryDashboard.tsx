import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useInventoryStore, STOCK_THRESHOLDS, type StockMovement } from '../store/useInventoryStore';
import Swal from 'sweetalert2';
import {
  AlertTriangle, PackageX, ArrowUpDown, History, X, Plus, Trash2,
  Package, Search, Edit3, Save, Hash, Palette, Ruler,
} from 'lucide-react';

function stockStatus(qty: number) {
  if (qty <= 0) return { label: 'Sin stock', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' };
  if (qty <= STOCK_THRESHOLDS.min) return { label: 'Stock bajo', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' };
  return { label: 'OK', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' };
}

type Tab = 'todos' | 'stock-bajo' | 'movimientos';

interface NewProductForm {
  name: string;
  category: string;
  price: string;
  cost_price: string;
  sku: string;
  size_id: string;
  color_id: string;
  initial_stock: string;
}

const EMPTY_FORM: NewProductForm = {
  name: '', category: '', price: '', cost_price: '', sku: '',
  size_id: '', color_id: '', initial_stock: '0',
};

export const InventoryDashboard = memo(() => {
  const {
    products, sizes, colors,
    fetchProducts, fetchCatalogs, reserveStock, processPersonalization,
    adjustStock, getStockMovements, createProduct, createVariant,
    createSize, createColor, deleteVariant, updateProduct,
  } = useInventoryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('todos');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Modals
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewSize, setShowNewSize] = useState(false);
  const [showNewColor, setShowNewColor] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; variantId: string; productName: string }>({ open: false, variantId: '', productName: '' });
  const [editModal, setEditModal] = useState<{ open: boolean; productId: string; name: string; category: string; price: string; cost_price: string }>({
    open: false, productId: '', name: '', category: '', price: '', cost_price: '',
  });

  const [form, setForm] = useState<NewProductForm>(EMPTY_FORM);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  useEffect(() => { fetchProducts(); fetchCatalogs(); }, [fetchProducts, fetchCatalogs]);

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(p => {
      if (selectedCategory !== 'Todos' && (p.category || '')?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (!term) return true;
      return (
        (p.product_name || '').toLowerCase().includes(term) ||
        (p.size_name || '').toLowerCase().includes(term) ||
        (p.color_name || '').toLowerCase().includes(term) ||
        (p.id || '').toLowerCase().includes(term)
      );
    });
  }, [products, searchTerm, selectedCategory]);

  const lowStockProducts = useMemo(
    () => filteredProducts.filter(p => (p.stock_quantity || 0) <= STOCK_THRESHOLDS.min),
    [filteredProducts]
  );

  const visibleProducts = activeTab === 'stock-bajo' ? lowStockProducts : filteredProducts;

  const stats = useMemo(() => ({
    total: products.length,
    ok: products.filter(p => (p.stock_quantity || 0) > STOCK_THRESHOLDS.min).length,
    low: products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= STOCK_THRESHOLDS.min).length,
    zero: products.filter(p => (p.stock_quantity || 0) <= 0).length,
  }), [products]);

  // ===== Product Creation =====
  const handleCreateProduct = useCallback(async () => {
    if (!form.name.trim()) return Swal.fire('Error', 'Ingresá el nombre del producto', 'warning');
    try {
      const productId = await createProduct({
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        price: form.price ? Number(form.price) : undefined,
        cost_price: form.cost_price ? Number(form.cost_price) : undefined,
        sku: form.sku.trim() || undefined,
      });
      const stock = Number(form.initial_stock) || 0;
      if (stock > 0 || form.size_id || form.color_id) {
        await createVariant({
          product_id: productId,
          size_id: form.size_id || null,
          color_id: form.color_id || null,
          stock_quantity: stock,
        });
      }
      setShowNewProduct(false);
      setForm(EMPTY_FORM);
      Swal.fire({ title: 'Producto creado', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo crear el producto', 'error');
    }
  }, [form, createProduct, createVariant]);

  // ===== Size/Color Creation =====
  const handleCreateSize = useCallback(async () => {
    if (!newSizeName.trim()) return;
    try {
      await createSize(newSizeName.trim());
      setNewSizeName('');
      setShowNewSize(false);
      Swal.fire({ title: 'Talle creado', icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo crear el talle', 'error');
    }
  }, [newSizeName, createSize]);

  const handleCreateColor = useCallback(async () => {
    if (!newColorName.trim()) return;
    try {
      await createColor(newColorName.trim(), newColorHex);
      setNewColorName('');
      setNewColorHex('#000000');
      setShowNewColor(false);
      Swal.fire({ title: 'Color creado', icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo crear el color', 'error');
    }
  }, [newColorName, newColorHex, createColor]);

  // ===== Edit Product =====
  const openEdit = useCallback((p: typeof products[0]) => {
    setEditModal({
      open: true,
      productId: p.product_id,
      name: p.product_name || '',
      category: p.category || '',
      price: '',
      cost_price: '',
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    try {
      await updateProduct(editModal.productId, {
        name: editModal.name.trim(),
        category: editModal.category.trim() || undefined,
        price: editModal.price ? Number(editModal.price) : undefined,
        cost_price: editModal.cost_price ? Number(editModal.cost_price) : undefined,
      });
      setEditModal({ open: false, productId: '', name: '', category: '', price: '', cost_price: '' });
      Swal.fire({ title: 'Producto actualizado', icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo actualizar', 'error');
    }
  }, [editModal, updateProduct]);

  // ===== Delete Variant =====
  const handleDeleteVariant = useCallback(async (variantId: string, productName: string) => {
    const result = await Swal.fire({
      title: 'Eliminar variante',
      text: `¿Eliminar "${productName}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) {
      try {
        await deleteVariant(variantId);
        Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1000, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire('Error', err?.message || 'No se pudo eliminar', 'error');
      }
    }
  }, [deleteVariant]);

  // ===== Stock Adjust =====
  const openAdjust = useCallback((variantId: string, productName: string) => {
    setAdjustModal({ open: true, variantId, productName });
    setAdjustQty('');
    setAdjustReason('');
  }, []);

  const submitAdjust = useCallback(async () => {
    const qty = Number(adjustQty);
    if (!qty || !adjustReason.trim()) return;
    await adjustStock(adjustModal.variantId, qty, adjustReason.trim());
    setAdjustModal({ open: false, variantId: '', productName: '' });
  }, [adjustQty, adjustReason, adjustModal.variantId, adjustStock]);

  const handleReserve = useCallback(async (pId: string) => {
    const { value: qty } = await Swal.fire({ title: 'Reservar para Taller', input: 'number', showCancelButton: true });
    if (qty > 0) await reserveStock(pId, Number(qty));
  }, [reserveStock]);

  const handleFinish = useCallback(async (pId: string) => {
    const { value: qty } = await Swal.fire({ title: 'Terminar Prenda', input: 'number', showCancelButton: true });
    if (qty > 0) await processPersonalization(pId, Number(qty));
  }, [processPersonalization]);

  const openMovements = useCallback(() => {
    setMovements(getStockMovements());
    setActiveTab('movimientos');
  }, [getStockMovements]);

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            Inventario
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Gestión de stock, productos y variantes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowNewSize(true)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Ruler className="w-3 h-3" /> Talle
          </button>
          <button onClick={() => setShowNewColor(true)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Palette className="w-3 h-3" /> Color
          </button>
          <button onClick={openMovements} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <History className="w-3 h-3" /> Movimientos
          </button>
          <button onClick={() => setShowNewProduct(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95">
            <Plus className="w-3 h-3" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Variantes', value: stats.total, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800' },
          { label: 'Stock OK', value: stats.ok, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Stock Bajo', value: stats.low, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Sin Stock', value: stats.zero, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm`}>
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            <p className={`text-2xl font-black ${color} tabular-nums mt-0.5`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'todos' as Tab, label: `Todos (${filteredProducts.length})` },
          { key: 'stock-bajo' as Tab, label: `Stock Bajo (${lowStockProducts.length})`, warn: lowStockProducts.length > 0 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
              activeTab === tab.key
                ? tab.warn ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-brand text-white shadow-lg shadow-brand/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.key === 'stock-bajo' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
              selectedCategory === cat
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, talla o color..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="p-4">Artículo</th>
                <th className="p-4 text-center">Básico</th>
                <th className="p-4 text-center text-amber-500">En Taller</th>
                <th className="p-4 text-center text-emerald-500">Listo</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleProducts.map(p => {
                const st = stockStatus(p.stock_quantity || 0);
                return (
                  <tr key={p.id} className={`dark:text-white border-l-4 ${st.border.replace('/30', '')} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
                    <td className="p-4">
                      <div className="font-bold uppercase text-xs text-slate-900 dark:text-white">{p.product_name || 'Sin nombre'}</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {p.category && <span className="text-[7px] font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">{p.category}</span>}
                        {p.size_name && <span className="text-[7px] font-bold bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">{p.size_name}</span>}
                        {p.color_name && <span className="text-[7px] font-bold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded uppercase">{p.color_name}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-sm tabular-nums">{p.stock_quantity || 0}</td>
                    <td className="p-4 text-center text-amber-500 font-bold text-sm tabular-nums">{p.base_quantity || 0}</td>
                    <td className="p-4 text-center text-emerald-500 font-bold text-sm tabular-nums">{p.finished_quantity || 0}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${st.bg} ${st.text}`}>
                        {(p.stock_quantity || 0) <= 0 && <PackageX className="w-3 h-3" />}
                        {(p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= STOCK_THRESHOLDS.min && <AlertTriangle className="w-3 h-3" />}
                        {st.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openAdjust(p.id, p.product_name || '')} className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors" title="Ajustar stock">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleReserve(p.id)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="Reservar">
                          <Package className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleFinish(p.id)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Terminar">
                          <Hash className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar producto">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteVariant(p.id, p.product_name || '')} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar variante">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-xs font-black uppercase text-slate-400">Sin resultados</p>
                    <button onClick={() => setShowNewProduct(true)} className="mt-3 text-[10px] font-black uppercase text-brand hover:underline">
                      + Crear producto nuevo
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movements Panel */}
      {activeTab === 'movimientos' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="p-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Historial de Movimientos
            </h2>
            <button onClick={() => setActiveTab('todos')} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {movements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase">Sin movimientos registrados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Producto</th>
                    <th className="p-4 text-center">Tipo</th>
                    <th className="p-4 text-center">Cantidad</th>
                    <th className="p-4">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movements.map(m => (
                    <tr key={m.id} className="dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-slate-500">{new Date(m.timestamp).toLocaleString('es-AR')}</td>
                      <td className="p-4 font-bold uppercase">{m.product_name}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          m.type === 'sale' ? 'bg-red-500/10 text-red-500' :
                          m.type === 'production' ? 'bg-emerald-500/10 text-emerald-500' :
                          m.type === 'reserve' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>{m.type}</span>
                      </td>
                      <td className={`p-4 text-center font-black ${m.quantity_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {m.quantity_change >= 0 ? '+' : ''}{m.quantity_change}
                      </td>
                      <td className="p-4 text-slate-500">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* New Product Modal */}
      {showNewProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewProduct(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Nuevo Producto</h3>
              <button onClick={() => setShowNewProduct(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Remera Básica"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Categoría</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ej: Remeras"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">SKU</label>
                  <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Opcional"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Precio Venta</label>
                  <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Costo</label>
                  <input type="number" min="0" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} placeholder="0"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-[9px] font-black uppercase text-brand tracking-widest mb-2">Variante Inicial (Opcional)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Talle</label>
                    <select value={form.size_id} onChange={e => setForm({ ...form, size_id: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                      <option value="">Sin talle</option>
                      {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Color</label>
                    <select value={form.color_id} onChange={e => setForm({ ...form, color_id: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                      <option value="">Sin color</option>
                      {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Stock Inicial</label>
                    <input type="number" min="0" value={form.initial_stock} onChange={e => setForm({ ...form, initial_stock: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNewProduct(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl text-xs font-black uppercase text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={handleCreateProduct} disabled={!form.name.trim()} className="flex-1 bg-brand text-white py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-brand/20">Crear Producto</button>
            </div>
          </div>
        </div>
      )}

      {/* New Size Modal */}
      {showNewSize && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewSize(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase mb-4 text-slate-900 dark:text-white">Nuevo Talle</h3>
            <input type="text" value={newSizeName} onChange={e => setNewSizeName(e.target.value)} placeholder="Ej: S, M, L, XL, 42..."
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase mb-4"
              onKeyDown={e => e.key === 'Enter' && handleCreateSize()} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setShowNewSize(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleCreateSize} disabled={!newSizeName.trim()} className="flex-1 bg-brand text-white py-2 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* New Color Modal */}
      {showNewColor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewColor(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase mb-4 text-slate-900 dark:text-white">Nuevo Color</h3>
            <div className="flex gap-3 mb-4">
              <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" />
              <input type="text" value={newColorName} onChange={e => setNewColorName(e.target.value)} placeholder="Ej: Negro, Blanco, Rojo..."
                className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase"
                onKeyDown={e => e.key === 'Enter' && handleCreateColor()} autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewColor(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleCreateColor} disabled={!newColorName.trim()} className="flex-1 bg-brand text-white py-2 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAdjustModal({ open: false, variantId: '', productName: '' })}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase mb-1 text-slate-900 dark:text-white">Ajustar Stock</h3>
            <p className="text-xs text-slate-500 mb-4 font-bold">{adjustModal.productName}</p>
            <input type="number" placeholder="Cantidad (+ sumar, - restar)" value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand mb-3" />
            <input type="text" placeholder="Motivo del ajuste" value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setAdjustModal({ open: false, variantId: '', productName: '' })} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={submitAdjust} disabled={!adjustQty || !adjustReason.trim()} className="flex-1 bg-brand text-white py-2 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95">Ajustar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditModal({ ...editModal, open: false })}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase mb-4 text-slate-900 dark:text-white">Editar Producto</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Nombre</label>
                <input type="text" value={editModal.name} onChange={e => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Categoría</label>
                <input type="text" value={editModal.category} onChange={e => setEditModal({ ...editModal, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Precio Venta</label>
                  <input type="number" min="0" value={editModal.price} onChange={e => setEditModal({ ...editModal, price: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Costo</label>
                  <input type="number" min="0" value={editModal.cost_price} onChange={e => setEditModal({ ...editModal, cost_price: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditModal({ ...editModal, open: false })} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleSaveEdit} className="flex-1 bg-brand text-white py-2 rounded-xl text-xs font-black uppercase transition-all active:scale-95 shadow-lg shadow-brand/20">
                <Save className="w-3 h-3 inline mr-1" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

InventoryDashboard.displayName = 'InventoryDashboard';
export default InventoryDashboard;
