import { memo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';

interface OrderFormProps {
  onSubmitSuccess: (data: OrderFormValues) => void;
  onCancel: () => void;
}

export const OrderForm = ({ onSubmitSuccess, onCancel }: OrderFormProps) => {
  const { register, control, handleSubmit, formState: { errors } } = useForm<OrderFormValues>({
    // CRÍTICO: El doble cast (as unknown as Resolver) soluciona el error TS2719 de Cloudflare
    resolver: zodResolver(orderSchema) as unknown as Resolver<OrderFormValues>,
    defaultValues: {
      customerName: '',
      businessUnit: 'GENERAL',
      status: 'PENDING',
      dueDate: new Date().toISOString().split('T')[0],
      items: [{ 
        id: crypto.randomUUID(), // Agregado ID aquí
        productName: '', 
        variations: [{ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 }] 
      }],
      deliveryHistory: []
    }
  });

  const { fields: itemFields, append, remove } = useFieldArray({ control, name: "items" });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <header className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center sticky top-0 z-20">
        <h2 className="text-xl font-black uppercase italic">Hoja de Ruta / Pedido</h2>
        <button type="button" onClick={onCancel} className="hover:text-rose-500 transition-colors">✕</button>
      </header>

      <form onSubmit={handleSubmit(onSubmitSuccess)} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cliente</label>
            <input 
              {...register('customerName')}
              className={`w-full px-4 py-3 bg-slate-50 border ${errors.customerName ? 'border-rose-500' : 'border-slate-200'} rounded-xl outline-none font-bold`} 
            />
          </div>
          {/* ... otros campos generales ... */}
        </div>

        <div className="space-y-6">
          {itemFields.map((item, index) => (
            <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 relative">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full shadow-lg"
              >✕</button>
              
              <div className="space-y-1.5 mb-4">
                <label className="text-[9px] font-black text-blue-600 uppercase ml-1">Producto</label>
                <input 
                  {...register(`items.${index}.productName` as const)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black"
                />
              </div>

              <VariationFields nestIndex={index} control={control} register={register} />
            </div>
          ))}
        </div>

        <button 
          type="button"
          // CORRECCIÓN: Agregado id al objeto append para cumplir con OrderItem
          onClick={() => append({ 
            id: crypto.randomUUID(), 
            productName: '', 
            variations: [{ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 }] 
          })}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase text-[10px] hover:border-blue-500 transition-all"
        >
          + Agregar producto
        </button>

        <div className="flex justify-end gap-4 border-t pt-6">
          <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
            Confirmar Pedido
          </button>
        </div>
      </form>
    </div>
  );
};

const VariationFields = memo(({ nestIndex, control, register }: { nestIndex: number, control: any, register: any }) => {
  const { fields, append, remove } = useFieldArray({ control, name: `items.${nestIndex}.variations` });

  return (
    <div className="space-y-2 border-t border-slate-200 pt-4">
      {fields.map((variation, k) => (
        <div key={variation.id} className="grid grid-cols-4 gap-3">
          <input {...register(`items.${nestIndex}.variations.${k}.size` as const)} placeholder="Talle" className="px-3 py-2 bg-white border rounded-lg text-xs font-bold" />
          <input {...register(`items.${nestIndex}.variations.${k}.color` as const)} placeholder="Color" className="px-3 py-2 bg-white border rounded-lg text-xs font-bold" />
          <input type="number" {...register(`items.${nestIndex}.variations.${k}.quantityOrdered` as const, { valueAsNumber: true })} className="px-3 py-2 bg-white border rounded-lg text-xs font-black" />
          <button type="button" onClick={() => remove(k)} disabled={fields.length === 1} className="text-rose-500 text-[10px] font-bold uppercase">Borrar</button>
        </div>
      ))}
      <button type="button" onClick={() => append({ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 })} className="text-[9px] font-black text-blue-500 uppercase mt-2">
        + Añadir Talle/Color
      </button>
    </div>
  );
});