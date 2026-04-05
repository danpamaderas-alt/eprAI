import { useState, useEffect } from 'react';
import { useForm, type Resolver, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues } from '../schemas/productSchema';

interface ProductFormProps {
  onSubmitSuccess: (data: ProductFormValues) => void;
  onCancel: () => void;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICO'];
const COLORS = ['Blanco', 'Negro', 'Azul Marino', 'Rojo', 'Gris Melange', 'Verde', 'Beige'];

export const ProductForm = ({ onSubmitSuccess, onCancel }: ProductFormProps) => {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [hasVariations, setHasVariations] = useState(false);

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: { sku: '', name: '', category: '', price: 0, stock: 0, minStock: 5, variations: [] },
  });

  const { fields: variations, replace } = useFieldArray({
    control,
    name: 'variations'
  });

  // Generador de Combinaciones: Si tildás "L" y "Rojo, Azul", arma "L-Rojo" y "L-Azul"
  useEffect(() => {
    if (!hasVariations) {
      replace([]);
      return;
    }
    
    const newCombinations = [];
    // Si no eligió nada, no arma nada. Si eligió uno solo (ej: solo talles), arma variantes sin color.
    const sizesToUse = selectedSizes.length > 0 ? selectedSizes : ['N/A'];
    const colorsToUse = selectedColors.length > 0 ? selectedColors : ['N/A'];

    if (selectedSizes.length > 0 || selectedColors.length > 0) {
        for (const size of sizesToUse) {
            for (const color of colorsToUse) {
                newCombinations.push({
                    id: crypto.randomUUID(),
                    size: size === 'N/A' ? '-' : size,
                    color: color === 'N/A' ? '-' : color,
                    stock: 0
                });
            }
        }
    }
    // Reemplaza la grilla de variantes con las nuevas combinaciones
    replace(newCombinations);
  }, [selectedSizes, selectedColors, hasVariations, replace]);


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
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-rose-500 transition-colors">
          <span className="text-xl">✖</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <div className="flex justify-between items-end mb-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Código SKU</label>
            <button type="button" onClick={handleGenerateSKU} className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-1">
              ⚡ Auto-Generar
            </button>
          </div>
          <input {...register('sku')} className={`w-full px-4 py-3 bg-slate-50 border ${errors.sku ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 uppercase`} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Nombre del Producto</label>
          <input {...register('name')} className={`w-full px-4 py-3 bg-slate-50 border ${errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800`} />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Categoría</label>
          <select {...register('category')} className={`w-full px-4 py-3 bg-slate-50 border ${errors.category ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800`}>
            <option value="">Seleccionar...</option>
            <option value="INDUMENTARIA">Indumentaria</option>
            <option value="UNIFORMES">Uniformes</option>
            <option value="ACCESORIOS">Accesorios</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Precio de Venta ($)</label>
          <input type="number" step="0.01" {...register('price')} className={`w-full px-4 py-3 bg-slate-50 border ${errors.price ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800`} />
        </div>
      </div>

      {/* SECCIÓN MAGICA: VARIANTES */}
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
          // SI NO TIENE VARIANTES, PIDE STOCK GENERAL
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Inicial Total</label>
              <input type="number" {...register('stock')} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
            </div>
             <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Crítico (Aviso)</label>
              <input type="number" {...register('minStock')} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
            </div>
          </div>
        ) : (
          // SI TIENE VARIANTES, MUESTRA LOS SELECTORES
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-t border-slate-200 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* SELECTOR DE TALLES */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">1. Seleccionar Talles</label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map(size => (
                    <button
                      key={size} type="button"
                      onClick={() => toggleSelection(size, selectedSizes, setSelectedSizes)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedSizes.includes(size) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* SELECTOR DE COLORES */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">2. Seleccionar Colores</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color} type="button"
                      onClick={() => toggleSelection(color, selectedColors, setSelectedColors)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedColors.includes(color) ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* GRILLA DE STOCK GENERADA */}
            {variations.length > 0 && (
              <div className="mt-6">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">3. Ingresar Stock por Variante</label>
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
                                  <span className="w-3 h-3 rounded-full border border-slate-300 block" style={{ backgroundColor: field.color === 'Blanco' ? '#fff' : field.color === 'Negro' ? '#000' : field.color === 'Azul Marino' ? '#0f172a' : field.color === 'Rojo' ? '#ef4444' : field.color === 'Verde' ? '#22c55e' : field.color === 'Beige' ? '#f5f5dc' : '#cbd5e1' }}></span>
                               )}
                               {field.color}
                            </td>
                            <td className="px-4 py-2 border-l border-slate-100 bg-blue-50/30">
                              <input
                                type="number"
                                {...register(`variations.${index}.stock` as const)}
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
            
            {/* Si activó variantes, le pedimos el stock crítico general */}
             <div className="w-1/3 pt-4 border-t border-slate-200 mt-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Crítico (Aviso Global)</label>
              <input type="number" {...register('minStock')} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 mt-6">
        <button type="button" onClick={onCancel} className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/30 transition-all active:scale-95">
          {isSubmitting ? 'Guardando...' : 'Guardar Artículo'}
        </button>
      </div>
    </form>
  );
};