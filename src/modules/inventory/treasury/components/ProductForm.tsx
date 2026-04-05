import { useState, useEffect } from 'react';
import { useForm, type Resolver, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues } from '../schemas/productSchema';

interface ProductFormProps {
  onSubmitSuccess: (data: ProductFormValues) => void;
  onCancel: () => void;
}

// Constantes extraídas del ciclo de render
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICO'];
const COLORS = ['Blanco', 'Negro', 'Azul Marino', 'Rojo', 'Gris Melange', 'Verde', 'Beige'];

// OPTIMIZACIÓN: Diccionario O(1) para evitar ternarios anidados
const COLOR_HEX_MAP: Record<string, string> = {
  'Blanco': '#ffffff',
  'Negro': '#000000',
  'Azul Marino': '#0f172a',
  'Rojo': '#ef4444',
  'Gris Melange': '#94a3b8',
  'Verde': '#22c55e',
  'Beige': '#f5f5dc',
  '-': 'transparent'
};

export const ProductForm = ({ onSubmitSuccess, onCancel }: ProductFormProps) => {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [hasVariations, setHasVariations] = useState(false);

  const { register, control, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: { sku: '', name: '', category: '', price: 0, stock: 0, minStock: 5, variations: [] },
  });

  const { fields: variations, replace } = useFieldArray({
    control,
    name: 'variations'
  });

  // Generador de Combinaciones con Reconciliación Estricta
  useEffect(() => {
    if (!hasVariations) {
      replace([]);
      return;
    }
    
    const sizesToUse = selectedSizes.length > 0 ? selectedSizes : ['-'];
    const colorsToUse = selectedColors.length > 0 ? selectedColors : ['-'];

    if (selectedSizes.length > 0 || selectedColors.length > 0) {
      const currentVariations = getValues('variations') || [];
      const newCombinations = [];

      for (let i = 0; i < sizesToUse.length; i++) {
        for (let j = 0; j < colorsToUse.length; j++) {
          const s = sizesToUse[i];
          const c = colorsToUse[j];
          
          // CRÍTICO CORREGIDO: Buscar si la variante ya existe para no destruir su stock
          const existingNode = currentVariations.find(v => v.size === s && v.color === c);
          
          newCombinations.push(existingNode ? existingNode : {
            id: crypto.randomUUID(),
            size: s,
            color: c,
            stock: 0
          });
        }
      }
      replace(newCombinations);
    } else {
      replace([]);
    }
  }, [selectedSizes, selectedColors, hasVariations, replace, getValues]);

  const handleGenerateSKU = () => {
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    setValue('sku', `SKU-${randomChars}`, { shouldValidate: true, shouldDirty: true });
  };

  const toggleSelection = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitSuccess)} className="bg-white p-8 rounded-3xl w-full max-w-4xl mx-auto shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Artículo</h2>
           <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Carga de productos al catálogo general</p>
        </div>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-rose-500 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 rounded">
          <span className="text-xl" aria-hidden="true">✖</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <div className="flex justify-between items-end mb-1.5">
            <label htmlFor="input-sku" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Código SKU</label>
            <button type="button" onClick={handleGenerateSKU} className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-1 focus:outline-none">
              <span aria-hidden="true">⚡</span> Auto-Generar
            </button>
          </div>
          <input id="input-sku" {...register('sku')} className={`w-full px-4 py-3 bg-slate-50 border ${errors.sku ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 uppercase`} />
        </div>

        <div className="space-y-1">
          <label htmlFor="input-name" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Nombre del Producto</label>
          <input id="input-name" {...register('name')} className={`w-full px-4 py-3 bg-slate-50 border ${errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800`} />
        </div>

        <div className="space-y-1">
          <label htmlFor="select-category" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Categoría</label>
          <select id="select-category" {...register('category')} className={`w-full px-4 py-3 bg-slate-50 border ${errors.category ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800`}>
            <option value="">Seleccionar...</option>
            <option value="INDUMENTARIA">Indumentaria</option>
            <option value="UNIFORMES">Uniformes</option>
            <option value="ACCESORIOS">Accesorios</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="input-price" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Precio de Venta ($)</label>
          {/* CRÍTICO CORREGIDO: valueAsNumber obligatorio para evitar fallos de integridad relacional */}
          <input id="input-price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} className={`w-full px-4 py-3 bg-slate-50 border ${errors.price ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800`} />
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <input 
            type="checkbox" 
            id="hasVariations" 
            checked={hasVariations} 
            onChange={(e) => setHasVariations(e.target.checked)}
            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
          />
          <label htmlFor="hasVariations" className="text-sm font-black text-slate-800 uppercase tracking-widest cursor-pointer select-none">
            Este producto tiene Talles / Colores
          </label>
        </div>

        {!hasVariations ? (
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <label htmlFor="input-stock" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Inicial Total</label>
              <input id="input-stock" type="number" {...register('stock', { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
            </div>
             <div className="space-y-1">
              <label htmlFor="input-min-stock" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Crítico (Aviso)</label>
              <input id="input-min-stock" type="number" {...register('minStock', { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-t border-slate-200 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">1. Seleccionar Talles</span>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(size => (
                    <button
                      key={size} type="button"
                      onClick={() => toggleSelection(size, selectedSizes, setSelectedSizes)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedSizes.includes(size) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">2. Seleccionar Colores</span>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color} type="button"
                      onClick={() => toggleSelection(color, selectedColors, setSelectedColors)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border focus:outline-none focus:ring-2 focus:ring-slate-400 ${selectedColors.includes(color) ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {variations.length > 0 && (
              <div className="mt-6">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">3. Ingresar Stock por Variante</span>
                 <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                        <tr>
                          <th className="px-4 py-3">Talle</th>
                          <th className="px-4 py-3 border-l border-slate-200">Color</th>
                          <th className="px-4 py-3 border-l border-slate-200 w-32">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {variations.map((field, index) => (
                          <tr key={field.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2">{field.size}</td>
                            <td className="px-4 py-2 border-l border-slate-100 flex items-center gap-2">
                               {field.color !== '-' && (
                                  <span 
                                    className="w-3 h-3 rounded-full border border-slate-300 block shadow-inner" 
                                    style={{ backgroundColor: COLOR_HEX_MAP[field.color] || '#cbd5e1' }}
                                    aria-hidden="true"
                                  ></span>
                               )}
                               {field.color}
                            </td>
                            <td className="px-4 py-2 border-l border-slate-100 bg-blue-50/30">
                              <input
                                type="number"
                                aria-label={`Stock para ${field.size} ${field.color}`}
                                {...register(`variations.${index}.stock` as const, { valueAsNumber: true })}
                                className="w-full bg-transparent outline-none font-black text-blue-700 text-center"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              </div>
            )}
            
             <div className="w-full md:w-1/3 pt-4 border-t border-slate-200 mt-6">
              <label htmlFor="input-global-min-stock" className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Crítico (Aviso Global)</label>
              <input id="input-global-min-stock" type="number" {...register('minStock', { valueAsNumber: true })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 mt-6">
        <button type="button" onClick={onCancel} className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/30 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
          {isSubmitting ? 'Guardando...' : 'Guardar Artículo'}
        </button>
      </div>
    </form>
  );
};