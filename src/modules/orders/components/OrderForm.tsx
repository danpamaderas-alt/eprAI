import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore, type Customer } from '../../crm/store/useCrmStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

// 🚀 IMPORTAMOS NUESTRO NUEVO CEREBRO AISLADO
import { OrderMatrixModal } from './OrderMatrixModal';

interface OrderFormProps {
  orderToEdit?: any; 
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderForm = ({ orderToEdit, onClose, onSuccess }: OrderFormProps) => {
  const { products, sizes, colors, fetchAllCatalogs, addProduct, updateStock } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // ✅ ESTADO PARA SABER QUÉ MATRIZ ESTÁ ABIERTA
  const [activeMatrixIndex, setActiveMatrixIndex] = useState<number | null>(null);

  // 🔥 OPTIMIZACIÓN DE ARRANQUE: Caché inteligente (CASO 3)
  useEffect(() => {
    // 1. Si no hay datos en RAM, bloquea y trae todo
    if (products.length === 0 || sizes.length === 0) {
      fetchAllCatalogs();
    } else {
      // 2. Si ya hay datos, hace un refresh silencioso de fondo
      setTimeout(() => { fetchAllCatalogs(); }, 1000); 
    }

    if (customers.length === 0) {
      fetchCustomers();
    } else {
      setTimeout(() => { fetchCustomers(); }, 1000);
    }
  }, []); // Dependencias vacías

  const { register, control, handleSubmit, watch, setValue } = useForm<OrderFormValues>({
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

  const { fields, append } = useFieldArray({ control, name: "items" });
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

  // --------------------------------------------------------
  // LÓGICA DE PRODUCTOS NUEVOS Y EDICIÓN RÁPIDA
  // --------------------------------------------------------

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
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Prenda integrada', showConfirmButton: false, timer: 1500 });
      } catch (e) { Swal.fire('Error', 'No se pudo sincronizar', 'error'); }
    }
  };

  const handleAddProductClick = async () => {
    const productOptions = products.map(p => `<option value="${p.id}">${p.name} [${p.sku || 'S/N'}]</option>`).join('');
    const { value: selectedId } = await Swal.fire({
      title: 'BUSCAR PRENDA',
      html: `
        <div class="text-left mb-2">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">¿No existe? Elegí la primera opción verde para crearla.</p>
        </div>
        <select id="sw-prod-id" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white">
          <option value="" disabled selected>Elegir del catálogo...</option>
          <option value="NEW" style="color: #10b981; font-weight: 900;">✨ + CREAR NUEVO PRODUCTO AQUÍ</option>
          ${productOptions}
        </select>`,
      showCancelButton: true,
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl', confirmButton: 'bg-blue-600' },
      preConfirm: () => (document.getElementById('sw-prod-id') as HTMLSelectElement).value
    });

    if (selectedId === 'NEW') createProductOnTheFly();
    else if (selectedId) {
      const p = products.find(x => x.id === selectedId);
      if(p) append({ id: generateUUID(), type: 'PRODUCT', productName: p.name, variations: [] });
    }
  };

  const editVariationQuantity = async (itemIndex: number, varIndex: number) => {
    const currentVar = watchItems[itemIndex].variations[varIndex];
    const delivered = currentVar.quantityDelivered || 0;

    const { value: newQty } = await Swal.fire({
      title: 'Editar Pedido',
      text: `${currentVar.size} | ${currentVar.color}`,
      input: 'number',
      inputValue: currentVar.quantityOrdered,
      inputAttributes: { min: delivered.toString(), step: '1' },
      showCancelButton: true, confirmButtonText: 'Actualizar', cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white', confirmButton: 'bg-blue-600 font-black rounded-xl px-6', cancelButton: 'bg-slate-700 font-black rounded-xl px-6' },
      preConfirm: (val) => {
        const q = Number(val);
        if (q < delivered) {
          Swal.showValidationMessage(`Ya entregaste ${delivered} unidades. Mínimo: ${delivered}`);
          return false;
        }
        return q;
      }
    });

    if (newQty !== undefined) {
      const newVariations = [...watchItems[itemIndex].variations];
      newVariations[varIndex].quantityOrdered = Number(newQty);
      setValue(`items.${itemIndex}.variations`, newVariations);
    }
  };

  const registerDelivery = async (itemIndex: number, varIndex: number) => {
    const currentVar = watchItems[itemIndex].variations[varIndex];
    const ordered = currentVar.quantityOrdered;
    const alreadyDelivered = currentVar.quantityDelivered || 0;
    const remaining = ordered - alreadyDelivered;

    if (remaining <= 0) {
      return Swal.fire({ title: 'Completado', text: 'Ya entregaste la totalidad de este talle/color.', icon: 'info', customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white' } });
    }

    const { value: deliveryQty } = await Swal.fire({
      title: 'Registrar Entrega',
      text: `Faltan entregar ${remaining} unidades de ${currentVar.size} | ${currentVar.color}`,
      input: 'number',
      inputValue: remaining,
      inputAttributes: { min: '1', max: remaining.toString(), step: '1' },
      showCancelButton: true, confirmButtonText: 'Confirmar Entrega', cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl dark:text-white', confirmButton: 'bg-emerald-600 font-black rounded-xl px-6', cancelButton: 'bg-slate-700 font-black rounded-xl px-6' },
      preConfirm: (val) => {
        const q = Number(val);
        if (q <= 0 || q > remaining) {
          Swal.showValidationMessage(`Ingresá una cantidad entre 1 y ${remaining}`);
          return false;
        }
        return q;
      }
    });

    if (deliveryQty) {
      const newVariations = [...watchItems[itemIndex].variations];
      newVariations[varIndex].quantityDelivered = alreadyDelivered + Number(deliveryQty);
      setValue(`items.${itemIndex}.variations`, newVariations);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Entrega registrada', showConfirmButton: false, timer: 1500 });
    }
  };

  const removeVariation = (itemIndex: number, varIndex: number) => {
    const currentVariations = [...(watchItems[itemIndex].variations || [])];
    currentVariations.splice(varIndex, 1);
    setValue(`items.${itemIndex}.variations`, currentVariations);
  };

  const removeItem = (itemIndex: number) => {
    const currentItems = [...watchItems];
    currentItems.splice(itemIndex, 1);
    setValue('items', currentItems);
  }

  // --------------------------------------------------------
  // CONEXIÓN CON EL NUEVO COMPONENTE DE MATRIZ
  // --------------------------------------------------------

  const handleRequestNewVariant = async (productId: string, index: number) => {
    setActiveMatrixIndex(null);

    const sizeBtns = sizes.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const colorBtns = colors.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const { value: newVar } = await Swal.fire({
      title: 'NUEVA COMBINACIÓN',
      html: `
        <div class="text-left space-y-4 p-2">
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Elegí el Talle</label>
            <select id="nv-s" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl dark:bg-slate-800 dark:text-white"><option value="" disabled selected>Seleccionar...</option>${sizeBtns}</select>
          </div>
          <div>
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">2. Elegí el Color</label>
            <select id="nv-c" class="swal2-input !w-full !m-0 !mt-1 !rounded-xl dark:bg-slate-800 dark:text-white"><option value="" disabled selected>Seleccionar...</option>${colorBtns}</select>
          </div>
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'AGREGAR', cancelButtonText: 'CANCELAR',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl', confirmButton: 'bg-emerald-600 rounded-xl', cancelButton: 'bg-slate-700 rounded-xl' },
      preConfirm: () => {
        const s = (document.getElementById('nv-s') as HTMLInputElement).value;
        const c = (document.getElementById('nv-c') as HTMLInputElement).value;
        if (!s || !c) { Swal.showValidationMessage('Seleccioná talle y color'); return false; }
        return { s, c };
      }
    });

    if (newVar) {
      Swal.fire({ title: 'Sincronizando base de datos...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await updateStock(productId, newVar.s, newVar.c, 0); 
      await fetchAllCatalogs(); 
      Swal.close();
    }
    
    setActiveMatrixIndex(index);
  };


  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    onSuccess(); // Cerrado optimista

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

      const { error } = await supabase
        .from('orders')
        .upsert(
          orderToEdit ? { id: orderToEdit.id, ...payload } : payload,
          { onConflict: 'id' }
        );

      if (error) throw error;

      Swal.fire({ 
        icon: 'success', 
        title: 'Sincronizado con la nube', 
        toast: true, 
        position: 'top-end', 
        timer: 2000, 
        showConfirmButton: false 
      });

    } catch (e: any) {
      Swal.fire('Error de Sincronización', 'El pedido se guardó localmente pero falló el servidor: ' + e.message, 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex justify-end">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl flex flex-col">
          
          <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
              {orderToEdit ? '✏️ EDITAR RUTA' : '🆕 NUEVA HOJA DE RUTA'}
            </h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 rounded-full transition-all font-black">✕</button>
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
                    <button type="button" onClick={() => removeItem(i)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors font-black">✕</button>
                    <div className="mb-4">
                      <span className="text-[8px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-md uppercase">🛍️ PRODUCTO</span>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight mt-1">{watchItems[i].productName}</h4>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {watchItems[i].variations?.map((v: any, vIdx: number) => (
                        <div key={v.id} className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                          
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase">{v.size} | {v.color}</span>
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-widest mt-1">
                                ENTREGADO: {v.quantityDelivered || 0} / {v.quantityOrdered}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <button type="button" onClick={() => registerDelivery(i, vIdx)} className="flex-1 px-3 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-center">
                              📦 Entregar
                            </button>
                            <button type="button" onClick={() => editVariationQuantity(i, vIdx)} className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-center">
                              ✏️ Editar
                            </button>
                            <button type="button" onClick={() => removeVariation(i, vIdx)} className="px-4 py-2 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors text-center">
                              ✕
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={() => setActiveMatrixIndex(i)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all uppercase tracking-widest">
                      {watchItems[i].variations?.length ? '📦 ABRIR MATRIZ MASIVA' : '+ CONFIGURAR MATRIZ'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>

          <footer className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/80 sticky bottom-0 z-20 backdrop-blur-sm">
            <button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50">
              {isSubmitting ? 'GUARDANDO...' : (orderToEdit ? 'ACTUALIZAR HOJA DE RUTA' : 'CONFIRMAR PEDIDO')}
            </button>
          </footer>
        </div>
      </div>

      {activeMatrixIndex !== null && (
        <OrderMatrixModal 
          product={products.find(p => p.name === watchItems[activeMatrixIndex].productName)!}
          currentVariations={watchItems[activeMatrixIndex].variations || []}
          onSave={(newVariations) => {
            setValue(`items.${activeMatrixIndex}.variations`, newVariations);
            setActiveMatrixIndex(null);
          }}
          onClose={() => setActiveMatrixIndex(null)}
          onRequestNewVariant={() => {
            const product = products.find(p => p.name === watchItems[activeMatrixIndex].productName);
            if (product) handleRequestNewVariant(product.id, activeMatrixIndex);
          }}
        />
      )}
    </>
  );
};