import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useCatalogStore, type Product, type ProductVariant } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useResellerStore } from '../../resellers/store/useResellerStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { supabase } from '../../../lib/supabase';
import { ARS } from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/cn';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import { RemitoModal } from '../../orders/components/RemitoModal';
import {
  Search, ShoppingCart, Package, Plus, Minus, Trash2, X,
  User, Star, Tag, AlertTriangle, PackageX, Printer,
  Banknote, ArrowRightLeft, BookOpen, Check, Percent,
  DollarSign, Store, Truck,
} from 'lucide-react';
import Swal from 'sweetalert2';

interface CartItem {
  id: string;
  product_id: string;
  variantId: string;
  name: string;
  sku: string;
  category: string | null;
  price: number;
  qty: number;
  maxQty: number;
  color_name: string;
  size_name: string;
  discountType: 'none' | 'percent' | 'fixed';
  discountValue: number;
}

type CustomerType = 'minorista' | 'mayorista' | 'revendedor';

const CATEGORIES = ['Todos', 'Remeras', 'Buzos', 'Pantalones', 'Camperas', 'Accesorios'] as const;

function getStockColor(qty: number) {
  if (qty <= 2) return { bg: 'bg-danger/10 dark:bg-danger/20', text: 'text-danger' };
  if (qty <= 5) return { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' };
  return { bg: 'bg-success/10 dark:bg-success/20', text: 'text-success' };
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

const SalesContent = memo(() => {
  const { products, inventory, fetchAllCatalogs } = useCatalogStore();
  const { balances, fetchBalances } = useCrmStore();
  const { resellers, fetchData: fetchResellers } = useResellerStore();
  const activeCompanyId = useTenantStore((s) => s.activeCompanyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemitoOpen, setIsRemitoOpen] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>('minorista');
  const [selectedResellerId, setSelectedResellerId] = useState<string | null>(null);
  const [globalDiscountType, setGlobalDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  useEffect(() => {
    fetchAllCatalogs();
    fetchBalances();
    fetchResellers();
  }, [fetchAllCatalogs, fetchBalances, fetchResellers]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
    const count = cart.reduce((a, i) => a + i.qty, 0);
    
    const itemDiscounts = cart.reduce((a, i) => {
      if (i.discountType === 'percent') {
        return a + (i.price * i.qty * i.discountValue) / 100;
      }
      if (i.discountType === 'fixed') {
        return a + i.discountValue * i.qty;
      }
      return a;
    }, 0);
    
    let globalDiscount = 0;
    if (globalDiscountType === 'percent') {
      globalDiscount = (subtotal - itemDiscounts) * globalDiscountValue / 100;
    } else if (globalDiscountType === 'fixed') {
      globalDiscount = globalDiscountValue;
    }
    
    const totalDiscount = itemDiscounts + globalDiscount;
    const afterDiscounts = Math.max(0, subtotal - totalDiscount);
    
    return { subtotal, count, itemDiscounts, globalDiscount, totalDiscount, afterDiscounts };
  }, [cart, globalDiscountType, globalDiscountValue]);

  const iva = useMemo(() => totals.afterDiscounts * 0.21, [totals.afterDiscounts]);
  const grandTotal = useMemo(() => totals.afterDiscounts + iva, [totals.afterDiscounts, iva]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch = !search || p.name?.toLowerCase().includes(search) || p.sku?.toLowerCase().includes(search);
      const matchCat = selectedCategory === 'Todos' || (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase().slice(0, -1));
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return balances.slice(0, 8);
    return balances.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 8);
  }, [balances, customerSearch]);

  const filteredResellers = useMemo(() => {
    if (!customerSearch) return resellers.slice(0, 8);
    return resellers.filter((r) => r.name.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 8);
  }, [resellers, customerSearch]);

  const selectedCustomerData = useMemo(
    () => balances.find((c) => c.id === selectedCustomerId),
    [balances, selectedCustomerId],
  );

  const getProductStock = useCallback(
    (productId: string) => {
      return inventory
        .filter((v) => v.product_id === productId && (v.finished_quantity || 0) > 0)
        .reduce((sum, v) => sum + (v.finished_quantity || 0), 0);
    },
    [inventory],
  );

  const getProductVariants = useCallback(
    (productId: string): ProductVariant[] => {
      return inventory.filter((v) => v.product_id === productId && (v.finished_quantity || 0) > 0);
    },
    [inventory],
  );

  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, qty: number) => {
      const existing = cart.find((c) => c.variantId === variant.id);
      if (existing) {
        setCart((prev) =>
          prev.map((c) =>
            c.variantId === variant.id ? { ...c, qty: Math.min(c.qty + qty, c.maxQty) } : c,
          ),
        );
      } else {
        setCart((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            product_id: product.id,
            variantId: variant.id,
            name: product.name,
            sku: product.sku || 'S/N',
            category: product.category ?? null,
            price: Number.parseFloat(String(product.price || 0)),
            qty,
            maxQty: variant.finished_quantity || 0,
            color_name: variant.colors?.name || 'S/C',
            size_name: variant.sizes?.name || 'S/T',
            discountType: 'none',
            discountValue: 0,
          },
        ]);
      }
      setExpandedProduct(null);
    },
    [cart],
  );

  const updateCartQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateItemDiscount = useCallback((id: string, discountType: 'none' | 'percent' | 'fixed', discountValue: number) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, discountType, discountValue } : c))
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const handleCheckout = async () => {
    if (!paymentMethod)
      return Swal.fire({ title: 'Atención', text: 'Elegí el medio de pago.', icon: 'warning' });
    if (paymentMethod === 'CTA_CTE' && !selectedCustomerId)
      return Swal.fire({ title: 'Error', text: 'Asigná un cliente para la deuda.', icon: 'error' });
    if (cart.length === 0) return;

    const discountInfo = totals.totalDiscount > 0
      ? `<br/><b>Descuentos:</b> <span style="color:#ef4444;">-${ARS.format(totals.totalDiscount)}</span>`
      : '';

    const confirm = await Swal.fire({
      title: '¿FINALIZAR VENTA?',
      html: `<div style="text-align:left;font-size:14px;">
        <b>Items:</b> ${totals.count} unidades<br/>
        <b>Subtotal:</b> ${ARS.format(totals.subtotal)}<br/>
        ${discountInfo}
        <b>IVA (21%):</b> ${ARS.format(iva)}<br/>
        <b>TOTAL:</b> <span style="color:#10b981;font-size:18px;">${ARS.format(grandTotal)}</span><br/>
        <b>Medio de pago:</b> ${paymentMethod.replace('_', ' ')}
        ${customerType === 'mayorista' ? '<br/><span style="color:#f59e0b;">⚡ PRECIO MAYORISTA</span>' : ''}
        ${customerType === 'revendedor' ? '<br/><span style="color:#8b5cf6;">🏷️ REVENDEDOR</span>' : ''}
        ${selectedCustomerData ? `<br/><b>Cliente:</b> ${selectedCustomerData.name}` : ''}
        ${selectedResellerId ? `<br/><b>Revendedor:</b> ${resellers.find(r => r.id === selectedResellerId)?.name || ''}` : ''}
      </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'SÍ, COBRAR',
    });

    if (!confirm.isConfirmed) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('process_pos_sale_atomic', {
        p_customer_id: selectedCustomerId || null,
        p_cart: cart as any,
        p_total: grandTotal,
        p_payment_method: paymentMethod,
        p_company_id: activeCompanyId,
      });
      if (error) throw error;

      Swal.fire({ title: 'VENTA EXITOSA', icon: 'success', timer: 2000, showConfirmButton: false });
      setCart([]);
      setSelectedCustomerId(null);
      setSelectedResellerId(null);
      setCustomerSearch('');
      setPaymentMethod('EFECTIVO');
      setCustomerType('minorista');
      setGlobalDiscountType('none');
      setGlobalDiscountValue(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire({ title: 'FALLO CRÍTICO', text: msg, icon: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-auto lg:h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4 animate-in fade-in duration-500">

      {/* ===== PANEL 1: PRODUCTS ===== */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-w-0">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-5 h-5 text-brand" />
              Terminal <span className="text-brand">POS</span>
            </h1>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors transition-transform active:scale-95',
                  selectedCategory === cat
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <PackageX className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-black text-slate-400 uppercase tracking-wider text-sm mb-1">Sin resultados</p>
              <p className="text-xs text-slate-400">No hay productos que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const stock = getProductStock(p.id);
                const stockColor = getStockColor(stock);
                const variants = getProductVariants(p.id);
                const isExpanded = expandedProduct === p.id;
                const inCartCount = cart.filter((c) => c.product_id === p.id).reduce((a, c) => a + c.qty, 0);

                return (
                  <div key={p.id} className="relative">
                    {/* Product Card */}
                    <div
                      className={cn(
                        'bg-slate-50 dark:bg-slate-900 border rounded-2xl overflow-hidden transition-colors group',
                        isExpanded
                          ? 'border-brand dark:border-brand shadow-lg ring-2 ring-brand/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-brand dark:hover:border-brand hover:shadow-lg',
                      )}
                    >
                      {/* Gradient Header */}
                      <div className={cn('h-20 bg-gradient-to-br flex items-center justify-center relative', getCategoryGradient(p.category ?? null))}>
                        <Package className="w-8 h-8 text-white/60" />
                        <div className={cn('absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5', stockColor.bg, stockColor.text)}>
                          {stock <= 2 && <AlertTriangle className="w-2.5 h-2.5" />}
                          {stock} Disp.
                        </div>
                        {inCartCount > 0 && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black bg-brand text-white">
                            {inCartCount} en carrito
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">{p.sku || 'S/N'}</span>
                          <span className="text-[8px] font-bold text-slate-400">{p.category || 'S/C'}</span>
                        </div>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-tight mb-1.5">{p.name}</h3>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                          <span className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
                            {ARS.format(Number.parseFloat(String(p.price || 0)))}
                          </span>
                          <button
                            onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                            className={cn(
                              'px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-colors transition-transform active:scale-90',
                              stock > 0
                                ? 'bg-brand text-white hover:bg-brand-700 shadow-md shadow-brand/20'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed',
                            )}
                            disabled={stock === 0}
                          >
                            {stock === 0 ? 'Sin Stock' : isExpanded ? 'Cerrar' : 'Agregar'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Variant Selection Panel */}
                    {isExpanded && variants.length > 0 && (
                      <div className="mt-2 bg-white dark:bg-slate-800 border border-brand dark:border-brand rounded-2xl p-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Seleccionar variante:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {variants.map((v) => {
                            const vStock = v.finished_quantity || 0;
                            const vStockColor = getStockColor(vStock);
                            return (
                              <div key={v.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700">
                                <div className="flex-1 min-w-0">
                                  <div className="flex gap-1.5">
                                    <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">{v.sizes?.name || 'S/T'}</span>
                                    <span className="text-[8px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">{v.colors?.name || 'S/C'}</span>
                                  </div>
                                  <p className={cn('text-[9px] font-bold mt-1', vStockColor.text)}>Stock: {vStock}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={1}
                                    max={vStock}
                                    defaultValue={1}
                                    id={`qty-${v.id}`}
                                    className="w-14 text-center text-xs font-black bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg py-1 focus:border-brand"
                                  />
                                  <button
                                    onClick={() => {
                                      const input = document.getElementById(`qty-${v.id}`) as HTMLInputElement;
                                      const qty = Math.min(Number(input.value) || 1, vStock);
                                      addToCart(p, v, qty);
                                    }}
                                    className="px-3 py-1.5 bg-brand text-white rounded-lg text-[9px] font-black uppercase hover:bg-brand-700 transition-colors transition-transform active:scale-90"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== PANEL 2: CART & PAYMENT ===== */}
      <div className="flex flex-col lg:w-[420px] lg:flex-shrink-0">
        <div className="flex flex-col h-full lg:h-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">

          {/* Customer Selector */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            {/* Customer Type Tabs */}
            <div className="flex gap-1 mb-3">
              {([
                { value: 'minorista' as CustomerType, label: 'Minorista', icon: User },
                { value: 'mayorista' as CustomerType, label: 'Mayorista', icon: Store },
                { value: 'revendedor' as CustomerType, label: 'Revendedor', icon: Truck },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setCustomerType(value);
                    setSelectedCustomerId(null);
                    setSelectedResellerId(null);
                    setCustomerSearch('');
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase transition-colors transition-transform active:scale-95',
                    customerType === value
                      ? value === 'mayorista'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : value === 'revendedor'
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-brand text-white shadow-lg shadow-brand/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Customer or Reseller Search */}
            {customerType === 'revendedor' ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar revendedor..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) setSelectedResellerId(null);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white focus:border-purple-500 transition-colors"
                />
                {selectedResellerId && (
                  <button
                    onClick={() => { setSelectedResellerId(null); setCustomerSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-danger"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {showCustomerDropdown && !selectedResellerId && filteredResellers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {filteredResellers.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedResellerId(r.id);
                          setCustomerSearch(r.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                      >
                        <span className="font-bold text-slate-800 dark:text-white">{r.name}</span>
                        <span className="text-slate-400 ml-1">{r.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) setSelectedCustomerId(null);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className={cn(
                    'w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white transition-colors',
                    customerType === 'mayorista' ? 'focus:border-amber-500' : 'focus:border-brand',
                  )}
                />
                {selectedCustomerId && (
                  <button
                    onClick={() => { setSelectedCustomerId(null); setCustomerSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-danger"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                {showCustomerDropdown && !selectedCustomerId && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch(c.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                      >
                        <span className="font-bold text-slate-800 dark:text-white">{c.name}</span>
                        {c.loyalty_points != null && c.loyalty_points > 0 && (
                          <span className="ml-1 text-amber-500"><Star className="w-2.5 h-2.5 inline" /> {c.loyalty_points}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Customer Info Badges */}
            {customerType === 'mayorista' && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                <Store className="w-3 h-3" /> Precios mayoristas activos
              </p>
            )}
            {customerType === 'revendedor' && selectedResellerId && (
              <p className="text-[9px] text-purple-600 dark:text-purple-400 font-medium mt-1.5 flex items-center gap-1">
                <Truck className="w-3 h-3" /> Revendedor asignado
              </p>
            )}
            {selectedCustomerData?.loyalty_points != null && selectedCustomerData.loyalty_points > 0 && (
              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                <Star className="w-3 h-3" /> {selectedCustomerData.loyalty_points} puntos de fidelidad
              </p>
            )}
          </div>

          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-brand flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Bolsa de Compras
                {totals.count > 0 && (
                  <span className="px-2 py-0.5 bg-brand text-white text-[9px] rounded-full">{totals.count}</span>
                )}
              </h2>
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

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 max-h-[300px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                  <ShoppingCart className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Carrito vacío</p>
                <p className="text-[9px] text-slate-400">Agregá productos desde el catálogo</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight">{item.name}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">{item.size_name}</span>
                        <span className="text-[8px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">{item.color_name}</span>
                        <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">{item.sku}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-slate-300 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-danger/20 hover:text-danger transition-colors transition-transform active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black text-brand min-w-[1.5rem] text-center tabular-nums">{item.qty}</span>
                      <button
                        onClick={() => item.qty < item.maxQty && updateCartQty(item.id, 1)}
                        disabled={item.qty >= item.maxQty}
                        className={cn(
                          'w-6 h-6 rounded-lg flex items-center justify-center transition-colors transition-transform active:scale-90',
                          item.qty >= item.maxQty
                            ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 cursor-not-allowed'
                            : 'bg-brand/10 text-brand hover:bg-brand hover:text-white',
                        )}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-medium">{item.qty} x {ARS.format(item.price)}</p>
                      {item.discountType !== 'none' && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                          -{item.discountType === 'percent' ? `${item.discountValue}%` : ARS.format(item.discountValue * item.qty)}
                        </p>
                      )}
                      <p className="font-black text-xs text-slate-900 dark:text-white tabular-nums">
                        {ARS.format(
                          item.discountType === 'percent'
                            ? item.price * item.qty * (1 - item.discountValue / 100)
                            : item.price * item.qty - item.discountValue * item.qty,
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Item Discount Controls */}
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <div className="flex gap-1 flex-1">
                      <button
                        onClick={() => updateItemDiscount(item.id, 'none', 0)}
                        className={cn(
                          'flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-colors',
                          item.discountType === 'none'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                        )}
                      >
                        Sin
                      </button>
                      <button
                        onClick={() => updateItemDiscount(item.id, 'percent', item.discountType === 'percent' ? item.discountValue : 10)}
                        className={cn(
                          'flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-colors flex items-center justify-center gap-0.5',
                          item.discountType === 'percent'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                        )}
                      >
                        <Percent className="w-2.5 h-2.5" />%
                      </button>
                      <button
                        onClick={() => updateItemDiscount(item.id, 'fixed', item.discountType === 'fixed' ? item.discountValue : 0)}
                        className={cn(
                          'flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-colors flex items-center justify-center gap-0.5',
                          item.discountType === 'fixed'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                        )}
                      >
                        <DollarSign className="w-2.5 h-2.5" />$
                      </button>
                    </div>
                    {item.discountType !== 'none' && (
                      <input
                        type="number"
                        min={0}
                        max={item.discountType === 'percent' ? 100 : item.price * item.qty}
                        value={item.discountValue}
                        onChange={(e) => updateItemDiscount(item.id, item.discountType, Number(e.target.value) || 0)}
                        className="w-14 text-center text-[9px] font-black bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700 rounded-lg py-1 focus:border-amber-500"
                      />
                    )}
                    {item.discountType !== 'none' && (
                      <span className="text-[8px] text-amber-600 dark:text-amber-400 font-bold">
                        {item.discountType === 'percent' ? `${item.discountValue}%` : ARS.format(item.discountValue)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment & Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Global Discount */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Descuento Global
              </label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setGlobalDiscountType('none')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-colors',
                    globalDiscountType === 'none'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  Sin descuento
                </button>
                <button
                  onClick={() => setGlobalDiscountType('percent')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-colors flex items-center justify-center gap-1',
                    globalDiscountType === 'percent'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  <Percent className="w-3 h-3" /> %
                </button>
                <button
                  onClick={() => setGlobalDiscountType('fixed')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-colors flex items-center justify-center gap-1',
                    globalDiscountType === 'fixed'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                  )}
                >
                  <DollarSign className="w-3 h-3" /> $
                </button>
              </div>
              {globalDiscountType !== 'none' && (
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="number"
                    min={0}
                    max={globalDiscountType === 'percent' ? 100 : totals.subtotal}
                    value={globalDiscountValue}
                    onChange={(e) => setGlobalDiscountValue(Number(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:border-amber-500 transition-colors"
                  />
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    {globalDiscountType === 'percent' ? '%' : 'ARS'}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Medio de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
                  { value: 'TRANSFERENCIA', label: 'Transfer.', icon: ArrowRightLeft },
                  { value: 'CTA_CTE', label: 'Cta. Cte.', icon: BookOpen },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPaymentMethod(value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors transition-transform active:scale-95',
                      paymentMethod === value
                        ? 'border-brand bg-brand/10 text-brand shadow-md shadow-brand/10'
                        : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600',
                    )}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {paymentMethod === value && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold tabular-nums">{ARS.format(totals.subtotal)}</span>
              </div>
              {totals.itemDiscounts > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span className="font-medium">Desc. Items</span>
                  <span className="font-bold tabular-nums">-{ARS.format(totals.itemDiscounts)}</span>
                </div>
              )}
              {totals.globalDiscount > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span className="font-medium">Desc. Global</span>
                  <span className="font-bold tabular-nums">-{ARS.format(totals.globalDiscount)}</span>
                </div>
              )}
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-danger font-bold">
                  <span>Total Descuentos</span>
                  <span className="tabular-nums">-{ARS.format(totals.totalDiscount)}</span>
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
                onClick={() => setIsRemitoOpen(true)}
                disabled={cart.length === 0}
                className="p-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Crear Remito"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
                className={cn(
                  'flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-colors transition-transform active:scale-[0.97]',
                  cart.length > 0 && !isProcessing
                    ? 'bg-success hover:bg-success-500 text-white shadow-lg shadow-success/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed',
                )}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  'Finalizar Venta'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <RemitoModal
        isOpen={isRemitoOpen}
        onClose={() => setIsRemitoOpen(false)}
        order={{
          id: 'POS-' + crypto.randomUUID().split('-')[0].toUpperCase(),
          customerName: selectedCustomerData?.name || 'Consumidor Final',
          status: 'DELIVERED',
          items: cart.map((item) => ({
            productName: item.name,
            variations: [
              {
                size: item.size_name,
                color: item.color_name,
                quantityOrdered: item.qty,
                quantityDelivered: item.qty,
              },
            ],
          })),
        }}
      />
    </div>
  );
});

SalesContent.displayName = 'SalesContent';

export const SalesDashboard = memo(() => (
  <ErrorBoundary>
    <SalesContent />
  </ErrorBoundary>
));

SalesDashboard.displayName = 'SalesDashboard';
