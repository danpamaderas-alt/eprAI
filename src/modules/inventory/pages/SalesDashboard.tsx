import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
// ✅ IMPORTACIÓN DEL STORE DE TESORERÍA
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import Swal from 'sweetalert2';

// Interfaz para los ítems del carrito
interface CartItem {
  id: string; // ID único para el carrito
  product: Product;
  sizeId: string;
  sizeName: string;
  colorId: string;
  colorName: string;
  quantity: number;
  price: number;
}

export const SalesDashboard = () => {
  const { products, inventory, sizes, colors, fetchAllCatalogs, updateStock } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore();
  // ✅ TRAEMOS LA FUNCIÓN PARA AGREGAR PLATA A LA CAJA
  const { addMovement } = useTreasuryStore(); 

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Estado del Carrito y Venta
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CONSUMIDOR_FINAL');
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'MERCADO_PAGO' | 'BANCO_NACION'>('MERCADO_PAGO');

  useEffect(() => {
    fetchAllCatalogs();
    fetchCustomers();
  }, [fetchAllCatalogs, fetchCustomers]);

  // Extraer categorías únicas para el filtro
  const allCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort() as string[];
  }, [products]);

  // Filtrar productos en el catálogo
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchText = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === '' || p.category === filterCategory;
      return matchText && matchCat;
    });
  }, [products, searchTerm, filterCategory]);

  // Totales del carrito
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // 🛒 AGREGAR AL CARRITO (Con selección de Talle/Color)
  const handleAddToCart = async (product: Product) => {
    // 1. Buscar qué variantes de este producto tienen stock > 0
    const availableVariants = inventory.filter(v => v.product_id === product.id && v.stock_quantity > 0);

    if (availableVariants.length === 0) {
      Swal.fire('Sin Stock', 'Este producto no tiene stock disponible en ningún talle o color.', 'error');
      return;
    }

    // 2. Armar las opciones para el SweetAlert
    const optionsHtml = availableVariants.map(v => {
      const sizeName = sizes.find(s => s.id === v.size_id)?.name || 'N/A';
      const colorName = colors.find(c => c.id === v.color_id)?.name || 'N/A';
      return `<option value="${v.size_id}|${v.color_id}|${sizeName}|${colorName}">Talle ${sizeName} - ${colorName} (Stock: ${v.stock_quantity})</option>`;
    }).join('');

    const { value: selectedVariant } = await Swal.fire({
      title: 'Seleccionar Variante',
      html: `
        <div class="text-left mt-2">
          <p class="text-sm font-bold text-slate-400 mb-4">${product.name}</p>
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Talle y Color disponible</label>
          <select id="swal-variant" class="swal2-input w-full !mx-0 text-sm font-bold">
            ${optionsHtml}
          </select>
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1 mt-4 block">Cantidad a vender</label>
          <input id="swal-qty" type="number" min="1" class="swal2-input w-full !mx-0 text-center font-black text-2xl" value="1">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Agregar al Ticket',
      confirmButtonColor: '#2563eb',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' },
      preConfirm: () => {
        const variantVal = (document.getElementById('swal-variant') as HTMLSelectElement).value;
        const qty = (document.getElementById('swal-qty') as HTMLInputElement).value;
        
        if (!qty || Number(qty) <= 0) {
          Swal.showValidationMessage('Ingresa una cantidad válida');
          return false;
        }

        const [sizeId, colorId, sizeName, colorName] = variantVal.split('|');
        
        // Validar que no estemos vendiendo más del stock que hay
        const stockReal = availableVariants.find(v => v.size_id === sizeId && v.color_id === colorId)?.stock_quantity || 0;
        if (Number(qty) > stockReal) {
          Swal.showValidationMessage(`Solo hay ${stockReal} unidades en stock de esta variante.`);
          return false;
        }

        return { sizeId, colorId, sizeName, colorName, quantity: Number(qty) };
      }
    });

    if (selectedVariant) {
      // Chequear si ya está en el carrito para sumar cantidad
      const existingItemIndex = cart.findIndex(item => item.product.id === product.id && item.sizeId === selectedVariant.sizeId && item.colorId === selectedVariant.colorId);

      if (existingItemIndex >= 0) {
        const newCart = [...cart];
        newCart[existingItemIndex].quantity += selectedVariant.quantity;
        setCart(newCart);
      } else {
        setCart(prev => [...prev, {
          id: crypto.randomUUID(),
          product,
          sizeId: selectedVariant.sizeId,
          sizeName: selectedVariant.sizeName,
          colorId: selectedVariant.colorId,
          colorName: selectedVariant.colorName,
          quantity: selectedVariant.quantity,
          price: product.price || 0
        }]);
      }
    }
  };

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  // 💰 PROCESAR LA VENTA Y REGISTRAR EN TESORERÍA
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const result = await Swal.fire({
      title: 'Confirmar Venta',
      html: `
        <p class="mb-4">Total a cobrar: <strong>$${cartTotal.toLocaleString('es-AR')}</strong></p>
        <p class="text-sm text-slate-500">Se registrará en <strong>${paymentMethod.replace('_', ' ')}</strong></p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Cobrar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' }
    });

    if (result.isConfirmed) {
      try {
        // 1. Descontar el stock de cada ítem en el carrito
        for (const item of cart) {
          await updateStock(item.product.id, item.sizeId, item.colorId, -Math.abs(item.quantity)); // Negativo para restar
        }

        // 2. 🔥 Registrar el ingreso en Tesorería
        const clientName = selectedCustomerId === 'CONSUMIDOR_FINAL' 
          ? 'Consumidor Final' 
          : customers.find((c: any) => c.id === selectedCustomerId)?.name || 'Cliente';

        await addMovement({
          date: new Date().toISOString(),
          concept: `Venta: ${clientName} (${cartItemsCount} prendas)`,
          category: 'VENTA MOSTRADOR',
          account: paymentMethod,
          type: 'IN',
          amount: cartTotal
        });
        
        // 3. Limpiar y avisar
        Swal.fire({
          icon: 'success',
          title: '¡Venta Exitosa!',
          text: 'Stock descontado e ingreso registrado en Tesorería.',
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' }
        });
        
        setCart([]); // Vaciamos el carrito
        setSelectedCustomerId('CONSUMIDOR_FINAL'); // Reseteamos cliente
        fetchAllCatalogs(); // Recargamos para ver el stock actualizado

      } catch (error: any) {
        console.error(error);
        Swal.fire('Error', 'No se pudo completar la operación: ' + (error.message || 'Error desconocido'), 'error');
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-6 animate-in fade-in duration-500">
      
      {/* 📦 PANEL IZQUIERDO: CATÁLOGO Y BUSCADOR */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        
        {/* Buscador */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">🔍</div>
            <input 
              type="text" placeholder="Buscar producto por Nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="sm:w-48 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 outline-none">
            <option value="">TODAS LAS CAT.</option>
            {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Grilla de Productos */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => {
              // Calcular stock total rápido para mostrar en la tarjeta
              const totalStock = inventory.filter(v => v.product_id === p.id).reduce((sum, v) => sum + v.stock_quantity, 0);

              return (
                <div 
                  key={p.id} 
                  onClick={() => totalStock > 0 && handleAddToCart(p)}
                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col h-full ${totalStock > 0 ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-400 shadow-sm hover:shadow-md' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed'}`}
                >
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{p.sku || 'S/N'}</span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight flex-1 mb-2">{p.name}</h3>
                  <div className="flex justify-between items-end mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-blue-600 dark:text-blue-400 font-black">${(p.price || 0).toLocaleString('es-AR')}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${totalStock > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                      Stock: {totalStock}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🛒 PANEL DERECHO: TICKET Y COBRO */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex-shrink-0">
        
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-2">
            🛒 Ticket Actual
          </h2>
        </div>

        {/* Cliente y Pago */}
        <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Cliente</label>
            <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500">
              <option value="CONSUMIDOR_FINAL">👤 Consumidor Final</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Medio de Pago</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500">
              <option value="MERCADO_PAGO">📱 Mercado Pago</option>
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="BANCO_NACION">🏦 Transferencia (Banco)</option>
            </select>
          </div>
        </div>

        {/* Lista del Carrito */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <span className="text-5xl mb-2">🛍️</span>
              <p className="text-xs font-black uppercase tracking-widest">Carrito Vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 relative group">
                <div className="flex-1">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase leading-tight pr-6">{item.product.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">TALLE {item.sizeName} | {item.colorName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{item.quantity} x ${(item.price).toLocaleString('es-AR')}</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">${(item.price * item.quantity).toLocaleString('es-AR')}</span>
                  </div>
                </div>
                <button onClick={() => handleRemoveFromCart(item.id)} className="absolute top-2 right-2 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white">✕</button>
              </div>
            ))
          )}
        </div>

        {/* Totales y Botón Cobrar */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-950">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Artículos</span>
            <span className="text-xs font-black text-white">{cartItemsCount} un.</span>
          </div>
          <div className="flex justify-between items-end mb-4">
            <span className="text-sm font-black text-slate-300 uppercase tracking-widest">Total</span>
            <span className="text-3xl font-black text-emerald-400">${cartTotal.toLocaleString('es-AR')}</span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95"
          >
            {cart.length === 0 ? 'Selecciona Productos' : 'Cobrar e Imprimir'}
          </button>
        </div>

      </div>
    </div>
  );
};