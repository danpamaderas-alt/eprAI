import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';
import { useCatalogStore, type Product, type Service } from '../../../store/useCatalogStore';
import { useCrmStore, type Customer } from '../../crm/store/useCrmStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

interface OrderFormProps {
  orderToEdit?: any; 
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderForm = ({ orderToEdit, onClose, onSuccess }: OrderFormProps) => {
  const { products, services, sizes, colors, inventory, fetchAllCatalogs, addService, addProduct, updateStock } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    fetchAllCatalogs();
    fetchCustomers();
  }, [fetchAllCatalogs, fetchCustomers]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: orderToEdit ? {
      dueDate: orderToEdit.due_date ? orderToEdit.due_date.substring(0, 10) : new Date().toISOString().split('T')[0],
      customerName: orderToEdit.customer_name,
      status: orderToEdit.status,
      businessUnit: orderToEdit.business_unit,
      items: orderToEdit.items || [],
      totalAmount: orderToEdit.total_amount,
      advancePayment: orderToEdit.advance_payment
    } : {
      dueDate: new Date().toISOString().split('T')[0],
      customerName: 'Consumidor Final',
      status: 'PENDING',
      businessUnit: 'ROJO_SHOWROOM',
      items: [],
      totalAmount: 0,
      advancePayment: 0
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchItems = watch('items');

  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'CONSUMIDOR_FINAL') {
      const c = customers.find((x: Customer) => x.id === selectedClientId);
      if (c) setValue('customerName', c.name);
    } else {
      setValue('customerName', 'Consumidor Final');
    }
  }, [selectedClientId, customers, setValue]);

  const generateUUID = () => crypto.randomUUID();

  const createProductOnTheFly = async () => {
    const { value: formValues } = await Swal.fire({
      title: '📦 NUEVO ARTÍCULO',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nombre del Producto *</label>
            <input id="sw-name" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl !text-sm !font-bold dark:bg-slate-800 dark:text-white" placeholder="Ej: Remera Algodón Premium">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoría</label>
              <input id="sw-cat" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl !text-sm !font-bold dark:bg-slate-800 dark:text-white" placeholder="REMERAS">
            </div>
            <div>
              <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ubicación</label>
              <input id="sw-loc" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl !text-sm !font-bold dark:bg-slate-800 dark:text-white" placeholder="SECTOR A">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] font-black uppercase text-rose-500 tracking-widest">Valor Costo ($)</label>
              <input id="sw-cost" type="number" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl !text-sm !font-bold dark:bg-slate-800 dark:text-white" placeholder="0">
            </div>
            <div>
              <label class="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Valor Venta ($)</label>
              <input id="sw-price" type="number" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl !text-sm !font-bold dark:bg-slate-800 dark:text-white" placeholder="0">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'GUARDAR E INCLUIR', cancelButtonText: 'CANCELAR',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl border border-slate-700', confirmButton: 'bg-blue-600 rounded-xl font-black text-xs px-6 py-3', cancelButton: 'bg-slate-700 rounded-xl font-black text-xs px-6 py-3' },
      preConfirm: () => {
        const name = (document.getElementById('sw-name') as HTMLInputElement).value;
        if (!name) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
        return { name, category: (document.getElementById('sw-cat') as HTMLInputElement).value.toUpperCase(), location: (document.getElementById('sw-loc') as HTMLInputElement).value.toUpperCase(), cost_price: Number((document.getElementById('sw-cost') as HTMLInputElement).value), price: Number((document.getElementById('sw-price') as HTMLInputElement).value) };
      }
    });

    if (formValues) {
      try {
        const created = await addProduct(formValues as any);
        append({ id: generateUUID(), type: 'PRODUCT', productName: created.name, variations: [] });
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Prenda integrada al stock', showConfirmButton: false, timer: 1500 });
      } catch (e) { Swal.fire('Error', 'No se pudo sincronizar', 'error'); }
    }
  };

  const handleAddProductClick = async () => {
    const productOptions = products.map(p => `<option value="${p.id}">${p.name} [${p.sku || 'S/N'}]</option>`).join('');
    const { value: selectedId } = await Swal.fire({
      title: 'BUSCAR PRENDA',
      html: `<select id="sw-prod-id" class="swal2-input !w-full !rounded-xl dark:bg-slate-800 dark:text-white">
        <option value="" disabled selected>Elegir del catálogo...</option>
        <option value="NEW" style="color: #3b82f6; font-weight: 900;">✨ + CREAR NUEVA PRENDA</option>
        ${productOptions}
      </select>`,
      showCancelButton: true,
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl' },
      preConfirm: () => (document.getElementById('sw-prod-id') as HTMLSelectElement).value
    });

    if (selectedId === 'NEW') createProductOnTheFly();
    else if (selectedId) {
      const p = products.find(x => x.id === selectedId);
      if(p) append({ id: generateUUID(), type: 'PRODUCT', productName: p.name, variations: [] });
    }
  };

  // ✅ MAGIA VISUAL: SELECTORES DINÁMICOS CON GRIDS
  const handleQuickAdd = async (index: number) => {
    const item = watchItems[index];
    const product = products.find(p => p.name === item.productName);
    if (!product) return;

    const action = await Swal.fire({
      title: item.productName,
      text: '¿Vas a vender stock actual o estás recibiendo mercadería nueva?',
      showDenyButton: true, showCancelButton: true,
      confirmButtonText: '🛒 Sumar al Pedido', denyButtonText: '📦 Ingresar al Taller',
      confirmButtonColor: '#2563eb', denyButtonColor: '#10b981',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl', actions: 'flex-col gap-2', confirmButton: 'w-full m-0', denyButton: 'w-full m-0', cancelButton: 'w-full m-0 mt-2' }
    });

    if (action.isDenied) {
      // 📦 INGRESO DE STOCK (GRID DINÁMICO)
      const sizeBtns = sizes.map(s => `<button type="button" class="swal-size-btn m-1 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors" data-id="${s.id}">${s.name}</button>`).join('');
      const colorBtns = colors.map(c => `<button type="button" class="swal-color-btn m-1 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors" data-id="${c.id}">${c.name}</button>`).join('');

      const { value: stData } = await Swal.fire({
        title: 'INGRESO DE MERCADERÍA',
        width: '700px', // Hacemos el modal más ancho
        html: `
          <style>
            .btn-selected { background-color: #2563eb !important; color: white !important; border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59,130,246,0.5); }
          </style>
          <div class="text-left space-y-6 max-h-[60vh] overflow-y-auto p-2">
            
            <div>
              <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">1. Seleccionar Talle</label>
              <div class="flex flex-wrap" id="size-grid">${sizeBtns}</div>
              <input type="hidden" id="sw-in-s">
            </div>

            <div>
              <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">2. Seleccionar Color</label>
              <div class="flex flex-wrap" id="color-grid">${colorBtns}</div>
              <input type="hidden" id="sw-in-c">
            </div>

            <div class="pt-4 border-t border-slate-800">
              <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">3. Cantidad Recibida</label>
              <input id="sw-in-q" type="number" class="swal2-input !w-full !m-0 !rounded-xl !text-center !font-black !text-3xl dark:bg-slate-800 dark:text-white" placeholder="0">
            </div>

          </div>`,
        didOpen: () => {
          // Lógica para que los botones funcionen como selectores
          const sg = document.getElementById('size-grid');
          const si = document.getElementById('sw-in-s') as HTMLInputElement;
          sg?.addEventListener('click', e => {
            const btn = (e.target as HTMLElement).closest('button');
            if (btn) {
              Array.from(sg.children).forEach(b => b.classList.remove('btn-selected'));
              btn.classList.add('btn-selected');
              si.value = btn.getAttribute('data-id') || '';
            }
          });

          const cg = document.getElementById('color-grid');
          const ci = document.getElementById('sw-in-c') as HTMLInputElement;
          cg?.addEventListener('click', e => {
            const btn = (e.target as HTMLElement).closest('button');
            if (btn) {
              Array.from(cg.children).forEach(b => b.classList.remove('btn-selected'));
              btn.classList.add('btn-selected');
              ci.value = btn.getAttribute('data-id') || '';
            }
          });
        },
        showCancelButton: true, confirmButtonText: 'Guardar Stock Físico',
        customClass: { popup: 'dark:bg-slate-900 rounded-3xl', confirmButton: 'bg-emerald-600' },
        preConfirm: () => {
          const s = (document.getElementById('sw-in-s') as HTMLInputElement).value;
          const c = (document.getElementById('sw-in-c') as HTMLInputElement).value;
          const q = Number((document.getElementById('sw-in-q') as HTMLInputElement).value);
          if (!s) { Swal.showValidationMessage('Seleccioná un talle'); return false; }
          if (!c) { Swal.showValidationMessage('Seleccioná un color'); return false; }
          if (q <= 0) { Swal.showValidationMessage('Ingresá una cantidad mayor a 0'); return false; }
          return { s, c, q };
        }
      });

      if (stData) {
        await updateStock(product.id, stData.s, stData.c, stData.q);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Stock actualizado', timer: 1500, showConfirmButton: false });
      }

    } else if (action.isConfirmed) {
      // 🛒 VENTA (GRID DINÁMICO DE VARIANTES EN STOCK)
      const avail = inventory.filter(v => v.product_id === product.id && v.stock_quantity > 0);
      if (avail.length === 0) return Swal.fire('Sin Stock', 'No hay stock físico de esta prenda. Cargalo primero.', 'warning');

      const varBtns = avail.map(v => `
        <button type="button" class="swal-var-btn m-1 p-3 rounded-xl border border-slate-700 bg-slate-800 text-left hover:bg-slate-700 transition-all flex flex-col min-w-[120px]" data-id="${v.id}" data-max="${v.stock_quantity}" data-s="${v.sizes?.name}" data-c="${v.colors?.name}">
          <span class="text-xs font-bold text-white uppercase">${v.sizes?.name} | ${v.colors?.name}</span>
          <span class="text-[10px] font-black text-emerald-400 mt-1">Hay: ${v.stock_quantity} un.</span>
        </button>
      `).join('');

      const { value: res } = await Swal.fire({
        title: 'AGREGAR AL PEDIDO',
        width: '700px',
        html: `
          <style>
            .var-selected { background-color: #1e293b !important; border-color: #3b82f6 !important; box-shadow: 0 0 0 2px #3b82f6; }
          </style>
          <div class="text-left space-y-6 max-h-[60vh] overflow-y-auto p-2">
            <div>
              <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">1. Variantes Disponibles</label>
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
          if (q > max) { Swal.showValidationMessage(`Solo podés vender ${max}. Si hay más, ingresá stock primero.`); return false; }
          
          return { size: (document.getElementById('sw-s') as HTMLInputElement).value, color: (document.getElementById('sw-c') as HTMLInputElement).value, quantityOrdered: q, quantityDelivered: 0 };
        }
      });
      if (res) setValue(`items.${index}.variations`, [...(watchItems[index].variations || []), { id: generateUUID(), ...res }]);
    }
  };

  const removeVariation = (itemIndex: number, varIndex: number) => {
    const currentVariations = [...(watchItems[itemIndex].variations || [])];
    currentVariations.splice(varIndex, 1);
    setValue(`items.${itemIndex}.variations`, currentVariations);
  };

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        company_id: useTenantStore.getState().activeCompanyId,
        due_date: data.dueDate,
        customer_name: data.customerName,
        status: data.status,
        business_unit: data.businessUnit,
        total_amount: data.totalAmount,
        advance_payment: data.advancePayment,
        items: data.items
      };
      const { error } = orderToEdit ? await supabase.from('orders').update(payload).eq('id', orderToEdit.id) : await supabase.from('orders').insert([payload]);
      if (error) throw error;
      Swal.fire({ icon: 'success', title: 'Hoja de Ruta Guardada', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      onSuccess();
    } catch (e: any) { Swal.fire('Error', e.message, 'error'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl flex flex-col">
        
        <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
            {orderToEdit ? '✏️ EDITAR RUTA' : '🆕 NUEVA HOJA DE RUTA'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 rounded-full transition-all">✕</button>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8 flex-1">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fecha Entrega</label>
              <input type="date" {...register('dueDate')} className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Unidad</label>
              <select {...register('businessUnit')} className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none">
                <option value="ROJO_SHOWROOM">ROJO SHOWROOM</option>
                <option value="RAICES">RAÍCES</option>
                <option value="UNIFORMES">UNIFORMES</option>
                <option value="RJ_CO">RJ&CO.</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cliente / Organización</label>
            <select 
              value={selectedClientId} 
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none"
            >
              <option value="CONSUMIDOR_FINAL">👤 CONSUMIDOR FINAL</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Total Acordado ($)</label>
              <input type="number" {...register('totalAmount')} className="w-full p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-900 dark:text-white font-black text-xl outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Seña Entregada ($)</label>
              <input type="number" {...register('advancePayment')} className="w-full p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-900 dark:text-white font-black text-xl outline-none" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Items del Pedido</h3>
              <button type="button" onClick={handleAddProductClick} className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-transform">+ Prenda</button>
            </div>

            <div className="space-y-4">
              {fields.map((f, i) => (
                <div key={f.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm relative">
                  <button type="button" onClick={() => remove(i)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors">✕</button>
                  <div className="mb-4">
                    <span className="text-[8px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-md uppercase">🛍️ PRODUCTO</span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight mt-1">{watchItems[i].productName}</h4>
                  </div>
                  <div className="space-y-2 mb-4">
                    {watchItems[i].variations?.map((v: any, vIdx: number) => (
                      <div key={v.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">{v.size} | {v.color}</span>
                        <span className="text-sm font-black text-blue-600">{v.quantityOrdered} un.</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => handleQuickAdd(i)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all uppercase">+ Talle / Stock</button>
                </div>
              ))}
            </div>
          </div>
        </form>

        <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/80 sticky bottom-0 z-20 backdrop-blur-sm">
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            {isSubmitting ? 'SINCRONIZANDO...' : (orderToEdit ? 'ACTUALIZAR HOJA DE RUTA' : 'CONFIRMAR PEDIDO')}
          </button>
        </footer>
      </div>
    </div>
  );
};