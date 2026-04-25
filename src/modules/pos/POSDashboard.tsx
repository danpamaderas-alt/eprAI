import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore } from '../../store/useCatalogStore';
import Swal from 'sweetalert2';

interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  qty: number;
  maxQty: number; // Para no vender más de lo que hay terminado
}

export const POSDashboard = () => {
  const { products, inventory, customers, fetchAllCatalogs, processSale } = useCatalogStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  // Filtramos solo los productos que tengan STOCK TERMINADO > 0
  const availableVariants = useMemo(() => {
    return inventory.filter(v => (v.finished_quantity || 0) > 0).map(v => {
      const prod = products.find(p => p.id === v.product_id);
      return {
        variantId: v.id,
        productId: v.product_id,
        name: prod?.name || 'Producto Desconocido',
        sku: prod?.sku || 'S/N',
        price: prod?.price || 0,
        size: v.sizes?.name || 'ÚNICO',
        color: v.colors?.name || 'ÚNICO',
        finished_qty: v.finished_quantity || 0
      };
    }).filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.sku.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, products, searchTerm]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const addToCart = (variant: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.variantId === variant.variantId);
      if (existing) {
        if (existing.qty >= variant.finished_qty) {
          Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock Terminado al límite', showConfirmButton: false, timer: 1500 });
          return prev;
        }
        return prev.map(item => item.variantId === variant.variantId ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, {
        variantId: variant.variantId,
        productId: variant.productId,
        name: variant.name,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price: variant.price,
        qty: 1,
        maxQty: variant.finished_qty
      }];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      Swal.fire('Atención', 'Seleccioná un cliente o institución para asignarle la venta.', 'warning');
      return;
    }
    if (cart.length === 0) return;

    const cliente = customers.find(c => c.id === selectedCustomer);

    const result = await Swal.fire({
      title: 'Confirmar Venta Comercial',
      html: `¿Facturar <b>${cart.length} artículos</b> por un total de <b>$${cartTotal.toLocaleString('es-AR')}</b> a <b>${cliente?.name}</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, registrar salida'
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        await processSale(selectedCustomer, cart, cartTotal);
        Swal.fire('¡Venta Registrada!', 'La mercadería se descontó del galpón y el saldo se actualizó.', 'success');
        setCart([]);
        setSelectedCustomer('');
      } catch (error: any) {
        Swal.fire('Error', error.message || 'No se pudo procesar la venta.', 'error');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-6 animate-in fade-in duration-500">
      
      {/* PANEL IZQUIERDO: CATÁLOGO TERMINADO */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">🛒 Mercadería Terminada</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">🔍</div>
            <input 
              type="text" placeholder="Buscar artículo listo para entregar..." 
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {availableVariants.map(v => (
              <div 
                key={v.variantId} 
                onClick={() => addToCart(v)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all group active:scale-95 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase">{v.sku}</span>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">✨ {v.finished_qty} Disp.</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-blue-500 transition-colors">{v.name}</h3>
                  <div className="flex gap-1 text-[10px] font-bold text-slate-500 uppercase">
                    <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded">{v.size}</span>
                    <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded">{v.color}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-right">
                  <span className="font-black text-lg text-slate-900 dark:text-white">${v.price.toLocaleString('es-AR')}</span>
                </div>
              </div>
            ))}
            {availableVariants.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-400 font-bold">
                No hay stock terminado para vender. Usá el inventario para acondicionar prendas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: COMANDA B2B */}
      <div className="w-96 flex flex-col bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-lg font-black uppercase tracking-widest text-indigo-400 mb-4">Comanda B2B</h2>
          <select 
            value={selectedCustomer} 
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500"
          >
            <option value="">-- Asignar Cliente / Institución --</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-950/50">
          {cart.map(item => (
            <div key={item.variantId} className="bg-slate-800 p-3 rounded-xl flex justify-between items-center border border-slate-700">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-black truncate">{item.name}</p>
                <p className="text-[9px] text-slate-400 uppercase">{item.size} | {item.color}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-300">{item.qty} un.</span>
                <button onClick={() => removeFromCart(item.variantId)} className="text-slate-500 hover:text-rose-500 transition-colors">✕</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex items-center justify-center text-slate-600 text-sm font-bold text-center px-6">
              Seleccioná prendas del catálogo para armar el pedido.
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-900 border-t border-slate-800">
          <div className="flex justify-between items-end mb-6">
            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Venta</span>
            <span className="text-3xl font-black text-emerald-400">${cartTotal.toLocaleString('es-AR')}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${
              cart.length > 0 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95' 
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Salida'}
          </button>
        </div>
      </div>
    </div>
  );
};