import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { Search, Trash2, User, X } from 'lucide-react';
import Swal from 'sweetalert2';

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  color_id: string;
  color_name: string;
  size_id: string;
  size_name: string;
}

export const SalesDashboard = () => {
  const { products, inventory, sizes, colors, fetchAllCatalogs, updateStock } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore();
  const { addTransaction } = useTreasuryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'MERCADO_PAGO' | 'BANCO' | null>(null);

  useEffect(() => {
    fetchAllCatalogs();
    fetchCustomers();
  }, [fetchAllCatalogs, fetchCustomers]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return {
      subtotal,
      taxes: 0,
      total: subtotal,
      itemsCount: cart.reduce((acc, item) => acc + item.quantity, 0)
    };
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!clientSearch) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    ).slice(0, 5);
  }, [customers, clientSearch]);

  const addToCart = async (product: Product) => {
    const availableVariants = inventory.filter(v => v.product_id === product.id && v.stock_quantity > 0);

    if (availableVariants.length === 0) {
      Swal.fire('Sin Stock', 'No hay unidades disponibles de este producto.', 'error');
      return;
    }

    const optionsHtml = availableVariants.map(v => {
      const sName = sizes.find(s => s.id === v.size_id)?.name || 'N/A';
      const cName = colors.find(c => c.id === v.color_id)?.name || 'N/A';
      return `<option value="${v.size_id}|${v.color_id}|${sName}|${cName}">Talle ${sName} - ${cName} (Stock: ${v.stock_quantity})</option>`;
    }).join('');

    const { value: selection } = await Swal.fire({
      title: 'Configurar Producto',
      html: `
        <div class="text-left space-y-4">
          <select id="swal-v" class="swal2-input w-full m-0 text-sm font-bold">${optionsHtml}</select>
          <input id="swal-q" type="number" value="1" min="1" class="swal2-input w-full m-0 text-center font-black">
        </div>
      `,
      showCancelButton: true,
      preConfirm: () => ({
        v: (document.getElementById('swal-v') as HTMLSelectElement).value,
        q: Number((document.getElementById('swal-q') as HTMLInputElement).value)
      })
    });

    if (selection) {
      const [sId, cId, sName, cName] = selection.v.split('|');
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        price: product.price || 0,
        quantity: selection.q,
        size_id: sId,
        size_name: sName,
        color_id: cId,
        color_name: cName
      };

      setCart(prev => [...prev, newItem]);
    }
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      Swal.fire('Atención', 'Debes seleccionar un método de pago.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Confirmar Venta?',
      text: `Total: $${totals.total.toLocaleString('es-AR')}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981'
    });

    if (confirm.isConfirmed) {
      try {
        for (const item of cart) {
          await updateStock(item.product_id, item.size_id, item.color_id, -item.quantity);
        }

        const clienteObj = customers.find(c => c.id === selectedCustomerId);
        await addTransaction({
          date: new Date().toISOString(),
          description: `VENTA: ${clienteObj?.name || 'Consumidor Final'}`,
          category: 'VENTA_CATALOGO',
          type: 'INCOME',
          businessUnit: 'RAICES',
          paymentMethod: paymentMethod,
          amount: totals.total,
          status: 'COMPLETED'
        });

        Swal.fire('¡Venta Exitosa!', 'El stock y la caja han sido actualizados.', 'success');
        setCart([]);
        setSelectedCustomerId(null);
        setClientSearch('');
        setPaymentMethod(null);
      } catch (err) {
        Swal.fire('Error', 'Hubo un problema al procesar la transacción.', 'error');
      }
    }
  };

  return (
    <div className="flex h-screen gap-6 overflow-hidden bg-slate-50/20 p-4">
      <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-100/50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="group bg-white/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col items-start text-left"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.sku}</span>
              <h3 className="font-black text-slate-800 uppercase text-sm mt-1 leading-tight h-10 overflow-hidden">{p.name}</h3>
              <p className="mt-4 text-xl font-black text-blue-600">$ {(p.price || 0).toLocaleString('es-AR')}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-[400px] flex flex-col bg-slate-50/80 backdrop-blur-xl border-l border-slate-200 shadow-2xl rounded-l-[40px]">
        <div className="p-6 space-y-4 border-b border-slate-200">
          <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" /> CLIENTE
          </h2>
          <div className="relative">
            <input 
              type="text"
              placeholder="Escribir para buscar cliente..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none"
            />
            {filteredCustomers.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                {filteredCustomers.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => { setSelectedCustomerId(c.id); setClientSearch(c.name); }}
                    className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-blue-50 border-b border-slate-50 last:border-0"
                  >
                    {c.name.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedCustomerId && (
            <div className="flex items-center justify-between bg-blue-600 p-3 rounded-xl text-white">
              <span className="text-[10px] font-black uppercase tracking-widest">
                {customers.find(c => c.id === selectedCustomerId)?.name}
              </span>
              <X className="w-4 h-4 cursor-pointer" onClick={() => { setSelectedCustomerId(null); setClientSearch(''); }} />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Carrito de Compras</h2>
          {cart.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 uppercase leading-tight">{item.name}</p>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">T: {item.size_name}</span>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded uppercase">{item.color_name}</span>
                </div>
                <p className="text-xs font-bold text-slate-400">{item.quantity} x ${item.price.toLocaleString('es-AR')}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button 
                  onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))}
                  className="text-rose-500 hover:scale-110 transition-transform"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <p className="font-black text-sm text-slate-900">${(item.price * item.quantity).toLocaleString('es-AR')}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white border-t border-slate-200 rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-3 gap-2 mb-6">
            {(['EFECTIVO', 'MERCADO_PAGO', 'BANCO'] as const).map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-3 rounded-xl text-[9px] font-black transition-all border ${paymentMethod === m ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase">
              <span>Subtotal</span>
              <span>$ {totals.subtotal.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-black text-xl uppercase tracking-tighter">
              <span>Total</span>
              <span className="text-blue-600">$ {totals.total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-4 bg-slate-900 hover:bg-black disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
          >
            Finalizar Venta
          </button>
        </div>
      </div>
    </div>
  );
};