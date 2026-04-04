import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, type OrderFormValues } from '../schemas/orderSchema';

interface OrderFormProps {
  onSubmitSuccess: (data: OrderFormValues) => void;
  onCancel: () => void;
}

export const OrderForm = ({ onSubmitSuccess, onCancel }: OrderFormProps) => {
  // Configuración del formulario con soporte para arreglos (items y variations)
  const { register, control, handleSubmit, formState: { errors } } = useForm<OrderFormValues>({
    // @ts-ignore
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '',
      businessUnit: 'GENERAL',
      status: 'PENDING',
      dueDate: new Date().toISOString().split('T')[0],
      items: [{ 
        id: crypto.randomUUID(), 
        productName: '', 
        variations: [{ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 }] 
      }]
    }
  });

  // Control dinámico de Productos
  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: "items"
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Nuevo Pedido / Hoja de Ruta</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Define productos, talles y cantidades</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">✕</button>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmitSuccess(data as unknown as OrderFormValues))} className="p-8 space-y-8">
        
        {/* SECCIÓN 1: DATOS GENERALES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente</label>
            <input 
              {...register('customerName')}
              placeholder="Nombre del cliente o empresa"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800"
            />
            {errors.customerName && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.customerName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad de Negocio</label>
            <select {...register('businessUnit')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none">
              <option value="UNIFORMES">👕 UNIFORMES</option>
              <option value="ROJO_SHOWROOM">👗 ROJO SHOWROOM</option>
              <option value="RAICES">🌱 RAÍCES</option>
              <option value="RJ_CO">💼 RJ & CO.</option>
              <option value="BITA_IT">💻 BITA IT</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Entrega</label>
            <input 
              type="date" 
              {...register('dueDate')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
            📦 Desglose de Productos
          </h3>

          <div className="space-y-8">
            {itemFields.map((item, itemIndex) => (
              <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 relative">
                <button 
                  type="button" 
                  onClick={() => removeItem(itemIndex)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-rose-600 transition-colors"
                >✕</button>

                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Nombre del Producto</label>
                    <input 
                      {...register(`items.${itemIndex}.productName` as const)}
                      placeholder="Ej: Chombas de Piqué"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-800"
                    />
                  </div>
                </div>

                {/* VARIANTES (Talles y Colores) */}
                <div className="space-y-3">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Variantes (Talles / Colores)</p>
                   {/* Nota: Para simplificar, usamos un mapeo manual de variaciones aquí */}
                   <VariationFields nestIndex={itemIndex} control={control} register={register} />
                </div>
              </div>
            ))}

            <button 
              type="button"
              onClick={() => appendItem({ id: crypto.randomUUID(), productName: '', variations: [{ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 }] })}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:border-blue-500 hover:text-blue-500 transition-all"
            >
              + Agregar otro producto al pedido
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancelar</button>
          <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all">
            Crear Pedido y Hoja de Ruta
          </button>
        </div>
      </form>
    </div>
  );
};

// Sub-componente para manejar las variantes dentro de cada producto
const VariationFields = ({ nestIndex, control, register }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${nestIndex}.variations`
  });

  return (
    <div className="space-y-2">
      {fields.map((variation, k) => (
        <div key={variation.id} className="grid grid-cols-4 gap-3">
          <input 
            {...register(`items.${nestIndex}.variations.${k}.size` as const)} 
            placeholder="Talle (L, XL...)"
            className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
          />
          <input 
            {...register(`items.${nestIndex}.variations.${k}.color` as const)} 
            placeholder="Color"
            className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500"
          />
          <input 
            type="number"
            {...register(`items.${nestIndex}.variations.${k}.quantityOrdered` as const, { valueAsNumber: true })} 
            placeholder="Cant."
            className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black outline-none focus:border-blue-500"
          />
          <button 
            type="button" 
            onClick={() => remove(k)}
            disabled={fields.length === 1}
            className="col-span-1 text-slate-300 hover:text-rose-500 transition-colors text-xs font-bold uppercase"
          >Borrar</button>
        </div>
      ))}
      <button 
        type="button" 
        onClick={() => append({ id: crypto.randomUUID(), size: '', color: '', quantityOrdered: 1, quantityDelivered: 0 })}
        className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-2 hover:underline"
      >+ Añadir Talle/Color</button>
    </div>
  );
};