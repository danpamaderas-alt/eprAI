import { memo, useState } from 'react';
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
    resolver: zodResolver(orderSchema) as unknown as Resolver<OrderFormValues>,
    defaultValues: {
      customerName: '',
      businessUnit: 'GENERAL',
      status: 'PENDING',
      dueDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      advancePayment: 0,
      items: [{ 
        id: crypto.randomUUID(),
        productName: '', 
        variations: [] 
      }],
      deliveryHistory: []
    }
  });

  const { fields: itemFields, append, remove } = useFieldArray({ control, name: "items" });

  const inputClass = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white transition-colors focus:border-blue-500 dark:focus:border-blue-500";
  const labelClass = "text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1 transition-colors";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300">
      <header className="bg-slate-900 dark:bg-slate-950 px-6 sm:px-8 py-5 sm:py-6 text-white flex justify-between items-center sticky top-0 z-20 border-b border-slate-800">
        <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-wide">Hoja de Ruta / Pedido</h2>
        <button type="button" onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-rose-500 hover:text-white transition-colors font-bold">✕</button>
      </header>

      <form onSubmit={handleSubmit(onSubmitSuccess)} className="p-4 sm:p-8 space-y-8">
        
        {/* FILA SUPERIOR: Cliente, Total y Seña */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className={labelClass}>Cliente / Destinatario</label>
            <input 
              {...register('customerName')}
              className={`${inputClass} ${errors.customerName ? 'border-rose-500 dark:border-rose-500' : ''}`} 
              placeholder="Ej: Registro Provincial..."
            />
          </div>
          
          <div className="space-y-1.5">
            <label className={labelClass}>Total Pedido ($)</label>
            <input 
              type="number"
              {...register('totalAmount', { valueAsNumber: true })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-black text-blue-600 dark:text-blue-400 transition-colors focus:border-blue-500" 
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Seña / Adelanto ($)</label>
            <input 
              type="number"
              {...register('advancePayment', { valueAsNumber: true })}
              className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl outline-none font-black text-emerald-600 dark:text-emerald-400 transition-colors focus:border-emerald-500" 
            />
          </div>
        </div>

        {/* LISTA DE ARTÍCULOS */}
        <div className="space-y-6">
          {itemFields.map((item, index) => (
            <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 relative shadow-sm transition-colors">
              <button 
                type="button" 
                onClick={() => remove(index)}
                className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-rose-500 text-white rounded-full shadow-lg font-bold hover:scale-110 transition-transform"
              >✕</button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase ml-1 transition-colors">Sector / Rubro</label>
                  <input 
                    {...register(`items.${index}.sector` as any)}
                    placeholder="Ej: Indumentaria, Merchandising..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-black shadow-inner transition-colors focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase ml-1 transition-colors">Nombre del Producto / Artículo</label>
                  <input 
                    {...register(`items.${index}.productName` as const)}
                    placeholder="Ej: Remera Lisa Algodón..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-black shadow-inner transition-colors focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <VariationFields nestIndex={index} control={control} register={register} />
            </div>
          ))}
        </div>

        <button 
          type="button"
          onClick={() => append({ 
            id: crypto.randomUUID(), 
            productName: '', 
            variations: [] 
          })}
          className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          + Agregar otro artículo al pedido
        </button>

        <div className="flex justify-end gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
          <button type="submit" className="w-full sm:w-auto px-12 py-4 bg-blue-600 hover:bg-blue-500 transition-colors text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">
            Confirmar Pedido
          </button>
        </div>
      </form>
    </div>
  );
};

// COMPONENTE SECUNDARIO PARA TALLES Y COLORES
const VariationFields = memo(({ nestIndex, control, register }: { nestIndex: number, control: any, register: any }) => {
  const { fields, append, remove } = useFieldArray({ control, name: `items.${nestIndex}.variations` });

  const [quickColor, setQuickColor] = useState('');
  const [quickSizes, setQuickSizes] = useState<Record<string, number>>({});
  const [customSize, setCustomSize] = useState('');
  
  const [savedColors, setSavedColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('epr_saved_colors');
      return saved ? JSON.parse(saved) : ['Negro', 'Blanco', 'Azul Marino', 'Gris Melange', 'Rojo'];
    } catch {
      return ['Negro', 'Blanco', 'Azul Marino', 'Gris Melange', 'Rojo'];
    }
  });

  const handleSizeChange = (size: string, qty: number) => {
    setQuickSizes(prev => ({ ...prev, [size]: qty }));
  };

  const handleAddBulk = () => {
    if (!quickColor.trim()) return alert('Por favor, seleccioná o escribí un Color primero.');
    
    const sizesToAdd = Object.entries(quickSizes).filter(([_, qty]) => qty > 0);
    if (sizesToAdd.length === 0) return alert('Ingresá al menos una cantidad en algún talle.');

    sizesToAdd.forEach(([size, qty]) => {
      append({ id: crypto.randomUUID(), size, color: quickColor.trim(), quantityOrdered: qty, quantityDelivered: 0 });
    });

    if (!savedColors.includes(quickColor.trim())) {
      const newColors = [...savedColors, quickColor.trim()];
      setSavedColors(newColors);
      localStorage.setItem('epr_saved_colors', JSON.stringify(newColors));
    }

    setQuickSizes({});
    setCustomSize('');
  };

  const defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Único'];

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-5 mt-5 transition-colors">
      
      <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 sm:p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 transition-colors">
        <h4 className="text-[10px] font-black text-blue-800 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          ⚡ Carga Rápida de Curva (Talles y Colores)
        </h4>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-2 block transition-colors">1. Seleccionar Color</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {savedColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setQuickColor(c)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    quickColor === c 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:block">Otro color:</span>
              <input
                value={quickColor}
                onChange={(e) => setQuickColor(e.target.value)}
                placeholder="Escribí un color nuevo..."
                className="w-full md:w-1/2 px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold shadow-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-2 block transition-colors">2. Indicar cantidades por Talle</label>
            <div className="flex flex-wrap gap-2">
              {defaultSizes.map(size => (
                <div key={size} className="flex items-center gap-1 bg-white dark:bg-slate-800 pl-3 pr-1.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl shadow-sm hover:border-blue-300 transition-colors">
                  <span className="w-6 text-xs font-black text-slate-700 dark:text-slate-300">{size}</span>
                  <input
                    type="number"
                    min="0"
                    value={quickSizes[size] || ''}
                    onChange={(e) => handleSizeChange(size, parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-12 px-1 py-1 text-center bg-slate-50 dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-700 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>
              ))}
              
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 pl-2 pr-1.5 py-1.5 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl transition-colors">
                 <input
                   type="text"
                   placeholder="Otro..."
                   value={customSize}
                   onChange={(e) => setCustomSize(e.target.value)}
                   className="w-14 text-xs font-black text-center border-none outline-none text-slate-600 dark:text-slate-300 bg-transparent"
                 />
                 <input
                    type="number"
                    min="0"
                    value={customSize ? (quickSizes[customSize] || '') : ''}
                    onChange={(e) => handleSizeChange(customSize, parseInt(e.target.value) || 0)}
                    placeholder="0"
                    disabled={!customSize}
                    className="w-12 px-1 py-1 text-center bg-slate-50 dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-slate-700 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddBulk}
            className="w-full md:w-auto bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            + Agregar a la lista del pedido
          </button>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Detalle a guardar</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {fields.map((variation, k) => (
              <div key={variation.id} className="flex flex-wrap sm:grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm transition-colors">
                <div className="flex flex-col flex-1 min-w-[100px]">
                  <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Color</span>
                  <input {...register(`items.${nestIndex}.variations.${k}.color` as const)} className="px-2 py-1 bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-full" />
                </div>
                <div className="flex flex-col flex-1 min-w-[80px] sm:border-l sm:border-slate-100 dark:sm:border-slate-600 sm:pl-3">
                  <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Talle</span>
                  <input {...register(`items.${nestIndex}.variations.${k}.size` as const)} className="px-2 py-1 bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none w-full" />
                </div>
                <div className="flex flex-col sm:border-l sm:border-slate-100 dark:sm:border-slate-600 sm:pl-3">
                  <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Cant.</span>
                  <input type="number" {...register(`items.${nestIndex}.variations.${k}.quantityOrdered` as const, { valueAsNumber: true })} className="w-16 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded text-xs font-black text-blue-600 dark:text-blue-400 outline-none text-center" />
                </div>
                <button type="button" onClick={() => remove(k)} className="w-8 h-8 flex items-center justify-center bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-500 hover:text-white transition-colors ml-auto sm:ml-2">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});