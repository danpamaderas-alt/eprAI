import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useInventoryStore, STOCK_THRESHOLDS, type StockMovement } from '../store/useInventoryStore';
import Swal from 'sweetalert2';
import { AlertTriangle, PackageX, ArrowUpDown, History, X } from 'lucide-react';

function stockStatus(qty: number) {
  if (qty <= 0) return { label: 'Sin stock', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' };
  if (qty <= STOCK_THRESHOLDS.min) return { label: 'Stock bajo', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' };
  return { label: 'OK', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' };
}

type Tab = 'todos' | 'stock-bajo' | 'movimientos';

export const InventoryDashboard = memo(() => {
  const { products, fetchProducts, isLoading, reserveStock, processPersonalization, adjustStock, getStockMovements } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('todos');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; variantId: string; productName: string }>({ open: false, variantId: '', productName: '' });
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [movements, setMovements] = useState<StockMovement[]>([]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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

  const handleReserve = useCallback(async (pId: string) => {
    const { value: qty } = await Swal.fire({ title: 'Reservar para Taller', input: 'number', showCancelButton: true });
    if (qty > 0) await reserveStock(pId, Number(qty));
  }, [reserveStock]);

  const handleFinish = useCallback(async (pId: string) => {
    const { value: qty } = await Swal.fire({ title: 'Terminar Prenda', input: 'number', showCancelButton: true });
    if (qty > 0) await processPersonalization(pId, Number(qty));
  }, [processPersonalization]);

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

  const openMovements = useCallback(() => {
    setMovements(getStockMovements());
    setActiveTab('movimientos');
  }, [getStockMovements]);

  return (
    <div className="space-y-6 p-4">
      <header className="bg-slate-900 p-8 rounded-[2rem] text-white flex justify-between items-center">
        <h1 className="text-2xl font-black italic">STOCK <span className="text-blue-500">DUAL</span></h1>
        <div className="flex gap-2">
          <button onClick={openMovements} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
            <History className="w-3 h-3" /> Movimientos
          </button>
          <button onClick={fetchProducts} className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">{isLoading ? '...' : 'Actualizar'}</button>
        </div>
      </header>

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
                ? tab.warn ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.key === 'stock-bajo' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {tab.label}
          </button>
        ))}
      </div>

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

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b dark:border-slate-800">
          <input
            type="text"
            placeholder="Buscar por nombre, talla o color..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 text-xs font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-6">Articulo</th>
              <th className="p-6 text-center">Basico</th>
              <th className="p-6 text-center text-amber-500">En Taller</th>
              <th className="p-6 text-center text-emerald-500">Listo</th>
              <th className="p-6 text-center">Estado</th>
              <th className="p-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {visibleProducts.map(p => {
              const st = stockStatus(p.stock_quantity || 0);
              return (
                <tr key={p.id} className={`dark:text-white border-l-4 ${st.border.replace('/30', '')}`}>
                  <td className="p-6">
                    <div className="font-bold uppercase text-xs">{p.product_name || 'Sin nombre'}</div>
                    {(p.size_name || p.color_name) && (
                      <div className="flex gap-1 mt-1">
                        {p.size_name && <span className="text-[8px] font-bold bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">{p.size_name}</span>}
                        {p.color_name && <span className="text-[8px] font-bold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded uppercase">{p.color_name}</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-center font-bold">{p.stock_quantity || 0}</td>
                  <td className="p-6 text-center text-amber-500 font-bold">{p.base_quantity || 0}</td>
                  <td className="p-6 text-center text-emerald-500 font-bold">{p.finished_quantity || 0}</td>
                  <td className="p-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${st.bg} ${st.text}`}>
                      {(p.stock_quantity || 0) <= 0 && <PackageX className="w-3 h-3" />}
                      {(p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= STOCK_THRESHOLDS.min && <AlertTriangle className="w-3 h-3" />}
                      {st.label}
                    </span>
                  </td>
                  <td className="p-6 text-right flex justify-end gap-2">
                    <button onClick={() => openAdjust(p.id, p.product_name || '')} className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-blue-500/20 transition-colors" title="Ajustar stock">
                      <ArrowUpDown className="w-3 h-3 inline" />
                    </button>
                    <button onClick={() => handleReserve(p.id)} className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Reserva</button>
                    <button onClick={() => handleFinish(p.id)} className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Terminar</button>
                  </td>
                </tr>
              );
            })}
            {visibleProducts.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-slate-400 text-xs font-bold uppercase">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {activeTab === 'movimientos' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="p-6 flex items-center justify-between border-b dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <History className="w-3 h-3" /> Historial de Movimientos
            </h2>
            <button onClick={() => setActiveTab('todos')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          {movements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase">Sin movimientos registrados</div>
          ) : (
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
              <tbody className="divide-y dark:divide-slate-800">
                {movements.map(m => (
                  <tr key={m.id} className="dark:text-white text-xs">
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
          )}
        </div>
      )}

      {adjustModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAdjustModal({ open: false, variantId: '', productName: '' })}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase mb-4">Ajustar Stock</h3>
            <p className="text-xs text-slate-500 mb-4 font-bold">{adjustModal.productName}</p>
            <input
              type="number"
              placeholder="Cantidad (+ para sumar, - para restar)"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 text-xs font-bold mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Motivo del ajuste"
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2 text-xs font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setAdjustModal({ open: false, variantId: '', productName: '' })} className="flex-1 bg-slate-200 dark:bg-slate-700 py-2 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={submitAdjust} disabled={!adjustQty || !adjustReason.trim()} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase disabled:opacity-40">Ajustar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
