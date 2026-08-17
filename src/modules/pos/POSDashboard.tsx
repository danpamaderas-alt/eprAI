import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useCatalogStore, type Customer } from '../../store/useCatalogStore';
import { useCrmStore } from '../crm/store/useCrmStore';
import { ARS } from '../../shared/utils/format';
import { cn } from '../../shared/utils/cn';
import { CartItemCard } from './components/CartItemCard';
import { PaymentSelector } from './components/PaymentSelector';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X,
  Clock, Printer, Tag, Package, AlertTriangle, PackageX,
  User, Star, Percent, DollarSign, History, Lock,
  CreditCard, CircleDollarSign,
} from 'lucide-react';

interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  size: string;
  color: string;
  sizeId: string;
  colorId: string;
  price: number;
  qty: number;
  maxQty: number;
  category: string | null;
}

interface RecentSale {
  id: string;
  date: string;
  total: number;
  itemCount: number;
  customer: string;
  paymentMethod: string;
}

interface PaymentEntry {
  method_id: string;
  amount: number;
}

const STOCK_THRESHOLDS = { low: 5, critical: 2 } as const;

const HOLD_KEY = 'pos_held_cart';
const RECENT_KEY = 'pos_recent_sales';

function getStockColor(qty: number) {
  if (qty <= STOCK_THRESHOLDS.critical) return { bg: 'bg-danger/10 dark:bg-danger/20', text: 'text-danger', ring: 'ring-danger/30' };
  if (qty <= STOCK_THRESHOLDS.low) return { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-300/30' };
  return { bg: 'bg-success/10 dark:bg-success/20', text: 'text-success', ring: 'ring-success/30' };
}

function getCategoryGradient(category: string | null) {
  const c = (category || '').toLowerCase();
  if (c.includes('remera')) return 'from-brand-400 to-brand-600';
  if (c.includes('buzo')) return 'from-indigo-400 to-indigo-600';
  if (c.includes('pantalon')) return 'from-emerald-400 to-emerald-600';
  if (c.includes('campera')) return 'from-amber-400 to-amber-600';
  if (c.includes('accesorio')) return 'from-pink-400 to-pink-600';
  return 'from-slate-400 to-slate-600';
}

function loadHeldCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(HOLD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHeldCart(cart: CartItem[]) {
  localStorage.setItem(HOLD_KEY, JSON.stringify(cart));
}

function loadRecentSales(): RecentSale[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentSale(sale: RecentSale) {
  const sales = loadRecentSales();
  const updated = [sale, ...sales].slice(0, 10);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

export const POSDashboard = () => {
  const { products, inventory, customers, paymentMethods, fetchAllCatalogs, processSale, isLoading } = useCatalogStore();
  const { addMovement } = useCrmStore();

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' | 'warning' }[]>([]);

  useEffect(() => {
    fetchAllCatalogs();
    setCart(loadHeldCart());
    setRecentSales(loadRecentSales());
  }, [fetchAllCatalogs]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPaymentMethod]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isInput) {
          (e.target as HTMLElement).blur();
        }
        setSearchTerm('');
        setShowCustomerDropdown(false);
        setShowRecentSales(false);
        return;
      }

      if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
        return;
      }

      if (!isInput && cart.length > 0) {
        const lastItem = cart[cart.length - 1];
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          updateCartQty(lastItem.variantId, 1);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          updateCartQty(lastItem.variantId, -1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const remainingBalance = useMemo(() => Math.max(0, grandTotal - totalPaid), [grandTotal, totalPaid]);
  const isFullyPaid = remainingBalance <= 0.01;

  const addPayment = useCallback(() => {
    if (!selectedPaymentMethod || grandTotal <= 0) return;
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (!method) return;
    const amount = Math.min(remainingBalance, grandTotal);
    if (amount <= 0) return;
    setPayments(prev => [...prev, { method_id: selectedPaymentMethod, amount }]);
  }, [selectedPaymentMethod, grandTotal, remainingBalance, paymentMethods]);

  const removePayment = useCallback((index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updatePaymentAmount = useCallback((index: number, amount: number) => {
    setPayments(prev => prev.map((p, i) => i === index ? { ...p, amount: Math.max(0, amount) } : p));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const selectedCustomerData = useMemo(
    () => customers.find(c => c.id === selectedCustomer) || null,
    [customers, selectedCustomer]
  );

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]],
    [products]
  );

  const availableVariants = useMemo(() => {
    const safeSearch = searchTerm.trim().toLowerCase();
    return inventory
      .filter(v => (v.finished_quantity || 0) > 0)
      .map(v => {
        const prod = products.find(p => p.id === v.product_id);
        return {
          variantId: v.id,
          productId: v.product_id || '',
          name: prod?.name || 'Producto Desconocido',
          sku: prod?.sku || 'S/N',
          price: prod?.price || 0,
          category: prod?.category || null,
          size: v.sizes?.name || 'ÚNICO',
          color: v.colors?.name || 'ÚNICO',
          sizeId: v.size_id || '',
          colorId: v.color_id || '',
          finished_qty: v.finished_quantity || 0,
        };
      })
      .filter(v => {
        if (selectedCategory !== 'Todos' && v.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
        if (!safeSearch) return true;
        return v.name?.toLowerCase().includes(safeSearch) || v.sku?.toLowerCase().includes(safeSearch) || v.size?.toLowerCase().includes(safeSearch) || v.color?.toLowerCase().includes(safeSearch);
      });
  }, [inventory, products, searchTerm, selectedCategory]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const discount = useMemo(() => {
    if (discountType === 'percent') return cartTotal * (discountValue / 100);
    if (discountType === 'fixed') return Math.min(discountValue, cartTotal);
    return 0;
  }, [cartTotal, discountType, discountValue]);
  const subtotal = cartTotal - discount;
  const iva = subtotal * 0.21;
  const grandTotal = subtotal + iva;

  const updateCartQty = useCallback((variantId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.variantId !== variantId) return item;
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > item.maxQty) {
          addToast('Stock máximo alcanzado', 'warning');
          return item;
        }
        return { ...item, qty: newQty };
      }).filter(Boolean) as CartItem[];
      saveHeldCart(updated);
      return updated;
    });
  }, [addToast]);

  const removeFromCart = useCallback((variantId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.variantId !== variantId);
      saveHeldCart(updated);
      return updated;
    });
    addToast('Artículo eliminado', 'warning');
  }, [addToast]);

  const addToCart = useCallback((variant: typeof availableVariants[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.variantId === variant.variantId);
      let updated: CartItem[];
      if (existing) {
        if (existing.qty >= variant.finished_qty) {
          addToast('Stock máximo alcanzado', 'warning');
          return prev;
        }
        updated = prev.map(item =>
          item.variantId === variant.variantId
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      } else {
        updated = [...prev, {
          variantId: variant.variantId,
          productId: variant.productId,
          name: variant.name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          sizeId: variant.sizeId,
          colorId: variant.colorId,
          price: variant.price,
          qty: 1,
          maxQty: variant.finished_qty,
          category: variant.category,
        }];
      }
      saveHeldCart(updated);
      addToast(`${variant.name} agregado al carrito`, 'success');
      return updated;
    });
  }, [addToast]);

  const clearCart = useCallback(() => {
    setCart([]);
    saveHeldCart([]);
    setDiscountType('none');
    setDiscountValue(0);
    setPayments([]);
    addToast('Carrito limpiado', 'warning');
  }, [addToast]);

  const holdSale = useCallback(() => {
    saveHeldCart(cart);
    addToast('Venta guardada para continuar después', 'success');
  }, [cart, addToast]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      addToast('El carrito está vacío', 'warning');
      return;
    }

    const hasCtaCtePayment = payments.some(p => {
      const m = paymentMethods.find(pm => pm.id === p.method_id);
      return m && (m.name.toLowerCase().includes('cuenta') || m.name.toLowerCase().includes('ctacte') || m.name.toLowerCase().includes('corriente'));
    });

    if (hasCtaCtePayment && !selectedCustomer) {
      addToast('Seleccioná un cliente para cuenta corriente', 'warning');
      return;
    }

    if (payments.length === 0) {
      addToast('Agregá al menos un medio de pago', 'warning');
      return;
    }

    if (!isFullyPaid) {
      addToast(`Falta pagar ${ARS.format(remainingBalance)}`, 'warning');
      return;
    }

    const cliente = customers.find(c => c.id === selectedCustomer);
    const methodNames = payments.map(p => {
      const m = paymentMethods.find(pm => pm.id === p.method_id);
      return m?.name || p.method_id;
    });
    const methodSummary = methodNames.length === 1 ? methodNames[0] : methodNames.join(' + ');

    const { default: Swal } = await import('sweetalert2');
    const result = await Swal.fire({
      title: `¿Confirmar venta?`,
      html: `<b>${cart.length} artículos</b> por <b>${ARS.format(grandTotal)}</b>${cliente ? ` para <b>${cliente.name}</b>` : ''}<br/><small class="text-slate-500">${methodSummary}</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, registrar',
    });

    if (!result.isConfirmed) return;

    setIsProcessing(true);
    try {
      await processSale(selectedCustomer || null, cart, grandTotal, payments);

      const hasCtaCte = payments.some(p => {
        const m = paymentMethods.find(pm => pm.id === p.method_id);
        return m && (m.name.toLowerCase().includes('cuenta') || m.name.toLowerCase().includes('ctacte') || m.name.toLowerCase().includes('corriente'));
      });
      if (hasCtaCte && selectedCustomer) {
        const ctaCteAmount = payments.reduce((sum, p) => {
          const m = paymentMethods.find(pm => pm.id === p.method_id);
          if (m && (m.name.toLowerCase().includes('cuenta') || m.name.toLowerCase().includes('ctacte') || m.name.toLowerCase().includes('corriente'))) {
            return sum + p.amount;
          }
          return sum;
        }, 0);
        const success = await addMovement({
          customer_id: selectedCustomer,
          movement_type: 'CARGO',
          amount: ctaCteAmount,
          description: `Venta POS - ${cart.length} artículos`,
          date: new Date().toISOString(),
        });
        if (!success) throw new Error('Falló el registro en Cuenta Corriente.');
      }

      const sale: RecentSale = {
        id: crypto.randomUUID?.() || Date.now().toString(),
        date: new Date().toISOString(),
        total: grandTotal,
        itemCount: cartCount,
        customer: cliente?.name || 'Consumidor Final',
        paymentMethod: methodSummary,
      };
      saveRecentSale(sale);
      setRecentSales(prev => [sale, ...prev].slice(0, 10));

      setCart([]);
      saveHeldCart([]);
      setSelectedCustomer('');
      setCustomerSearch('');
      setDiscountType('none');
      setDiscountValue(0);
      setPayments([]);
      setSelectedPaymentMethod(paymentMethods[0]?.id || '');
      addToast('¡Venta registrada exitosamente!', 'success');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al procesar la venta';
      addToast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = () => {
    const printContent = `
      <html><head><title>Comprobante POS</title>
      <style>
        body { font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px; }
        h2 { text-align: center; font-size: 16px; margin-bottom: 5px; }
        p { text-align: center; font-size: 10px; color: #666; margin: 0 0 15px; }
        .divider { border-top: 1px dashed #333; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
        .item-detail { font-size: 10px; color: #666; }
        .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 10px; }
        .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; }
      </style></head><body>
      <h2>EPR RAÍCES</h2><p>Comprobante de Venta</p><p>${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}</p>
      <div class="divider"></div>
      ${cart.map(i => `<div class="item"><span>${i.name} (${i.size}/${i.color}) x${i.qty}</span><span>${ARS.format(i.price * i.qty)}</span></div>`).join('')}
      <div class="divider"></div>
      ${discount > 0 ? `<div class="item"><span>Descuento:</span><span>-${ARS.format(discount)}</span></div>` : ''}
      <div class="item"><span>Subtotal:</span><span>${ARS.format(subtotal)}</span></div>
      <div class="item"><span>IVA (21%):</span><span>${ARS.format(iva)}</span></div>
      <div class="total">TOTAL: ${ARS.format(grandTotal)}</div>
      <div class="divider"></div>
      ${payments.map(p => {
        const m = paymentMethods.find(pm => pm.id === p.method_id);
        return `<div class="item"><span>${m?.name || p.method_id}:</span><span>${ARS.format(p.amount)}</span></div>`;
      }).join('')}
      ${payments.length === 0 ? `<div class="item"><span>Medio de pago:</span><span>Sin definir</span></div>` : ''}
      ${selectedCustomerData ? `<div class="item"><span>Cliente:</span><span>${selectedCustomerData.name}</span></div>` : ''}
      <div class="footer">¡Gracias por tu compra!<br/>EPR Raíces - Moda Consciente</div>
      </body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
  };

  return (
    <div className="h-auto lg:h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4 animate-in fade-in duration-500">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'px-4 py-3 rounded-xl text-sm font-bold shadow-xl animate-in slide-in-from-right duration-300',
              t.type === 'success' && 'bg-success text-white',
              t.type === 'error' && 'bg-danger text-white',
              t.type === 'warning' && 'bg-amber-500 text-white',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* ===== PANEL 1: PRODUCTS ===== */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-w-0">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-5 h-5 text-brand" />
              Mercadería
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRecentSales(!showRecentSales)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Ventas recientes"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={holdSale}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 transition-colors"
                title="Guardar venta"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nombre, SKU, talle o color... (F2)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95',
                  selectedCategory === cat
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Sales Panel */}
        {showRecentSales && (
          <div className="border-b border-slate-100 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Últimas ventas
              </h3>
              <button onClick={() => setShowRecentSales(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {recentSales.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No hay ventas recientes</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {recentSales.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-100 dark:border-slate-700">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-white">{ARS.format(s.total)}</span>
                      <span className="text-slate-400 ml-2">{s.customer}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">{new Date(s.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse">
                  <div className="h-24 bg-slate-200 dark:bg-slate-700" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : availableVariants.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <PackageX className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-sm mb-1">
                Sin resultados
              </p>
              <p className="text-xs text-slate-400">
                No hay stock terminado o coincidencia de búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {availableVariants.map(v => {
                const stock = getStockColor(v.finished_qty);
                const inCart = cart.find(c => c.variantId === v.variantId);
                const atMax = inCart && inCart.qty >= v.finished_qty;
                return (
                  <div
                    key={v.variantId}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:border-brand dark:hover:border-brand hover:shadow-lg transition-all group active:scale-[0.98]"
                  >
                    {/* Color gradient header */}
                    <div className={cn('h-20 bg-gradient-to-br flex items-center justify-center relative', getCategoryGradient(v.category))}>
                      <Package className="w-8 h-8 text-white/60" />
                      <div className={cn('absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5', stock.bg, stock.text)}>
                        {v.finished_qty <= STOCK_THRESHOLDS.critical && <AlertTriangle className="w-2.5 h-2.5" />}
                        {v.finished_qty} Disp.
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">{v.sku}</span>
                        <span className="text-[8px] font-bold text-slate-400">{v.category}</span>
                      </div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-tight mb-1.5">
                        {v.name}
                      </h3>
                      <div className="flex gap-1 mb-2">
                        <span className="text-[8px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">{v.size}</span>
                        <span className="text-[8px] font-bold text-white bg-brand/80 px-1.5 py-0.5 rounded uppercase">{v.color}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                          {ARS.format(v.price)}
                        </span>
                        {v.finished_qty > STOCK_THRESHOLDS.critical && (
                          <div className="flex items-center gap-1">
                            {inCart && (
                              <button
                                onClick={() => updateCartQty(v.variantId, -1)}
                                className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-danger/20 hover:text-danger transition-colors active:scale-90"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                            {inCart && (
                              <span className="text-xs font-black text-brand min-w-[1.25rem] text-center">{inCart.qty}</span>
                            )}
                            <button
                              onClick={() => !atMax && addToCart(v)}
                              disabled={!!atMax}
                              className={cn(
                                'w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90',
                                atMax
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed'
                                  : 'bg-brand text-white hover:bg-brand-700 shadow-md shadow-brand/20'
                              )}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== PANEL 2: CART ===== */}
      <div className="flex flex-col lg:w-[420px] lg:flex-shrink-0">
        <div className="flex flex-col h-full lg:h-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-brand flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Comanda
                {cartCount > 0 && (
                  <span className="px-2 py-0.5 bg-brand text-white text-[9px] rounded-full">{cartCount}</span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[9px] font-bold text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors uppercase"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Customer Selector */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest">Cliente</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={customerSearch}
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all"
              />
              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(''); setCustomerSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-danger"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {showCustomerDropdown && filteredCustomers.length > 0 && !selectedCustomer && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c.id);
                        setCustomerSearch(c.name);
                        setShowCustomerDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                    >
                      <span className="font-bold text-slate-800 dark:text-white">{c.name}</span>
                      {c.company && <span className="text-slate-400 ml-1">({c.company})</span>}
                      {c.loyalty_points != null && c.loyalty_points > 0 && (
                        <span className="ml-1 text-amber-500"><Star className="w-2.5 h-2.5 inline" /> {c.loyalty_points}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Quick-sale indicator */}
            {!selectedCustomer && payments.every(p => {
              const m = paymentMethods.find(pm => pm.id === p.method_id);
              return !(m && (m.name.toLowerCase().includes('cuenta') || m.name.toLowerCase().includes('ctacte') || m.name.toLowerCase().includes('corriente')));
            }) && (
              <p className="text-[9px] text-success font-medium mt-1.5 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Venta rápida (sin cliente asignado)
              </p>
            )}
            {selectedCustomerData?.loyalty_points != null && selectedCustomerData.loyalty_points > 0 && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                <Star className="w-3 h-3" /> {selectedCustomerData.loyalty_points} puntos de fidelidad
              </p>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Carrito vacío</p>
                <p className="text-[10px] text-slate-400">Agregá prendas desde el catálogo</p>
              </div>
            ) : (
              cart.map(item => (
                <CartItemCard
                  key={item.variantId}
                  item={item}
                  onRemove={removeFromCart}
                  onUpdateQty={updateCartQty}
                />
              ))
            )}
          </div>

          {/* Payment & Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Discount */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Descuento
                </label>
                <div className="flex-1" />
                <button
                  onClick={() => setDiscountType(prev => {
                    if (prev === 'none') return 'percent';
                    if (prev === 'percent') return 'fixed';
                    return 'none';
                  })}
                  className={cn(
                    'text-[8px] font-black px-2 py-0.5 rounded transition-all uppercase',
                    discountType === 'none'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      : 'bg-brand/10 text-brand'
                  )}
                >
                  {discountType === 'none' ? 'Ninguno' : discountType === 'percent' ? '% Porcentaje' : '$ Monto fijo'}
                </button>
              </div>
              {discountType !== 'none' && (
                <div className="relative">
                  {discountType === 'percent' ? (
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  ) : (
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  )}
                  <input
                    type="number"
                    min={0}
                    max={discountType === 'percent' ? 100 : cartTotal}
                    value={discountValue}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-brand transition-all"
                    placeholder={discountType === 'percent' ? '0-100' : 'Monto'}
                  />
                </div>
              )}
            </div>

            {/* Payment Method */}
            <PaymentSelector methods={paymentMethods} value={selectedPaymentMethod} onChange={setSelectedPaymentMethod} />

            {/* Add payment button */}
            {grandTotal > 0 && selectedPaymentMethod && remainingBalance > 0.01 && (
              <button
                onClick={addPayment}
                className="w-full py-2 rounded-xl border-2 border-dashed border-brand/30 text-brand text-[10px] font-black uppercase tracking-wider hover:bg-brand/5 hover:border-brand/50 transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3 h-3" /> Agregar pago
              </button>
            )}

            {/* Split payments list */}
            {payments.length > 0 && (
              <div className="space-y-1.5">
                {payments.map((p, i) => {
                  const m = paymentMethods.find(pm => pm.id === p.method_id);
                  return (
                    <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-950 rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-700">
                      <CreditCard className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase flex-shrink-0">{m?.name || '?'}</span>
                      <div className="flex-1" />
                      <input
                        type="number"
                        min={0}
                        max={remainingBalance + p.amount}
                        value={p.amount}
                        onChange={e => updatePaymentAmount(i, Number(e.target.value))}
                        className="w-24 text-right text-[11px] font-bold text-slate-900 dark:text-white bg-transparent outline-none tabular-nums"
                      />
                      <button
                        onClick={() => removePayment(i)}
                        className="p-1 text-slate-400 hover:text-danger transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                {remainingBalance > 0.01 && (
                  <div className="flex items-center justify-between text-[10px] font-bold px-1">
                    <span className="text-slate-400 uppercase tracking-wider">Restante</span>
                    <span className="text-amber-600 dark:text-amber-400 tabular-nums">{ARS.format(remainingBalance)}</span>
                  </div>
                )}
                {isFullyPaid && (
                  <div className="flex items-center justify-center text-[10px] font-black text-success gap-1 py-1">
                    <CircleDollarSign className="w-3 h-3" /> Pago completo
                  </div>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold tabular-nums">{ARS.format(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-danger font-medium">
                  <span>Descuento</span>
                  <span className="tabular-nums">-{ARS.format(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span className="font-medium">IVA (21%)</span>
                <span className="font-bold tabular-nums">{ARS.format(iva)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-black uppercase tracking-wider text-slate-900 dark:text-white">Total</span>
                <span className="font-black text-lg text-success dark:text-success-500 tabular-nums">{ARS.format(grandTotal)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={printReceipt}
                disabled={cart.length === 0}
                className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Imprimir"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
                className={cn(
                  'flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-[0.97]',
                  cart.length > 0 && !isProcessing
                    ? 'bg-success hover:bg-success-500 text-white shadow-lg shadow-success/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  'Confirmar Venta'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
