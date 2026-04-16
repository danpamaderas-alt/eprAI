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
  orderToEdit?: any; // ✅ Recibe el pedido si vamos a editar
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderForm = ({ orderToEdit, onClose, onSuccess }: OrderFormProps) => {
  const { products, services, fetchAllCatalogs, addService } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    fetchAllCatalogs();
    fetchCustomers();
  }, [fetchAllCatalogs, fetchCustomers]);

  // ✅ PRECARGAMOS LOS DATOS SI ESTAMOS EDITANDO
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: orderToEdit ? {
      dueDate: orderToEdit.due_date,
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

  // Si editamos, tratamos de encontrar al cliente en el selector
  useEffect(() => {
    if (orderToEdit && customers.length > 0) {
      const matchedCustomer = customers.find((c: Customer) => c.name === orderToEdit.customer_name);
      if (matchedCustomer) setSelectedClientId(matchedCustomer.id);
    }
  }, [orderToEdit, customers]);

  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'CONSUMIDOR_FINAL') {
      const c = customers.find((x: Customer) => x.id === selectedClientId);
      if (c) setValue('customerName', c.name);
    } else {
      setValue('customerName', 'Consumidor Final');
    }
  }, [selectedClientId, customers, setValue]);

  const generateUUID = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };

  const handleAddProductClick = async () => {
    const productOptions = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    const { value: selectedProductId } = await Swal.fire({
      title: 'Agregar Prenda',
      html: `<select id="swal-prod" class="swal2-input w-full dark:bg-slate-800 dark:text-white dark:border-slate-700">${productOptions}</select>`,
      showCancelButton: true,
      confirmButtonText: 'Siguiente',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl' },
      preConfirm: () => (document.getElementById('swal-prod') as HTMLSelectElement).value
    });

    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        append({
          id: generateUUID(), 
          type: 'PRODUCT',
          productName: prod.name,
          variations: []
        });
      }
    }
  };

  const createServiceOnTheFly = async () => {
    const { value: newSrv } = await Swal.fire({
      title: 'Crear Servicio Nuevo',
      html: `
        <div class="text-left mt-2">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre (Ej: Matriz de Bordado)</label>
          <input id="new-srv-name" class="swal2-input w-full dark:bg-slate-800 dark:text-white mt-1">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1 mt-3 block">Precio a cobrar ($)</label>
          <input id="new-srv-price" type="number" class="swal2-input w-full dark:bg-slate-800 dark:text-white mt-1 font-black text-xl text-center" placeholder="0">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear y Agregar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl', confirmButton: 'bg-emerald-600' },
      preConfirm: () => {
        const name = (document.getElementById('new-srv-name') as HTMLInputElement).value;
        const price = (document.getElementById('new-srv-price') as HTMLInputElement).value;
        if(!name || price === '' || Number(price) <= 0) { Swal.showValidationMessage('Completa el nombre y pon un precio mayor a $0'); return false; }
        return { name, price: Number(price) };
      }
    });

    if (newSrv) {
      try {
        await addService({ name: newSrv.name, price: newSrv.price });
        append({ id: generateUUID(), type: 'SERVICE', productName: `${newSrv.name} ($${newSrv.price.toLocaleString('es-AR')})`, variations: [] });
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado a la comanda', timer: 1500, showConfirmButton: false });
      } catch (e) {
        Swal.fire('Error', 'No se pudo crear el servicio', 'error');
      }
    }
  };

  const handleAddServiceClick = async () => {
    if (services.length === 0) return createServiceOnTheFly();

    const serviceOptions = services.map(s => `<option value="${s.id}" data-price="${s.price}">${s.name}</option>`).join('');

    const { value: result } = await Swal.fire({
      title: 'Agregar Servicio',
      html: `
        <div class="text-left">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Seleccionar o Crear</label>
          <select id="swal-srv-id" class="swal2-input w-full dark:bg-slate-800 dark:text-white dark:border-slate-700 mt-1 mb-4" onchange="
            if(this.value === 'CREATE_NEW') { document.getElementById('swal-srv-price').value = ''; } 
            else { document.getElementById('swal-srv-price').value = this.options[this.selectedIndex].getAttribute('data-price') || ''; }
          ">
            <option value="" disabled selected>Elegir del catálogo...</option>
            <option value="CREATE_NEW" style="font-weight: 900; color: #10b981;">✨ + CREAR NUEVO AL VUELO</option>
            ${serviceOptions}
          </select>
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Precio a cobrar ($)</label>
          <input id="swal-srv-price" type="number" class="swal2-input w-full dark:bg-slate-800 dark:text-white dark:border-slate-700 mt-1 font-black text-xl text-center" placeholder="0">
        </div>
      `,
      showCancelButton: true, confirmButtonText: 'Siguiente', cancelButtonText: 'Cancelar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl', confirmButton: 'bg-emerald-600' },
      preConfirm: () => {
        const select = document.getElementById('swal-srv-id') as HTMLSelectElement;
        const srvId = select.value;
        const price = (document.getElementById('swal-srv-price') as HTMLInputElement).value;
        if (!srvId) { Swal.showValidationMessage('Selecciona una opción'); return false; }
        if (srvId !== 'CREATE_NEW' && (price === '' || Number(price) <= 0)) { Swal.showValidationMessage('Define un precio válido (mayor a $0)'); return false; }
        return { srvId, srvName: select.options[select.selectedIndex].text, price: Number(price) };
      }
    });

    if (result) {
      if (result.srvId === 'CREATE_NEW') createServiceOnTheFly();
      else append({ id: generateUUID(), type: 'SERVICE', productName: `${result.srvName} ($${result.price.toLocaleString('es-AR')})`, variations: [] });
    }
  };

  const handleQuickAdd = async (itemIndex: number) => {
    const item = watchItems[itemIndex];
    if (item.type === 'SERVICE') return; 

    const { value: formValues } = await Swal.fire({
      title: `Variante para ${item.productName}`,
      html: `
        <div class="flex gap-2">
          <input id="swal-size" class="swal2-input !w-1/2 uppercase" placeholder="Talle (Ej: XL)">
          <input id="swal-color" class="swal2-input !w-1/2 uppercase" placeholder="Color (Ej: Rojo)">
        </div>
        <input id="swal-qty" type="number" class="swal2-input mt-4" placeholder="Cantidad" min="1">
      `,
      focusConfirm: false, showCancelButton: true, confirmButtonText: 'Agregar',
      customClass: { popup: 'dark:bg-slate-900 rounded-3xl' },
      preConfirm: () => {
        const size = (document.getElementById('swal-size') as HTMLInputElement).value.toUpperCase();
        const color = (document.getElementById('swal-color') as HTMLInputElement).value.toUpperCase();
        const qty = (document.getElementById('swal-qty') as HTMLInputElement).value;
        if (!size || !color || !qty || Number(qty) <= 0) { Swal.showValidationMessage('Completá todos los campos'); return false; }
        return { size, color, quantityOrdered: Number(qty), quantityDelivered: 0 };
      }
    });

    if (formValues) {
      const currentVariations = watchItems[itemIndex].variations || [];
      setValue(`items.${itemIndex}.variations`, [...currentVariations, { id: generateUUID(), ...formValues }]);
    }
  };

  const removeVariation = (itemIndex: number, varIndex: number) => {
    const currentVariations = [...(watchItems[itemIndex].variations || [])];
    currentVariations.splice(varIndex, 1);
    setValue(`items.${itemIndex}.variations`, currentVariations);
  };

  // ✅ AQUÍ DECIDIMOS SI ACTUALIZAR O CREAR
  const onSubmit = async (data: OrderFormValues) => {
    if (data.items.length === 0) { Swal.fire('Error', 'El pedido debe tener al menos un ítem.', 'error'); return; }
    
    const invalidItems = data.items.filter(item => item.type === 'PRODUCT' && (!item.variations || item.variations.length === 0));
    if (invalidItems.length > 0) { Swal.fire('Atención', 'Agrega talles/colores a todas las prendas.', 'warning'); return; }

    setIsSubmitting(true);
    try {
      const companyId = useTenantStore.getState().activeCompanyId;

      const payload = {
        company_id: companyId,
        due_date: data.dueDate,
        customer_name: data.customerName,
        status: data.status,
        business_unit: data.businessUnit,
        total_amount: data.totalAmount, 
        advance_payment: data.advancePayment, 
        items: data.items.map(item => ({
          id: item.id, type: item.type, productName: item.productName, sector: item.sector || '', variations: item.variations || []
        }))
      };

      if (orderToEdit) {
        // ACTUALIZAR EXISTENTE
        const { error } = await supabase.from('orders').update(payload).eq('id', orderToEdit.id);
        if (error) throw error;
        Swal.fire({ icon: 'success', title: 'Remito Actualizado', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      } else {
        // CREAR NUEVO
        const { error } = await supabase.from('orders').insert([payload]);
        if (error) throw error;
        Swal.fire({ icon: 'success', title: 'Remito Guardado', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
      }
      
      if (typeof onSuccess === 'function') onSuccess();
      else if (typeof onClose === 'function') onClose();

    } catch (error: any) {
      console.error('Error de Supabase:', error);
      Swal.fire('Error de Guardado', error.message || 'Hubo un error en la base de datos', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-slate-50 dark:bg-slate-900 h-full overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8">
          
          <div className="flex justify-between items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
            {/* Título dinámico */}
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              {orderToEdit ? '✏️ Editar Hoja de Ruta' : 'Nueva Hoja de Ruta'}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 font-black">✕ CERRAR</button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Fecha Límite</label>
                <input type="date" {...register('dueDate')} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold outline-none" />
                {errors.dueDate && <p className="text-rose-500 text-xs mt-1">{errors.dueDate.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Unidad de Negocio</label>
                <select {...register('businessUnit')} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold outline-none">
                  <option value="ROJO_SHOWROOM">ROJO SHOWROOM</option>
                  <option value="RAICES">RAÍCES</option>
                  <option value="UNIFORMES">UNIFORMES</option>
                  <option value="RJ_CO">RJ&CO.</option>
                  <option value="BITA_IT">BITA IT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500">Cliente / Organismo</label>
              <select 
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold outline-none"
              >
                <option value="">Seleccionar Cliente...</option>
                <option value="CONSUMIDOR_FINAL">👤 CONSUMIDOR FINAL</option>
                {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="hidden" {...register('customerName')} />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Total Acordado ($)</label>
                <input type="number" {...register('totalAmount')} className="w-full p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-900 dark:text-white font-black outline-none tabular-nums" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Seña Entregada ($)</label>
                <input type="number" {...register('advancePayment')} className="w-full p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-900 dark:text-white font-black outline-none tabular-nums" placeholder="0" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Lista de Tareas</h3>
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddProductClick} className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-sm">+ PRENDA</button>
                  <button type="button" onClick={handleAddServiceClick} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-lg text-[10px] font-black uppercase shadow-sm">+ SERVICIO</button>
                </div>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => {
                  const item = watchItems[index];
                  const isService = item.type === 'SERVICE';

                  return (
                    <div key={field.id} className={`p-5 rounded-2xl border transition-colors ${isService ? 'bg-emerald-50/30 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className={`text-[9px] font-black px-2 py-0.5 rounded uppercase inline-block mb-1 tracking-widest ${isService ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                            {isService ? '🛠️ SERVICIO FIJO' : '🛍️ PRODUCTO'}
                          </div>
                          <p className="text-lg font-black text-slate-800 dark:text-white uppercase leading-tight">{item.productName}</p>
                        </div>
                        <button type="button" onClick={() => remove(index)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">✕</button>
                      </div>
                      {!isService && (
                        <input placeholder="Sector / Dependencia" value={item.sector || ''} onChange={(e) => setValue(`items.${index}.sector`, e.target.value)} className="w-full mb-4 p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white font-medium outline-none focus:border-blue-500" />
                      )}
                      {!isService && (
                        <div className="space-y-2 mb-4">
                          {item.variations?.map((v, vIndex) => (
                            <div key={v.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">TALLE {v.size} | {v.color}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg tabular-nums">{v.quantityOrdered} Un.</span>
                                <button type="button" onClick={() => removeVariation(index, vIndex)} className="text-rose-400 hover:text-rose-600 font-bold">Quitar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!isService && (
                        <button type="button" onClick={() => handleQuickAdd(index)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all">+ Agregar Talle y Cantidad</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botón Dinámico */}
            <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50">
              {isSubmitting ? 'GUARDANDO...' : (orderToEdit ? 'ACTUALIZAR HOJA DE RUTA' : 'CREAR HOJA DE RUTA')}
            </button>
            
          </div>
        </form>
      </div>
    </div>
  );
};