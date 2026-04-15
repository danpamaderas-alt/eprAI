import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

interface OrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderForm = ({ onClose, onSuccess }: OrderFormProps) => {
  const { products, services, fetchAllCatalogs } = useCatalogStore();
  const { customers, fetchCustomers } = useCrmStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAllCatalogs();
    fetchCustomers();
  }, []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      clientId: '',
      clientName: '',
      status: 'PENDING',
      businessUnit: 'ROJO_SHOWROOM',
      items: [],
      notes: '',
      totalAmount: 0,
      advancePayment: 0
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const selectedClientId = watch('clientId');
  const watchItems = watch('items');

  // ✅ FIX: evitar recalcular cada render
  const clientMap = useMemo(() => {
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);

  useEffect(() => {
    if (!selectedClientId) return;

    if (selectedClientId === 'CONSUMIDOR_FINAL') {
      setValue('clientName', 'Consumidor Final');
      return;
    }

    const client = clientMap.get(selectedClientId);
    if (client) {
      setValue('clientName', client.name);
    }
  }, [selectedClientId, clientMap, setValue]);

  // ✅ UUID robusto
  const generateUUID = () => crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  // -------------------------
  // PRODUCTO
  // -------------------------
  const handleAddProductClick = async () => {
    if (products.length === 0) {
      Swal.fire('Atención', 'No hay productos cargados.', 'info');
      return;
    }

    const productOptions = products
      .map(p => `<option value="${p.id}">${p.name}</option>`)
      .join('');

    const { value } = await Swal.fire({
      title: 'Agregar Prenda',
      html: `<select id="swal-prod" class="swal2-input w-full">${productOptions}</select>`,
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      preConfirm: () =>
        (document.getElementById('swal-prod') as HTMLSelectElement)?.value
    });

    if (!value) return;

    const prod = products.find(p => p.id === value);
    if (!prod) return;

    append({
      id: generateUUID(),
      type: 'PRODUCT',
      productName: prod.name,
      sector: '',
      variations: []
    });
  };

  // -------------------------
  // SERVICIO
  // -------------------------
  const handleAddServiceClick = async () => {
    if (services.length === 0) {
      Swal.fire('Atención', 'No tienes servicios configurados.', 'info');
      return;
    }

    const options = services
      .map(s => `<option value="${s.id}" data-price="${s.price}">${s.name}</option>`)
      .join('');

    const { value } = await Swal.fire({
      title: 'Agregar Servicio',
      html: `
        <select id="srv" class="swal2-input">${options}</select>
        <input id="price" type="number" class="swal2-input" placeholder="Precio">
      `,
      showCancelButton: true,
      preConfirm: () => {
        const select = document.getElementById('srv') as HTMLSelectElement;
        const price = Number((document.getElementById('price') as HTMLInputElement).value);

        if (!select.value || !price || price <= 0) {
          Swal.showValidationMessage('Datos inválidos');
          return false;
        }

        return {
          name: select.options[select.selectedIndex].text,
          price
        };
      }
    });

    if (!value) return;

    append({
      id: generateUUID(),
      type: 'SERVICE',
      productName: `${value.name} ($${value.price})`,
      sector: '',
      variations: []
    });
  };

  // -------------------------
  // VARIACIONES
  // -------------------------
  const handleQuickAdd = async (index: number) => {
    const item = watchItems[index];
    if (!item || item.type === 'SERVICE') return;

    const { value } = await Swal.fire({
      title: item.productName,
      html: `
        <input id="size" class="swal2-input" placeholder="Talle">
        <input id="color" class="swal2-input" placeholder="Color">
        <input id="qty" type="number" class="swal2-input" placeholder="Cantidad">
      `,
      showCancelButton: true,
      preConfirm: () => {
        const size = (document.getElementById('size') as HTMLInputElement).value;
        const color = (document.getElementById('color') as HTMLInputElement).value;
        const qty = Number((document.getElementById('qty') as HTMLInputElement).value);

        if (!size || !color || qty <= 0) {
          Swal.showValidationMessage('Datos inválidos');
          return false;
        }

        return { size, color, quantityOrdered: qty, quantityDelivered: 0 };
      }
    });

    if (!value) return;

    const current = watchItems[index]?.variations || [];

    setValue(`items.${index}.variations`, [
      ...current,
      { id: generateUUID(), ...value }
    ]);
  };

  const removeVariation = (itemIndex: number, varIndex: number) => {
    const current = [...(watchItems[itemIndex]?.variations || [])];
    current.splice(varIndex, 1);
    setValue(`items.${itemIndex}.variations`, current);
  };

  // -------------------------
  // SUBMIT
  // -------------------------
  const onSubmit = async (data: OrderFormValues) => {
    if (data.items.length === 0) {
      Swal.fire('Error', 'El pedido está vacío.', 'error');
      return;
    }

    const invalid = data.items.some(
      i => i.type === 'PRODUCT' && (!i.variations || i.variations.length === 0)
    );

    if (invalid) {
      Swal.fire('Error', 'Faltan variantes en productos.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        date: data.date,
        client_id: data.clientId || null,
        client_name: data.clientName,
        status: data.status,
        business_unit: data.businessUnit,
        notes: data.notes,
        total_amount: Number(data.totalAmount || 0),
        advance_payment: Number(data.advancePayment || 0),
        items: data.items
      };

      const { error } = await supabase.from('orders').insert([payload]);
      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Pedido guardado',
        timer: 1500,
        showConfirmButton: false
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

          <input type="date" {...register('date')} />

          <Controller
            name="clientId"
            control={control}
            render={({ field }) => (
              <select {...field}>
                <option value="">Seleccionar</option>
                <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          />

          <button type="button" onClick={handleAddProductClick}>
            + Producto
          </button>

          <button type="button" onClick={handleAddServiceClick}>
            + Servicio
          </button>

          {fields.map((f, i) => (
            <div key={f.id}>
              <p>{watchItems[i]?.productName}</p>

              <button type="button" onClick={() => handleQuickAdd(i)}>
                + Variante
              </button>

              <button type="button" onClick={() => remove(i)}>
                Eliminar
              </button>
            </div>
          ))}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>

        </form>
      </div>
    </div>
  );
};