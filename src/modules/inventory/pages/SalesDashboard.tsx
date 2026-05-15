import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from "../../inventory/treasury/store/useTreasuryStore";
import { supabase } from '../../../lib/supabase';
import { Search, Trash2, User, X, ShoppingCart, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

const ARS = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

interface CartItem {
  id: string;
  product_id: string;
  variantId: string; // ✅ Cambiado para coincidir con la lógica del store
  name: string;
  price: number;
  qty: number;       // ✅ Cambiado de quantity a qty para consistencia
  color_id: string;
  color_name: string;
  size_id: string;
  size_name: string;
}

const ProductCard = memo(({ product, onAdd }: { product: Product, onAdd: (p: Product) => void }) => (
  <button 
    type="button"
    onClick={() => onAdd(product)}
    className="group bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-blue-500 hover:shadow-2xl transition-all flex flex-col items-start text-left relative overflow-hidden"
  >
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{product.sku || 'SIN SKU'}</span>
    <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm mt-2 leading-tight h-10 overflow-hidden">{product.name}</h3>
    <p className="mt-4 text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{ARS.format(Number.parseFloat(String(product.price || 0)))}</p>
    <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl group-hover:scale-110 transition-transform">📦</div>
  </button>
));

export const SalesDashboard = () => {
  const { products, inventory, fetchAllCatalogs, processSale } = useCatalogStore();
  const { balances, fetchBalances, addMovement } = useCrmStore(); // ✅ FIX: Nombres correctos del useCrmStore.ts
  const { addTransaction } = useTreasuryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'MERCADO_PAGO' | 'BANCO' | 'CTA_CTE' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAllCatalogs();
    fetchBalances(); // ✅ FIX: Nombre correcto de la función
  }, [fetchAllCatalogs, fetchBalances]);

  const totals = useMemo(() => {
    const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    return { total, count };
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return products.filter(p => 
      p.name?.toLowerCase().includes(search) || p.sku?.toLowerCase().includes(search)
    );
  }, [products, searchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!clientSearch || selectedCustomerId) return [];
    return balances.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 5);
  }, [balances, clientSearch, selectedCustomerId]);

  const addToCart = useCallback(async (product: Product) => {
    const variants = inventory.filter(v => v.product_id === product.id && (v.finished_quantity || 0) > 0);

    if (!variants.length) {
      return Swal.fire({ title: 'Sin Stock', text: 'No hay unidades acondicionadas disponibles.', icon: 'warning', background: '#0f172a', color: '#fff' });
    }

    const htmlOptions = variants.map(v => `
      <button type="button" class="swal-v-btn p-4 rounded-2xl border-2 border-slate-700 bg-slate-800 text-left hover:border-blue-500 transition-all flex flex-col" 
        data-id="${v.id}" data-max="${v.finished_quantity}" data-sid="${v.size_id}" data-cid="${v.color_id}" 
        data-sname="${v.sizes?.name}" data-cname="${v.colors?.name}">
        <span class="text-xs font-black text-white uppercase">${v.sizes?.name} | ${v.colors?.name}</span>
        <span class="text-[10px] font-bold text-emerald-400 mt-1">STOCK: ${v.finished_quantity}</span>
      </button>
    `).join('');

    const { value: res } = await Swal.fire({
      title: 'AÑADIR AL CARRITO',
      width: '650px',
      html: `
        <div class="text-left space-y-6 p-2">
          <div class="grid grid-cols-2 gap-3" id="sw-grid">${htmlOptions}</div>
          <input type="hidden" id="sw-id"> <input type="hidden" id="sw-sid"> <input type="hidden" id="sw-sname">
          <input type="hidden" id="sw-cid"> <input type="hidden" id="sw-cname">
          <div class="pt-6 border-t border-slate-800">
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2 text-center">CANTIDAD A VENDER</label>
            <input id="sw-qty" type="number" class="swal2-input !w-full !m-0 !rounded-2xl !text-center !font-black !text-4xl dark:bg-slate-950 dark:text-blue-500 border-none" placeholder="0" disabled>
          </div>
        </div>`,
      didOpen: () => {
        const grid = document.getElementById('sw-grid');
        const qtyInput = document.getElementById('sw-qty') as HTMLInputElement;
        grid?.addEventListener('click', e => {
          const btn = (e.target as HTMLElement).closest('button');
          if (btn) {
            grid.querySelectorAll('button').forEach(b => b.classList.remove('border-blue-500', 'bg-blue-600/10'));
            btn.classList.add('border-blue-500', 'bg-blue-600/10');
            (document.getElementById('sw-id') as HTMLInputElement).value = btn.dataset.id!;
            (document.getElementById('sw-sid') as HTMLInputElement).value = btn.dataset.sid!;
            (document.getElementById('sw-sname') as HTMLInputElement).value = btn.dataset.sname!;
            (document.getElementById('sw-cid') as HTMLInputElement).value = btn.dataset.cid!;
            (document.getElementById('sw-cname') as HTMLInputElement).value = btn.dataset.cname!;
            qtyInput.disabled = false; qtyInput.max = btn.dataset.max!; qtyInput.focus();
          }
        });
      },
      showCancelButton: true, confirmButtonText: 'CONFIRMAR', confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const qty = Number.parseInt((document.getElementById('sw-qty') as HTMLInputElement).value, 10);
        if (!(document.getElementById('sw-id') as HTMLInputElement).value) return Swal.showValidationMessage('Elegí un talle/color');
        if (isNaN(qty) || qty <= 0) return Swal.showValidationMessage('Cantidad inválida');
        return { 
          vid: (document.getElementById('sw-id') as HTMLInputElement).value,
          sid: (document.getElementById('sw-sid') as HTMLInputElement).value,
          sname: (document.getElementById('sw-sname') as HTMLInputElement).value,
          cid: (document.getElementById('sw-cid') as HTMLInputElement).value,
          cname: (document.getElementById('sw-cname') as HTMLInputElement).value,
          qty 
        };
      }
    });

    if (res) {
      setCart(prev => [...prev, {
        id: crypto.randomUUID(), product_id: product.id, variantId: res.vid, name: product.name, 
        price: Number.parseFloat(String(product.price || 0)),
        qty: res.qty, size_id: res.sid, size_name: res.sname, color_id: res.cid, color_name: res.cname
      }]);
    }
  }, [inventory]);

  const handleCheckout = async () => {
    if (!paymentMethod) return Swal.fire({ title: 'Atención', text: 'Elegí el medio de pago.', icon: 'warning' });
    if (paymentMethod === 'CTA_CTE' && !selectedCustomerId) return Swal.fire({ title: 'Error', text: 'Asigná un cliente para la deuda.', icon: 'error' });

    const confirm = await Swal.fire({
      title: '¿FINALIZAR VENTA?',
      text: `Total Operación: ${ARS.format(totals.total)}`,
      icon: 'question', showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'SÍ, COBRAR'
    });

    if (confirm.isConfirmed) {
      setIsProcessing(true);
      try {
        // 1. DESCUENTO DE STOCK FÍSICO (Vía Store)
        await processSale(selectedCustomerId || '', cart, totals.total);

        const cliente = balances.find(c => c.id === selectedCustomerId);

        // 2. REGISTRO DE VENTA
        await supabase.from('sales').insert([{
          customer_id: selectedCustomerId, 
          total_amount: totals.total, 
          payment_method: paymentMethod, 
          items: cart,
          status: paymentMethod === 'CTA_CTE' ? 'DEUDA' : 'COBRADO' 
        }]);

        // 3. FLUJO FINANCIERO CENTRALIZADO
        if (paymentMethod === 'CTA_CTE' && selectedCustomerId) {
          await addMovement({
            customer_id: selectedCustomerId, 
            amount: totals.total, 
            movement_type: 'CARGO',
            description: `Venta POS: ${cart.length} prendas`,
            date: new Date().toISOString()
          });
        } else {
          await addTransaction({
            date: new Date().toISOString(), 
            description: `VENTA POS: ${cliente?.name || 'CONSUMIDOR FINAL'}`,
            category: 'VENTA_CATALOGO', type: 'INCOME', business_unit: 'RAICES', 
            payment_method: paymentMethod as any, 
            amount: totals.total, 
            status: 'COMPLETED'
          });
        }

        Swal.fire({ title: 'VENTA EXITOSA', icon: 'success', timer: 2000, showConfirmButton: false });
        setCart([]); setSelectedCustomerId(null); setClientSearch(''); setPaymentMethod(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        Swal.fire({ title: 'FALLO CRÍTICO', text: msg, icon: 'error' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="flex h-screen gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950 p-0">
      
      <div className="flex flex-1 flex-col space-y-4 overflow-hidden p-6">
        <header className="flex justify-between items-center mb-2">
           <h1 className="text-3xl font-black italic tracking-tighter dark:text-white uppercase">Terminal <span className="text-blue-600">POS</span></h1>
           <div className="relative w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar artículo..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border-none rounded-2xl text-sm font-bold shadow-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
              />
           </div>
        </header>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10 scrollbar-hide">
          {filteredProducts.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
        </div>
      </div>

      <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl rounded-l-[50px] overflow-hidden">
        
        <div className="p-8 border-b dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <User className="w-3 h-3" /> Identificación de Cliente
          </p>
          {selectedCustomerId ? (
            <div className="flex items-center justify-between bg-blue-600 p-5 rounded-[2rem] text-white shadow-lg animate-in zoom-in-95">
              <div className="overflow-hidden">
                <p className="text-[9px] font-black uppercase opacity-60">Cliente Activo</p>
                <p className="text-sm font-black uppercase truncate">{balances.find(c => c.id === selectedCustomerId)?.name}</p>
              </div>
              <button type="button" onClick={() => { setSelectedCustomerId(null); setClientSearch(''); }} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
          ) : (
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar por nombre..." 
                value={clientSearch} 
                onChange={e => setClientSearch(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              />
              {filteredCustomers.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden">
                  {filteredCustomers.map(c => (
                    <button 
                      key={c.id} 
                      type="button"
                      onClick={() => { setSelectedCustomerId(c.id); setClientSearch(c.name); }}
                      className="w-full px-6 py-4 text-left text-xs font-black hover:bg-blue-50 dark:hover:bg-blue-900/40 dark:text-white border-b border-slate-50 dark:border-slate-800 last:border-none uppercase"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
             <ShoppingCart className="w-3 h-3" /> Bolsa de Compras ({totals.count})
          </p>
          {cart.map((item) => (
            <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[2rem] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight">{item.name}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[8px] font-black bg-white dark:bg-slate-900 text-slate-500 px-2 py-1 rounded-lg border dark:border-slate-700 uppercase">T: {item.size_name}</span>
                    <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-1 rounded-lg uppercase">{item.color_name}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex justify-between items-end mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{item.qty} x {ARS.format(item.price)}</p>
                <p className="font-black text-sm text-slate-900 dark:text-white tabular-nums">{ARS.format(item.price * item.qty)}</p>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] opacity-30">
               <ShoppingCart className="w-8 h-8 mb-2" />
               <p className="text-[9px] font-black uppercase tracking-widest">Carrito Vacío</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(['EFECTIVO', 'MERCADO_PAGO', 'BANCO', 'CTA_CTE'] as const).map(m => (
              <button 
                key={m} 
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`py-4 rounded-2xl text-[9px] font-black transition-all border-2 flex items-center justify-center ${paymentMethod === m ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'} uppercase`}
              >
                {m.replace('_', ' ')} {paymentMethod === m && <CheckCircle2 className="w-3 h-3 ml-1" />}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-end mb-8">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Operativo</p>
               <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">{ARS.format(totals.total)}</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-6 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
          >
            {isProcessing ? 'PROCESANDO...' : 'FINALIZAR VENTA 💰'}
          </button>
        </div>
      </div>
    </div>
  );
};