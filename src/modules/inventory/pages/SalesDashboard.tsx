import { useState, useMemo, useEffect } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useDebtStore } from '../../crm/store/useDebtStore';
import { Search, Trash2, User, X, CreditCard } from 'lucide-react';
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
  const { addDebt } = useDebtStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'MERCADO_PAGO' | 'BANCO' | 'CTA_CTE' | null>(null);

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
    if (!clientSearch || selectedCustomerId) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    ).slice(0, 5);
  }, [customers, clientSearch, selectedCustomerId]);

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
          <select id="swal-v" class="swal2-input w-full m-0 text-sm font-bold dark:bg-slate-800 dark:text-white">${optionsHtml}</select>
          <input id="swal-q" type="number" value="1" min="1" class="swal2-input w-full m-0 text-center font-black dark:bg-slate-800 dark:text-white">
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
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        price: product.price || 0,
        quantity: selection.q,
        size_id: sId,
        size_name: sName,
        color_id: cId,
        color_name: cName
      }]);
    }
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      Swal.fire('Atención', 'Debes seleccionar un método de pago.', 'warning');
      return;
    }

    // Validación crítica para Cuenta Corriente
    if (paymentMethod === 'CTA_CTE' && !selectedCustomerId) {
      Swal.fire('Error', 'Para vender a Cuenta Corriente debes seleccionar un cliente del CRM.', 'error');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Confirmar Venta?',
      text: `${paymentMethod === 'CTA_CTE' ? 'Se cargará una DEUDA de' : 'Total a cobrar:'} $${totals.total.toLocaleString('es-AR')}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981'
    });

    if (confirm.isConfirmed) {
      try {
        // 1. Actualizar Stock físico
        for (const item of cart) {
          await updateStock(item.product_id, item.size_id, item.color_id, -item.quantity);
        }

        const clienteObj = customers.find(c => c.id === selectedCustomerId);
        const conceptSummary = `Venta: ${cart.map(i => `${i.quantity}x ${i.name}`).join(', ')}`;

        // 2. Registrar la venta según el método elegido
        if (paymentMethod === 'CTA_CTE') {
          // Va directo a Deuda (CRM)
          await addDebt(selectedCustomerId!, totals.total, conceptSummary);
        } else {
          // Va a Tesorería
          await addTransaction({
            date: new Date().toISOString(),
            description: `VENTA: ${clienteObj?.name || 'Consumidor Final'} (${conceptSummary})`,
            category: 'VENTA_CATALOGO',
            type: 'INCOME',
            business_unit: 'RAICES', 
            payment_method: paymentMethod, 
            amount: totals.total,
            status: 'COMPLETED'
          });
        }

        Swal.fire('¡Venta Exitosa!', paymentMethod === 'CTA_CTE' ? 'La deuda ha sido cargada al cliente.' : 'La caja ha sido actualizada.', 'success');
        
        // Limpiamos todo el carrito para la próxima venta
        setCart([]);
        setSelectedCustomerId(null);
        setClientSearch('');
        setPaymentMethod(null);
        fetchAllCatalogs(); 
      } catch (err: any) {
        console.error("Error en checkout:", err);
        Swal.fire('Error', 'No se pudo procesar la venta: ' + (err.message || 'Error desconocido'), 'error');
      }
    }
  };

  return (
    <div className="flex h-screen gap-6 overflow-hidden bg-slate-50/20 p-4 animate-in fade-in duration-500">
      <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col items-start text-left"
            >
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.sku || 'SIN SKU'}</span>
              <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm mt-1 leading-tight h-10 overflow-hidden">{p.name}</h3>
              <p className="mt-4 text-xl font-black text-blue-600 dark:text-blue-400">$ {(p.price || 0).toLocaleString('es-AR')}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-[400px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl rounded-l-[40px] overflow-hidden">
        
        {/* SECTOR CLIENTE INTEGRADO */}
        <div className="p-6 space-y-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-2 dark:text-white">
            <User className="w-5 h-5 text-blue-600" /> CLIENTE
          </h2>
          <div className="relative">
            {selectedCustomerId ? (
              <div className="flex items-center justify-between bg-blue-600 p-4 rounded-2xl text-white animate-in zoom-in-95">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase opacity-70">Seleccionado</span>
                  <span className="text-xs font-black uppercase tracking-widest">
                    {customers.find(c => c.id === selectedCustomerId)?.name}
                  </span>
                </div>
                <X className="w-5 h-5 cursor-pointer hover:rotate-90 transition-transform" onClick={() => { setSelectedCustomerId(null); setClientSearch(''); }} />
              </div>
            ) : (
              <>
                <input 
                  type="text"
                  placeholder="Buscar cliente en el CRM..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none dark:text-white focus:border-blue-500"
                />
                {filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                    {filteredCustomers.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => { setSelectedCustomerId(c.id); setClientSearch(c.name); }}
                        className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-slate-50 dark:border-slate-700 last:border-0 dark:text-white transition-colors"
                      >
                        {c.name.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Carrito de Compras</h2>
          {cart.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center opacity-20">
               <span className="text-4xl">🛒</span>
               <p className="text-[10px] font-black uppercase mt-2">Vacío</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-in slide-in-from-right-4">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight">{item.name}</p>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase">T: {item.size_name}</span>
                  <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-500 px-2 py-0.5 rounded uppercase">{item.color_name}</span>
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
                <p className="font-black text-sm text-slate-900 dark:text-white">${(item.price * item.quantity).toLocaleString('es-AR')}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(['EFECTIVO', 'MERCADO_PAGO', 'BANCO', 'CTA_CTE'] as const).map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-3 rounded-xl text-[9px] font-black transition-all border flex items-center justify-center gap-2 ${paymentMethod === m ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                {m === 'CTA_CTE' && <CreditCard className="w-3 h-3" />}
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-widest">
              <span>Items: {totals.itemsCount}</span>
              <span>$ {totals.subtotal.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-slate-900 dark:text-white font-black text-2xl uppercase tracking-tighter">
              <span>Total</span>
              <span className="text-blue-600 dark:text-blue-400">$ {totals.total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-5 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95"
          >
            Finalizar Operación
          </button>
        </div>
      </div>
    </div>
  );
};