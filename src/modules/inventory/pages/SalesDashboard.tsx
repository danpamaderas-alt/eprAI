import { useState, useMemo, useEffect, memo } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useDebtStore } from '../../crm/store/useDebtStore';
import { supabase } from '../../../lib/supabase'; // 🚀 AGREGAMOS SUPABASE PARA CREAR EL TICKET
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

// 🚀 OPTIMIZACIÓN 1: MEMOIZACIÓN DEL PRODUCTO
const ProductCard = memo(({ product, onAdd }: { product: Product, onAdd: (p: Product) => void }) => (
  <button 
    onClick={() => onAdd(product)}
    className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] flex flex-col items-start text-left"
  >
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.sku || 'SIN SKU'}</span>
    <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm mt-1 leading-tight h-10 overflow-hidden">{product.name}</h3>
    <p className="mt-4 text-xl font-black text-blue-600 dark:text-blue-400">$ {(product.price || 0).toLocaleString('es-AR')}</p>
  </button>
));

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
    return { subtotal, taxes: 0, total: subtotal, itemsCount: cart.reduce((acc, item) => acc + item.quantity, 0) };
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!clientSearch || selectedCustomerId) return [];
    return customers.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 5);
  }, [customers, clientSearch, selectedCustomerId]);

  const addToCart = async (product: Product) => {
    const availableVariants = inventory.filter(v => v.product_id === product.id && v.stock_quantity > 0);

    if (availableVariants.length === 0) {
      Swal.fire({ title: 'Sin Stock', text: 'No hay unidades disponibles de este producto.', icon: 'warning', animation: false });
      return;
    }

    const varBtns = availableVariants.map(v => `
      <button type="button" class="swal-var-btn m-1 p-3 rounded-xl border border-slate-700 bg-slate-800 text-left hover:bg-slate-700 transition-colors flex flex-col min-w-[120px]" data-id="${v.id}" data-max="${v.stock_quantity}" data-s="${v.sizes?.name}" data-c="${v.colors?.name}">
        <span class="text-xs font-bold text-white uppercase">${v.sizes?.name} | ${v.colors?.name}</span>
        <span class="text-[10px] font-black text-emerald-400 mt-1">Hay: ${v.stock_quantity} un.</span>
      </button>
    `).join('');

    const { value: res } = await Swal.fire({
      title: 'AGREGAR AL PEDIDO',
      width: '700px',
      animation: false,
      html: `
        <style>
          .var-selected { background-color: #1e293b !important; border-color: #3b82f6 !important; box-shadow: 0 0 0 2px #3b82f6; }
        </style>
        <div class="text-left space-y-6 max-h-[60vh] overflow-y-auto p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">1. Variantes en Stock</label>
            <div class="flex flex-wrap" id="var-grid">${varBtns}</div>
            <input type="hidden" id="sw-v"><input type="hidden" id="sw-s"><input type="hidden" id="sw-c"><input type="hidden" id="sw-max">
          </div>
          <div class="pt-4 border-t border-slate-800">
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">2. Cantidad a Vender</label>
            <input id="sw-q" type="number" class="swal2-input !w-full !m-0 !rounded-xl !text-center !font-black !text-3xl dark:bg-slate-800 dark:text-white" placeholder="Elegí variante arriba" disabled>
          </div>
        </div>`,
      didOpen: () => {
        const vg = document.getElementById('var-grid');
        const qi = document.getElementById('sw-q') as HTMLInputElement;
        vg?.addEventListener('click', e => {
          const btn = (e.target as HTMLElement).closest('button');
          if (btn) {
            Array.from(vg.children).forEach(b => b.classList.remove('var-selected'));
            btn.classList.add('var-selected');
            (document.getElementById('sw-v') as HTMLInputElement).value = btn.getAttribute('data-id') || '';
            (document.getElementById('sw-s') as HTMLInputElement).value = btn.getAttribute('data-s') || '';
            (document.getElementById('sw-c') as HTMLInputElement).value = btn.getAttribute('data-c') || '';
            const max = btn.getAttribute('data-max') || '0';
            (document.getElementById('sw-max') as HTMLInputElement).value = max;
            qi.disabled = false;
            qi.max = max;
            qi.placeholder = `Máximo: ${max}`;
            qi.focus();
          }
        });
      },
      showCancelButton: true, confirmButtonText: 'Sumar al Pedido',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl', confirmButton: 'bg-blue-600' },
      preConfirm: () => {
        const v = (document.getElementById('sw-v') as HTMLInputElement).value;
        const q = Number((document.getElementById('sw-q') as HTMLInputElement).value);
        const max = Number((document.getElementById('sw-max') as HTMLInputElement).value);
        
        if (!v) { Swal.showValidationMessage('Seleccioná una variante'); return false; }
        if (q <= 0) { Swal.showValidationMessage('La cantidad debe ser mayor a 0'); return false; }
        if (q > max) { Swal.showValidationMessage(`Solo podés vender ${max}.`); return false; }
        
        return { 
          size_id: (document.getElementById('sw-s') as HTMLInputElement).value, 
          color_id: (document.getElementById('sw-c') as HTMLInputElement).value, 
          size_name: (document.getElementById('sw-s') as HTMLInputElement).value, 
          color_name: (document.getElementById('sw-c') as HTMLInputElement).value, 
          quantity: q 
        };
      }
    });

    if (res) {
      setCart(prev => [...prev, {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        price: product.price || 0,
        quantity: res.quantity,
        size_id: res.size_id,
        size_name: res.size_name,
        color_id: res.color_id,
        color_name: res.color_name
      }]);
    }
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      Swal.fire({ title: 'Atención', text: 'Debes seleccionar un método de pago.', icon: 'warning', animation: false });
      return;
    }
    if (paymentMethod === 'CTA_CTE' && !selectedCustomerId) {
      Swal.fire({ title: 'Error', text: 'Para vender a Cuenta Corriente debes seleccionar un cliente del CRM.', icon: 'error', animation: false });
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Confirmar Venta?',
      text: `${paymentMethod === 'CTA_CTE' ? 'Se cargará un CARGO de' : 'Total a cobrar:'} $${totals.total.toLocaleString('es-AR')}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      animation: false
    });

    if (confirm.isConfirmed) {
      try {
        // 1. DESCONTAMOS EL STOCK FÍSICO
        for (const item of cart) {
          // Acá usamos tu función updateStock pero ojo, la cantidad va en negativo porque restamos
          await updateStock(item.product_id, item.size_id, item.color_id, -item.quantity);
        }

        const clienteObj = customers.find(c => c.id === selectedCustomerId);
        const itemsText = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
        const conceptSummary = `Venta POS: ${itemsText}`.substring(0, 150);

        // 2. CREAMOS EL TICKET PARA EL HISTORIAL DE VENTAS
        const { error: saleError } = await supabase.from('sales').insert([{
          customer_id: selectedCustomerId || null,
          total_amount: totals.total,
          payment_method: paymentMethod,
          items: cart,
          status: paymentMethod === 'CTA_CTE' ? 'DEUDA' : 'COBRADO' 
        }]);

        if (saleError) console.error("Error guardando ticket:", saleError);

        // 3. INYECCIÓN DIRECTA A LA CUENTA CORRIENTE (LA TABLA NUEVA) 🚀
        if (paymentMethod === 'CTA_CTE') {
          
          const { error: movementError } = await supabase.from('account_movements').insert([{
            customer_id: selectedCustomerId,
            amount: totals.total, 
            movement_type: 'CARGO', // Usamos el formato nuevo 'CARGO'
            description: conceptSummary
            // Le sacamos el status: 'PENDIENTE' porque la tabla nueva no lo necesita
          }]);

          if (movementError) throw new Error("Fallo al insertar movimiento: " + movementError.message);

          // También actualizamos el balance rápido del CRM para que se vea reflejado en la agenda
          const currentBalance = Number(clienteObj?.balance) || 0; 
          const { error: balanceError } = await supabase.from('customers')
            .update({ balance: currentBalance + totals.total }) 
            .eq('id', selectedCustomerId);

          if (balanceError) throw new Error("Fallo al actualizar el saldo del cliente: " + balanceError.message);

        } else {
          // Tesorería
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

        Swal.fire({ 
          title: '¡Venta Exitosa!', 
          text: paymentMethod === 'CTA_CTE' ? 'El CARGO se inyectó correctamente en la Cta. Corriente.' : 'La caja ha sido actualizada.', 
          icon: 'success', 
          animation: false 
        });
        
        setCart([]); setSelectedCustomerId(null); setClientSearch(''); setPaymentMethod(null);
        fetchAllCatalogs(); 
      } catch (err: any) {
        Swal.fire({ title: 'Error Crítico', text: err.message, icon: 'error', animation: false });
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
              className="w-full pl-12 pr-4 py-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {filteredProducts.map(p => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} />
          ))}
        </div>
      </div>

      <div className="w-[400px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl rounded-l-[40px] overflow-hidden">
        
        <div className="p-6 space-y-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-black italic tracking-tighter flex items-center gap-2 dark:text-white">
            <User className="w-5 h-5 text-blue-600" /> CLIENTE
          </h2>
          <div className="relative">
            {selectedCustomerId ? (
              <div className="flex items-center justify-between bg-blue-600 p-4 rounded-2xl text-white">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase opacity-70">Seleccionado</span>
                  <span className="text-xs font-black uppercase tracking-widest">{customers.find(c => c.id === selectedCustomerId)?.name}</span>
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
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none dark:text-white focus:border-blue-500 transition-colors"
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
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight">{item.name}</p>
                <div className="flex gap-2">
                  <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase">T: {item.size_name}</span>
                  <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-500 px-2 py-0.5 rounded uppercase">{item.color_name}</span>
                </div>
                <p className="text-xs font-bold text-slate-400">{item.quantity} x ${item.price.toLocaleString('es-AR')}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="text-rose-500 hover:scale-110 transition-transform">
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
                className={`py-3 rounded-xl text-[9px] font-black transition-colors border flex items-center justify-center gap-2 ${paymentMethod === m ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
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
            className="w-full py-5 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-transform shadow-xl active:scale-95"
          >
            Finalizar Operación
          </button>
        </div>
      </div>
    </div>
  );
};