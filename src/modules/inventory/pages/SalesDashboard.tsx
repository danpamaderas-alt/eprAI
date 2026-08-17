import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTreasuryStore } from '../treasury/store/useTreasuryStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { supabase } from '../../../lib/supabase';
import { Search, ShoppingCart, PackageSearch } from 'lucide-react';
import { ARS } from '../../../shared/utils/format';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import { ProductCard } from '../../pos/components/ProductSearchCard';
import { CustomerSelector } from '../../pos/components/CustomerSelector';
import { CartItemCard } from '../../pos/components/CartItemCard';
import { PaymentSelector } from '../../pos/components/PaymentSelector';
import { RemitoModal } from '../../orders/components/RemitoModal';
import Swal from 'sweetalert2';

interface CartItem {
  id: string;
  product_id: string;
  variantId: string;
  name: string;
  price: number;
  qty: number;
  color_id: string;
  color_name: string;
  size_id: string;
  size_name: string;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const SalesContent = memo(() => {
  const { products, inventory, fetchAllCatalogs, processSale } = useCatalogStore();
  const { balances, fetchBalances, addMovement } = useCrmStore();
  const { addTransaction } = useTreasuryStore();
  const activeCompanyId = useTenantStore((state) => state.activeCompanyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemitoOpen, setIsRemitoOpen] = useState(false);

  useEffect(() => {
    fetchAllCatalogs();
    fetchBalances();
  }, [fetchAllCatalogs, fetchBalances]);

  const totals = useMemo(() => {
    const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const count = cart.reduce((acc, item) => acc + item.qty, 0);
    return { total, count };
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) => p.name?.toLowerCase().includes(search) || p.sku?.toLowerCase().includes(search),
    );
  }, [products, searchTerm]);

  const addToCart = useCallback(
    async (product: Product) => {
      const variants = inventory.filter(
        (v) => v.product_id === product.id && (v.finished_quantity || 0) > 0,
      );

      if (!variants.length) {
        return Swal.fire({
          title: 'Sin Stock',
          text: 'No hay unidades acondicionadas disponibles.',
          icon: 'warning',
          background: '#0f172a',
          color: '#fff',
        });
      }

      const htmlOptions = variants
        .map(
          (v) => `
        <button type="button" class="swal-v-btn p-4 rounded-2xl border-2 border-slate-700 bg-slate-800 text-left hover:border-blue-500 transition-all flex flex-col"
          data-id="${v.id}" data-max="${v.finished_quantity}" data-sid="${v.size_id}" data-cid="${v.color_id}"
          data-sname="${escapeHtml(v.sizes?.name || 'S/N')}" data-cname="${escapeHtml(v.colors?.name || 'S/C')}">
          <span class="text-xs font-black text-white uppercase">${escapeHtml(v.sizes?.name || 'S/N')} | ${escapeHtml(v.colors?.name || 'S/C')}</span>
          <span class="text-[10px] font-bold text-emerald-400 mt-1">STOCK: ${v.finished_quantity}</span>
        </button>`,
        )
        .join('');

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
          grid?.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('button');
            if (btn) {
              grid.querySelectorAll('button').forEach((b) =>
                b.classList.remove('border-blue-500', 'bg-blue-600/10'),
              );
              btn.classList.add('border-blue-500', 'bg-blue-600/10');
              (document.getElementById('sw-id') as HTMLInputElement).value = btn.dataset.id!;
              (document.getElementById('sw-sid') as HTMLInputElement).value = btn.dataset.sid!;
              (document.getElementById('sw-sname') as HTMLInputElement).value = btn.dataset.sname!;
              (document.getElementById('sw-cid') as HTMLInputElement).value = btn.dataset.cid!;
              (document.getElementById('sw-cname') as HTMLInputElement).value = btn.dataset.cname!;
              qtyInput.disabled = false;
              qtyInput.max = btn.dataset.max!;
              qtyInput.focus();
            }
          });
        },
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR',
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
          const qty = Number.parseInt(
            (document.getElementById('sw-qty') as HTMLInputElement).value,
            10,
          );
          if (!(document.getElementById('sw-id') as HTMLInputElement).value)
            return Swal.showValidationMessage('Elegí un talle/color');
          if (isNaN(qty) || qty <= 0) return Swal.showValidationMessage('Cantidad inválida');
          return {
            vid: (document.getElementById('sw-id') as HTMLInputElement).value,
            sid: (document.getElementById('sw-sid') as HTMLInputElement).value,
            sname: (document.getElementById('sw-sname') as HTMLInputElement).value,
            cid: (document.getElementById('sw-cid') as HTMLInputElement).value,
            cname: (document.getElementById('sw-cname') as HTMLInputElement).value,
            qty,
          };
        },
      });

      if (res) {
        setCart((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            product_id: product.id,
            variantId: res.vid,
            name: product.name,
            price: Number.parseFloat(String(product.price || 0)),
            qty: res.qty,
            size_id: res.sid,
            size_name: res.sname,
            color_id: res.cid,
            color_name: res.cname,
          },
        ]);
      }
    },
    [inventory],
  );

  const handleCheckout = async () => {
    if (!paymentMethod)
      return Swal.fire({ title: 'Atención', text: 'Elegí el medio de pago.', icon: 'warning' });
    if (paymentMethod === 'CTA_CTE' && !selectedCustomerId)
      return Swal.fire({ title: 'Error', text: 'Asigná un cliente para la deuda.', icon: 'error' });

    const confirm = await Swal.fire({
      title: '¿FINALIZAR VENTA?',
      text: `Total Operación: ${ARS.format(totals.total)}`,
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
        p_total: totals.total,
        p_payment_method: paymentMethod,
        p_company_id: activeCompanyId,
      });
      if (error) throw error;

      Swal.fire({ title: 'VENTA EXITOSA', icon: 'success', timer: 2000, showConfirmButton: false });
      setCart([]);
      setSelectedCustomerId(null);
      setPaymentMethod(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      Swal.fire({ title: 'FALLO CRITICO', text: msg, icon: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen gap-0 overflow-hidden bg-slate-50 dark:bg-slate-950 p-0 relative">
      <div className="flex flex-1 flex-col space-y-4 overflow-hidden p-6">
        <header className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-black tracking-tighter dark:text-white uppercase">
            Terminal <span className="text-blue-600">POS</span>
          </h1>
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar artículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border-none rounded-2xl text-sm font-bold shadow-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10 scrollbar-hide">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} />
          ))}
        </div>
      </div>

      <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl rounded-l-[50px] overflow-hidden">
        <CustomerSelector
          selectedCustomerId={selectedCustomerId}
          onSelect={setSelectedCustomerId}
        />

        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
            <ShoppingCart className="w-3 h-3" /> Bolsa de Compras ({totals.count})
          </p>
          {cart.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onRemove={(id) => setCart((prev) => prev.filter((i) => i.id !== id))}
            />
          ))}
          {cart.length === 0 && (
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] mt-6">
              <PackageSearch className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Bolsa Vacía
              </p>
              <p className="text-[9px] font-bold text-slate-500 mt-1">
                Añade productos desde el catálogo
              </p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} />

          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total Operativo
              </p>
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">
                {ARS.format(totals.total)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-6 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3"
          >
            {isProcessing ? 'PROCESANDO...' : 'FINALIZAR VENTA'}
          </button>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRemitoOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase transition-all disabled:opacity-30 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
            >
              Opción: Crear Remito de Envío
            </button>
          </div>
        </div>
      </div>

      <RemitoModal
        isOpen={isRemitoOpen}
        onClose={() => setIsRemitoOpen(false)}
        order={{
          id: 'POS-' + crypto.randomUUID().split('-')[0].toUpperCase(),
          customerName: balances.find((c) => c.id === selectedCustomerId)?.name || 'Consumidor Final',
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
