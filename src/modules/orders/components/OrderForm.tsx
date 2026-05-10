import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

import { OrderMatrixModal } from './OrderMatrixModal';

interface OrderFormProps {
  orderToEdit?: any; 
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderForm = memo(({ orderToEdit, onClose, onSuccess }: OrderFormProps) => {
  // 🧠 CONEXIÓN CORREGIDA: Cambiamos 'customers' por 'balances' para coincidir con useCrmStore.ts
  const { products, sizes, colors, fetchAllCatalogs, addProduct, updateStock } = useCatalogStore();
  const { balances, fetchBalances } = useCrmStore(); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(orderToEdit?.customer_id || '');
  const [activeMatrixIndex, setActiveMatrixIndex] = useState<number | null>(null);

  // 🔥 FIX: Sincronización blindada contra undefined
  useEffect(() => {
    const syncData = async () => {
      if ((products?.length || 0) === 0) await fetchAllCatalogs();
      if ((balances?.length || 0) === 0) await fetchBalances();
    };
    syncData();
  }, [products?.length, balances?.length, fetchAllCatalogs, fetchBalances]);

  const { register, control, handleSubmit, watch, setValue } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: orderToEdit ? {
      dueDate: orderToEdit.due_date ? orderToEdit.due_date.substring(0, 10) : new Date().toISOString().split('T')[0],
      customerName: orderToEdit.customer_name || 'Consumidor Final',
      status: orderToEdit.status || 'PENDIENTE',
      businessUnit: orderToEdit.business_unit || 'ROJO_SHOWROOM',
      items: orderToEdit.items || [],
      totalAmount: Number(orderToEdit.total_amount || 0),
      advancePayment: Number(orderToEdit.advance_payment || 0)
    } : {
      dueDate: new Date().toISOString().split('T')[0],
      customerName: 'Consumidor Final',
      status: 'PENDIENTE',
      businessUnit: 'ROJO_SHOWROOM',
      items: [],
      totalAmount: 0,
      advancePayment: 0
    }
  });

  const { fields, append } = useFieldArray({ control, name: "items" });
  const watchItems = watch('items') || []; // 🛡️ Salvavidas: Siempre es un array

  // Sincronizar nombre de cliente al seleccionar de la lista
  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'CONSUMIDOR_FINAL') {
      const c = balances?.find((x) => x.id === selectedClientId);
      if (c) setValue('customerName', c.name);
    } else {
      setValue('customerName', 'Consumidor Final');
    }
  }, [selectedClientId, balances, setValue]);

  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    try {
      // 🧠 Auto-calcular estado basado en entregas
      let totalOrdered = 0;
      let totalDelivered = 0;

      data.items?.forEach((item) => {
        item.variations?.forEach((v) => {
          totalOrdered += (v.quantityOrdered || 0);
          totalDelivered += (v.quantityDelivered || 0);
        });
      });

      let newStatus = data.status;
      if (newStatus !== 'CANCELADO' && newStatus !== 'ENTREGADO' && totalOrdered > 0) {
        if (totalDelivered >= totalOrdered) newStatus = 'FINALIZADO';
        else if (totalDelivered > 0) newStatus = 'PARCIAL';
        else newStatus = 'PENDIENTE';
      }

      const payload = {
        company_id: useTenantStore.getState().activeCompanyId,
        due_date: data.dueDate,
        customer_name: data.customerName,
        status: newStatus,
        business_unit: data.businessUnit,
        total_amount: data.totalAmount,
        advance_payment: data.advancePayment,
        items: data.items,
        customer_id: selectedClientId === 'CONSUMIDOR_FINAL' ? null : selectedClientId
      };

      const { error } = await supabase
        .from('orders')
        .upsert(
          orderToEdit ? { id: orderToEdit.id, ...payload } : payload,
          { onConflict: 'id' }
        );

      if (error) throw error;

      Swal.fire({ icon: 'success', title: 'Pedido Guardado', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
      onSuccess();
    } catch (e: any) {
      Swal.fire('Error', e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProductClick = async () => {
    const productOptions = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    const { value: selectedId } = await Swal.fire({
      title: 'Añadir Prenda',
      html: `<select id="sw-prod-id" class="swal2-input !w-full !m-0 !rounded-xl dark:bg-slate-800 dark:text-white">
               <option value="" disabled selected>Elegir producto...</option>
               ${productOptions}
             </select>`,
      showCancelButton: true,
      preConfirm: () => (document.getElementById('sw-prod-id') as HTMLSelectElement).value
    });

    if (selectedId) {
      const p = products.find(x => x.id === selectedId);
      if(p) append({ id: crypto.randomUUID(), type: 'PRODUCT', productName: p.name, variations: [] });
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 flex justify-end">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto animate-in slide-in-from-right shadow-2xl flex flex-col">
          
          <header className="p-8 border-b dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 z-20">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">
              {orderToEdit ? '✏️ Editar Pedido' : '🆕 Nuevo Pedido'}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 font-black">✕</button>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <input type="date" {...register('dueDate')} className="p-4 rounded-2xl border dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold" />
              <select {...register('businessUnit')} className="p-4 rounded-2xl border dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold">
                <option value="ROJO_SHOWROOM">ROJO SHOWROOM</option>
                <option value="RAICES">RAÍCES</option>
              </select>
            </div>

            <select 
              value={selectedClientId} 
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full p-4 rounded-2xl border dark:border-slate-800 dark:bg-slate-950 dark:text-white font-bold"
            >
              <option value="CONSUMIDOR_FINAL">👤 CONSUMIDOR FINAL</option>
              {balances?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-4 bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl">
              <input type="number" {...register('totalAmount')} placeholder="Total $" className="p-4 rounded-2xl border dark:border-slate-800 dark:bg-slate-900 dark:text-white font-black" />
              <input type="number" {...register('advancePayment')} placeholder="Seña $" className="p-4 rounded-2xl border dark:border-slate-800 dark:bg-slate-900 dark:text-white font-black" />
            </div>

            <div className="pt-6 border-t dark:border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase text-slate-400">Items</h3>
                <button type="button" onClick={handleAddProductClick} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">+ Prenda</button>
              </div>

              <div className="space-y-4">
                {fields.map((f, i) => (
                  <div key={f.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-6 rounded-3xl relative">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase">{watchItems[i]?.productName}</h4>
                    <button type="button" onClick={() => setActiveMatrixIndex(i)} className="w-full mt-4 py-3 border-2 border-dashed dark:border-slate-700 rounded-2xl text-[10px] font-black text-slate-400 uppercase">
                      Configurar Matriz
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>

          <footer className="p-8 border-t dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
            <button type="submit" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest">
              {isSubmitting ? 'GUARDANDO...' : 'CONFIRMAR PEDIDO'}
            </button>
          </footer>
        </div>
      </div>

      {activeMatrixIndex !== null && (
        <OrderMatrixModal 
          product={products.find(p => p.name === watchItems[activeMatrixIndex]?.productName)!}
          currentVariations={watchItems[activeMatrixIndex]?.variations || []}
          onSave={(newVariations) => {
            setValue(`items.${activeMatrixIndex}.variations`, newVariations);
            setActiveMatrixIndex(null);
          }}
          onClose={() => setActiveMatrixIndex(null)}
          onRequestNewVariant={() => {}}
        />
      )}
    </>
  );
});

OrderForm.displayName = 'OrderForm';