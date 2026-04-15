import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useCatalogStore, type Product, type Service } from "../../../store/useCatalogStore";
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useCrmStore, type Customer } from '../../crm/store/useCrmStore';
import { useLogisticsStore } from '../../logistics/store/useLogisticsStore';
import Swal from 'sweetalert2';

const ARS_FORMATTER = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const formatCurrency = (val: number): string => ARS_FORMATTER.format(val);

interface CartItem {
  cartItemId: string; 
  type: 'PRODUCT' | 'SERVICE';
  name: string;
  price: number;
  quantity: number;
  productId?: string;
  sizeId?: string;
  colorId?: string;
  variationLabel?: string;
  serviceId?: string;
}

interface SaleTicket {
  items: CartItem[];
  total: number;
  businessUnit: string;
  paymentMethod: string;
  customerName: string;
  date: Date;
  ticketNumber: string;
}

export const SalesDashboard = () => {
  const { products, inventory, services, fetchAllCatalogs, updateStock } = useCatalogStore();
  const { addTransaction } = useTreasuryStore();
  const { customers, fetchCustomers } = useCrmStore();
  const { addDelivery } = useLogisticsStore(); 
  
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'SERVICES'>('PRODUCTS');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [businessUnit, setBusinessUnit] = useState('ROJO_SHOWROOM');
  const [paymentMethod, setPaymentMethod] = useState('MERCADO_PAGO');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lastSale, setLastSale] = useState<SaleTicket | null>(null);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const [deliveryType, setDeliveryType] = useState<'LOCAL' | 'SHIPPING'>('LOCAL');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryZone, setDeliveryZone] = useState('BERISSO');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  useEffect(() => {
    fetchAllCatalogs();
    fetchCustomers();
  }, [fetchAllCatalogs, fetchCustomers]);

  useEffect(() => {
    if (selectedCustomerId) {
      const c = customers.find((x) => x.id === selectedCustomerId);
      if (c && c.phone) setDeliveryPhone(c.phone);
    } else {
      setDeliveryPhone('');
    }
  }, [selectedCustomerId, customers]);

  const filteredProducts = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase().trim();
    if (!term) return products;
    return products.filter(p => p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term)));
  }, [products, deferredSearchTerm]);

  const filteredServices = useMemo(() => {
    const term = deferredSearchTerm.toLowerCase().trim();
    if (!term) return services;
    return services.filter(s => s.name.toLowerCase().includes(term));
  }, [services, deferredSearchTerm]);

  const getProductTotalStock = (productId: string): number => {
    const variants = inventory.filter(v => v.product_id === productId);
    return variants.reduce((acc, v) => acc + (v.stock_quantity || 0), 0);
  };

  const handleServiceClick = async (service: Service) => {
    const { value: customPrice } = await Swal.fire({
      title: `Cobrar ${service.name}`,
      html: `
        <label class="text-xs font-black uppercase tracking-widest text-slate-500">Valor para este ticket ($)</label>
        <input id="custom-price" type="number" class="swal2-input text-center font-black text-2xl !mt-2" value="${service.price}">
      `,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-800 dark:text-white rounded-3xl', confirmButton: 'bg-emerald-600' },
      preConfirm: () => {
        const val = (document.getElementById('custom-price') as HTMLInputElement).value;
        if (!val || Number(val) < 0) { Swal.showValidationMessage('Ingresá un valor válido'); return false; }
        return Number(val);
      }
    });

    if (customPrice !== undefined) {
      setCart(prev => [...prev, {
        cartItemId: `srv-${service.id}-${Date.now()}`, 
        type: 'SERVICE',
        name: service.name,
        price: customPrice, 
        quantity: 1,
        serviceId: service.id
      }]);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado', showConfirmButton: false, timer: 1000 });
    }
  };

  const handleProductClick = (product: Product) => {
    const variants = inventory.filter(v => v.product_id === product.id);
    const totalStock = getProductTotalStock(product.id);

    if (totalStock <= 0) {
      Swal.fire({ icon: 'error', title: 'Sin Stock', text: 'No hay unidades en el galpón.', timer: 1500, showConfirmButton: false });
      return;
    }
    if (variants.length > 0) {
      setModalProduct(product);
    } else {
      addToCartProduct(product);
    }
  };

  const addToCartProduct = (product: Product, sizeId?: string, colorId?: string, variationLabel?: string, stockDisponibleParam?: number) => {
    let stockDisponible = stockDisponibleParam || 0;
    if (!sizeId && !colorId && !stockDisponibleParam) {
       stockDisponible = getProductTotalStock(product.id);
    }

    if (stockDisponible <= 0) {
      Swal.fire({ icon: 'error', title: 'Sin Stock', timer: 1500, showConfirmButton: false });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.type === 'PRODUCT' && item.productId === product.id && item.sizeId === sizeId && item.colorId === colorId);
      if (existing) {
        if (existing.quantity >= stockDisponible) {
          Swal.fire({ icon: 'warning', title: 'Límite', text: 'Stock máximo alcanzado.', timer: 1500, showConfirmButton: false });
          return prev;
        }
        return prev.map(item => item.cartItemId === existing.cartItemId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        cartItemId: `prod-${product.id}-${sizeId}-${colorId}`,
        type: 'PRODUCT',
        name: product.name,
        price: Number(product.price),
        quantity: 1,
        productId: product.id,
        sizeId,
        colorId,
        variationLabel
      }];
    });
    setModalProduct(null);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const { subtotal, totalItems } = useMemo(() => {
    let sum = 0; let count = 0;
    for (let i = 0; i < cart.length; i++) {
      sum += cart[i].price * cart[i].quantity;
      count += cart[i].quantity;
    }
    return { subtotal: sum, totalItems: count };
  }, [cart]);

  const processSale = async () => {
    if (cart.length === 0) return;

    if (deliveryType === 'SHIPPING' && !deliveryAddress.trim()) {
      Swal.fire({ icon: 'warning', title: 'Falta Dirección', text: 'Por favor, ingresá la dirección para el envío.' });
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
    const customerName = selectedCustomer ? selectedCustomer.name : 'Consumidor Final';
    const itemsDescription = cart.map(item => `${item.name} ${item.variationLabel ? `(${item.variationLabel})` : ''} (x${item.quantity})`).join(', ');

    try {
      const transactionPromise = addTransaction({
        type: 'INCOME',
        amount: subtotal,
        description: `VENTA: ${customerName} | ${itemsDescription}`.substring(0, 100),
        category: 'VENTA',
        date: new Date().toISOString(),
        businessUnit: businessUnit, 
        paymentMethod: paymentMethod, 
        status: 'COMPLETED'                  
      } as any);

      let deliveryPromise = Promise.resolve(); 
      if (deliveryType === 'SHIPPING') {
        deliveryPromise = addDelivery({
          customer_name: customerName,
          address: deliveryAddress,
          zone: deliveryZone,
          phone: deliveryPhone,
          items_description: itemsDescription,
          notes: `Generado desde Ventas (${businessUnit})`,
          status: 'PENDING',
          orderId: `SALE-${Date.now()}`,
          date: new Date().toISOString()
        } as any);
      }

      const stockUpdates = cart
        .filter(item => item.type === 'PRODUCT')
        .map(item => updateStock(item.productId!, item.sizeId || '', item.colorId || '', -item.quantity));

      await Promise.all([transactionPromise, deliveryPromise, ...stockUpdates]);

      setLastSale({
        items: [...cart],
        total: subtotal,
        businessUnit,
        paymentMethod,
        customerName,
        date: new Date(),
        ticketNumber: Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
      });

      setCart([]);
      setSelectedCustomerId('');
      setSearchTerm('');
      setDeliveryType('LOCAL');
      setDeliveryAddress('');
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Venta Procesada', showConfirmButton: false, timer: 2000 });

    } catch (err) {
      console.error('[Transaction Error] Falla en orquestación:', err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Problema al registrar la venta.' });
    }
  };

  const sendWhatsApp = () => {
    if (!lastSale) return;
    let text = `*COMPROBANTE DE COMPRA*\n*${lastSale.businessUnit.replace('_', ' ')}*\n\n`;
    text += `Cliente: ${lastSale.customerName}\n`;
    text += `*TOTAL: ${formatCurrency(lastSale.total)}*\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="animate-in fade-in duration-500 relative">
      <div className="space-y-6 print:hidden">
        <header>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">Punto de Venta</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Terminal rápida.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-full max-w-sm">
              <button 
                onClick={() => setActiveTab('PRODUCTS')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'PRODUCTS' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600'}`}
              >
                🛍️ Prendas
              </button>
              <button 
                onClick={() => setActiveTab('SERVICES')}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'SERVICES' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}
              >
                🛠️ Servicios
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">🔍</span>
              <input 
                type="text" 
                placeholder={activeTab === 'PRODUCTS' ? "Buscar prenda por Nombre o SKU..." : "Buscar servicio..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white rounded-2xl shadow-sm outline-none focus:border-blue-500 transition-all font-medium" 
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {activeTab === 'PRODUCTS' && filteredProducts.map(product => {
                const totalStock = getProductTotalStock(product.id);
                return (
                  <button 
                    key={product.id} 
                    disabled={totalStock <= 0}
                    onClick={() => handleProductClick(product)}
                    className={`text-left bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 transition-all flex flex-col justify-between h-40 shadow-sm focus:outline-none 
                      ${totalStock <= 0 ? 'opacity-50 grayscale border-slate-100 dark:border-slate-800 cursor-not-allowed' : 'border-transparent hover:border-blue-500 hover:shadow-xl active:scale-95'}`}
                  >
                    <div>
                      <div className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded inline-block mb-2 uppercase">{product.sku || 'N/A'}</div>
                      <h3 className="font-bold text-slate-800 dark:text-white leading-tight text-xs line-clamp-2">{product.name}</h3>
                    </div>
                    <div className="flex justify-between items-end mt-auto">
                      <span className="text-sm font-black text-slate-900 dark:text-slate-200">{formatCurrency(Number(product.price))}</span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${totalStock > 5 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {totalStock} un.
                      </span>
                    </div>
                  </button>
                )
              })}

              {activeTab === 'SERVICES' && filteredServices.map(service => (
                <button 
                  key={service.id} 
                  onClick={() => handleServiceClick(service)}
                  className="text-left bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border-2 border-emerald-100/50 dark:border-emerald-900/30 transition-all flex flex-col justify-between h-32 shadow-sm focus:outline-none hover:border-emerald-500 hover:shadow-xl active:scale-95"
                >
                  <div>
                    <div className="text-[9px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded inline-block mb-2 uppercase tracking-widest">Servicio</div>
                    <h3 className="font-bold text-emerald-950 dark:text-emerald-100 leading-tight text-xs line-clamp-2">{service.name}</h3>
                  </div>
                  <div className="mt-auto">
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(service.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col h-[calc(100vh-160px)] sticky top-6 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs italic">Detalle</h2>
                <span className="bg-slate-900 dark:bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{totalItems} ITEMS</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 italic text-xs uppercase tracking-widest">Carrito Vacío</div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartItemId} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                         <span className="text-xs">{item.type === 'SERVICE' ? '🛠️' : '📦'}</span>
                         <p className={`text-xs font-black uppercase leading-none ${item.type === 'SERVICE' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>{item.name}</p>
                      </div>
                      {item.variationLabel && <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 mt-1 ml-5">{item.variationLabel}</p>}
                      <p className="text-[10px] text-slate-400 font-bold mt-1 ml-5">{formatCurrency(item.price)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <p className="font-black text-slate-900 dark:text-white text-xs tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                      <button onClick={() => removeFromCart(item.cartItemId)} className="text-slate-300 hover:text-rose-500 transition-colors">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 space-y-5 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">Cliente (CRM)</label>
                <select className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold outline-none" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                  <option value="">👤 CONSUMIDOR FINAL</option>
                  {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Negocio</label>
                  <select className="w-full text-[10px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold" value={businessUnit} onChange={e => setBusinessUnit(e.target.value)}>
                    <option value="ROJO_SHOWROOM">ROJO SHOWROOM</option>
                    <option value="RAICES">RAÍCES</option>
                    <option value="UNIFORMES">UNIFORMES</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Cobro</label>
                  <select className="w-full text-[10px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white font-bold" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="MERCADO_PAGO">MERCADO PAGO</option>
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="BANCO">TRANSFERENCIA</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-end mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Final</p>
                  <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none tracking-tighter">{formatCurrency(subtotal)}</p>
                </div>

                <button 
                  onClick={processSale} disabled={cart.length === 0}
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 dark:bg-blue-600 hover:bg-emerald-600 text-white shadow-xl active:scale-95"
                >
                  Confirmar y Cobrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          {/* ... Modal Talles ... */}
        </div>
      )}
    </div>
  );
};