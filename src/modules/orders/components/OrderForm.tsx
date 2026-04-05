import { memo } from 'react'; // Eliminado useMemo (no se usaba)
import { useForm, useFieldArray } from 'react-hook-form';
// Importación de tipos corregida para cumplir con 'verbatimModuleSyntax'
import type { Control, UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';

interface OrderFormProps {
  onSubmitSuccess: (data: OrderFormValues) => void;
  onCancel: () => void;
}

export const OrderForm = ({ onSubmitSuccess, onCancel }: OrderFormProps) => {
  const { register, control, handleSubmit, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '',
      businessUnit: 'GENERAL',
      status: 'PENDING',
      dueDate: new Date().toISOString().split('T')[0],
      items: [{ 
        productName: '', 
        // Agregado ID inicial para evitar errores de tipo
        variations: [{ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 }] 
      }]
    }
  });

  const { fields: itemFields, append, remove } = useFieldArray({ control, name: "items" });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <header className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center sticky top-0 z-20">
        <h2 className="text-xl font-black uppercase italic">Hoja de Ruta / Pedido</h2>
        <button type="button" onClick={onCancel} className="hover:text-rose-500 transition-colors" aria-label="Cerrar">✕</button>
      </header>

      <form onSubmit={handleSubmit(onSubmitSuccess)} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label htmlFor="customer-name" className="text-[10px] font-black text-slate-500 uppercase ml-1">Cliente</label>
            <input 
              id="customer-name"
              {...register('customerName')}
              className={`w-full px-4 py-3 bg-slate-50 border ${errors.customerName ? 'border-rose-500' : 'border-slate-200'} rounded-xl outline-none focus:border-blue-500 font-bold`} 
            />
            {errors.customerName && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.customerName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bu-select" className="text-[10px] font-black text-slate-500 uppercase ml-1">Unidad de Negocio</label>
            <select id="bu-select" {...register('businessUnit')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none">
              <option value="UNIFORMES">👕 UNIFORMES</option>
              <option value="ROJO_SHOWROOM">👗 ROJO SHOWROOM</option>
              <option value="RAICES">🌱 RAÍCES</option>
              <option value="RJ_CO">💼 RJ & CO.</option>
              <option value="BITA_IT">💻 BITA IT</option>
              <option value="GENERAL">🏠 GENERAL</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="due-date" className="text-[10px] font-black text-slate-500 uppercase ml-1">Fecha de Entrega</label>
            <input 
              id="due-date"
              type="date" 
              {...register('dueDate')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">📦 Productos</h3>
          {itemFields.map((item, index) => (
            <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 relative">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
              >✕</button>
              
              <div className="space-y-1.5 mb-4">
                <label className="text-[9px] font-black text-blue-600 uppercase ml-1">Producto</label>
                <input 
                  {...register(`items.${index}.productName` as const)}
                  placeholder="Nombre del producto"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black outline-none focus:border-blue-500"
                />
              </div>

              <VariationFields nestIndex={index} control={control} register={register} />
            </div>
          ))}
        </div>

        <button 
          type="button"
          // CORRECCIÓN: Agregado el campo 'id' que pide el esquema
          onClick={() => append({ productName: '', variations: [{ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 }] })}
          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black uppercase text-[10px] hover:border-blue-500 hover:text-blue-500 transition-all"
        >
          + Agregar otro producto al pedido
        </button>

        <div className="flex justify-end gap-4 border-t pt-6">
          <button type="button" onClick={onCancel} className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
          <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
            Confirmar Pedido
          </button>
        </div>
      </form>
    </div>
  );
};

// Sub-componente memoizado con tipado estricto
const VariationFields = memo(({ nestIndex, control, register }: { nestIndex: number, control: Control<OrderFormValues>, register: UseFormRegister<OrderFormValues> }) => {
  const { fields, append, remove } = useFieldArray({ control, name: `items.${nestIndex}.variations` });

  return (
    <div className="space-y-2 border-t border-slate-200 pt-4">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Variantes (Talles / Colores)</p>
      {fields.map((variation, k) => (
        <div key={variation.id} className="grid grid-cols-4 gap-3">
          <input {...register(`items.${nestIndex}.variations.${k}.size` as const)} placeholder="Talle" className="px-3 py-2 bg-white border rounded-lg text-xs font-bold outline-none" />
          <input {...register(`items.${nestIndex}.variations.${k}.color` as const)} placeholder="Color" className="px-3 py-2 bg-white border rounded-lg text-xs font-bold outline-none" />
          <input type="number" {...register(`items.${nestIndex}.variations.${k}.quantityOrdered` as const, { valueAsNumber: true })} placeholder="Cant." className="px-3 py-2 bg-white border rounded-lg text-xs font-black outline-none" />
          <button 
            type="button" 
            onClick={() => remove(k)} 
            disabled={fields.length === 1} 
            className="text-rose-500 text-[10px] font-bold uppercase hover:underline disabled:opacity-30"
          >
            Borrar
          </button>
        </div>
      ))}
      <button 
        type="button" 
        // CORRECCIÓN: Agregado 'id' con crypto.randomUUID()
        onClick={() => append({ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 })} 
        className="text-[9px] font-black text-blue-500 uppercase mt-2 hover:underline"
      >
        + Añadir Talle/Color
      </button>
    </div>
  );
});