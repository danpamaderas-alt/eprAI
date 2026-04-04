import { useState, useEffect, useMemo } from 'react';
import { useInventoryStore } from '../treasury/store/useInventoryStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { type Customer } from '../../crm/store/useCrmStore';
import Swal from 'sweetalert2';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number | string;
  price: number | string;
}

interface CartItem {
  product: Product;
  quantity: number;
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
  const { products, fetchProducts, updateStock } = useInventoryStore();
  const { addTransaction } = useTreasuryStore();
  const { customers, fetchCustomers } = useCrmStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [businessUnit, setBusinessUnit] = useState('ROJO_SHOWROOM');
  const [paymentMethod, setPaymentMethod] = useState('MERCADO_PAGO');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lastSale, setLastSale] = useState<SaleTicket | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [fetchProducts, fetchCustomers]);

  // Filtro de productos (Usamos filteredProducts)
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const addToCart = (product: Product) => {
    const stockDisponible = Number(product.stock) || 0;
    if (stockDisponible <= 0) {
      Swal.fire({ icon: 'error', title: 'Sin Stock', text: 'No hay unidades.', timer: 1500, showConfirmButton: false });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= stockDisponible) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const { subtotal, totalItems } = useMemo(() => {
    const sum = cart.reduce((acc, item) => acc + (Number(item.product.price) * item.quantity), 0);
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    return { subtotal: sum, totalItems: count };
  }, [cart]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const processSale = async () => {
    if (cart.length === 0) return;

    const selectedCustomer = customers.find((c: Customer) => c.id === selectedCustomerId);
    const customerName = selectedCustomer ? selectedCustomer.name : 'Consumidor Final';

    const itemsDescription = cart.map(item => `${item.product.name} (x${item.quantity})`).join(', ');
    const concept = `VENTA: ${customerName} | ${itemsDescription}`.substring(0, 100);

    try {
      await addTransaction({
        type: 'INCOME',
        amount: subtotal,
        concept: concept,
        categoryId: 'VENTA',
        date: new Date().toISOString(),
                accountId: paymentMethod as 'MERCADO_PAGO' | 'EFECTIVO' | 'BANCO',
        businessUnit: businessUnit as 'GENERAL' | 'RAICES' | 'RJ_CO' | 'BITA_IT' | 'ROJO_SHOWROOM' | 'UNIFORMES',
             status: 'COMPLETED'
      });

      for (const item of cart) {
        const newStock = Number(item.product.stock) - item.quantity;
        await updateStock(item.product.id, newStock);
      }

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
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Venta Procesada', showConfirmButton: false, timer: 2000 });

    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Fallo al procesar la venta.' });
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
    <div className="animate-in fade-in duration-500">
      <div className="space-y-6 print:hidden">
        <header>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Punto de Venta</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Terminal de cobro rápida.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SECCIÓN CATÁLOGO */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar por Nombre o SKU..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:border-blue-500 transition-all font-medium" 
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {filteredProducts.map(product => (
                <button 
                  key={product.id} 
                  disabled={product.stock <= 0}
                  onClick={() => addToCart(product)}
                  className={`text-left bg-white p-4 rounded-2xl border-2 transition-all flex flex-col justify-between h-40 shadow-sm
                    ${product.stock <= 0 ? 'opacity-50 grayscale border-slate-100' : 'border-transparent hover:border-blue-500 hover:shadow-xl active:scale-95'}`}
                >
                  <div>
                    <div className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mb-2 uppercase">{product.sku}</div>
                    <h3 className="font-bold text-slate-800 leading-tight text-xs line-clamp-2">{product.name}</h3>
                  </div>
                  <div className="flex justify-between items-end mt-auto">
                    <span className="text-sm font-black text-slate-900">{formatCurrency(Number(product.price))}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${product.stock > 5 ? 'bg-slate-100' : 'bg-rose-100 text-rose-600'}`}>
                      {product.stock} un.
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN CARRITO */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col h-[calc(100vh-160px)] sticky top-6 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-slate-900 uppercase tracking-widest text-xs italic">Detalle</h2>
                <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black">{totalItems} ITEMS</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 italic text-xs uppercase tracking-widest">Carrito Vacío</div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">{formatCurrency(Number(item.product.price))} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <p className="font-black text-slate-900 text-xs">{formatCurrency(Number(item.product.price) * item.quantity)}</p>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-rose-500 transition-colors">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-slate-100 space-y-5 bg-slate-50/50">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">Cliente (CRM)</label>
                <select 
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white font-bold outline-none appearance-none cursor-pointer"
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">👤 CONSUMIDOR FINAL</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company ? `- ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Negocio</label>
                  <select 
                    className="w-full text-[10px] p-2.5 rounded-xl border border-slate-200 bg-white font-bold outline-none" 
                    value={businessUnit} 
                    onChange={e => setBusinessUnit(e.target.value)}
                  >
                    <option value="ROJO_SHOWROOM">ROJO SHOWROOM</option>
                    <option value="RAICES">RAÍCES</option>
                    <option value="UNIFORMES">UNIFORMES</option>
                    <option value="RJ_CO">RJ&Co.</option>
                    <option value="BITA_IT">BITA IT</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Cobro</label>
                  <select 
                    className="w-full text-[10px] p-2.5 rounded-xl border border-slate-200 bg-white font-bold outline-none" 
                    value={paymentMethod} 
                    onChange={e => setPaymentMethod(e.target.value)}
                  >
                    <option value="MERCADO_PAGO">MERCADO PAGO</option>
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="BANCO">TRANSFERENCIA</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-end mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Final</p>
                  <p className="text-4xl font-black text-emerald-600 tabular-nums leading-none tracking-tighter">{formatCurrency(subtotal)}</p>
                </div>

                <button 
                  onClick={processSale}
                  disabled={cart.length === 0}
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all disabled:opacity-50 bg-slate-900 hover:bg-emerald-600 text-white shadow-xl active:scale-95"
                >
                  Confirmar y Cobrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE TICKET */}
      {lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white p-8 w-full max-w-sm rounded-3xl shadow-2xl mx-4 my-8 animate-in zoom-in-95 duration-200">
            <div className="text-center font-mono space-y-4 text-xs text-black">
              <header className="space-y-1 border-b border-dashed border-slate-200 pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter">{lastSale.businessUnit.replace('_', ' ')}</h2>
                <div className="pt-2">
                  <p className="font-bold">Ticket N°: {lastSale.ticketNumber}</p>
                  <p>{lastSale.date.toLocaleString('es-AR')}</p>
                </div>
              </header>

              <div className="bg-slate-50 p-3 rounded-xl text-left border border-slate-100">
                <p className="font-black text-sm">{lastSale.customerName}</p>
              </div>
              
              <div className="space-y-2 text-left pt-2">
                {lastSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate pr-4 italic">{item.quantity} × {item.product.name}</span>
                    <span className="font-bold tabular-nums">{formatCurrency(Number(item.product.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-slate-300 my-4"></div>
              
              <div className="flex justify-between text-xl font-black uppercase tracking-tighter bg-slate-900 text-white p-2 rounded-lg">
                <span>TOTAL</span>
                <span>{formatCurrency(lastSale.total)}</span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest transition-all">🖨️ Imprimir Ticket</button>
              <button onClick={sendWhatsApp} className="w-full py-4 bg-[#25D366] text-white font-black rounded-2xl text-[11px] uppercase tracking-widest transition-all">💬 WhatsApp</button>
              <button onClick={() => setLastSale(null)} className="w-full py-3 bg-slate-100 text-slate-500 font-bold rounded-2xl text-[11px] uppercase tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};