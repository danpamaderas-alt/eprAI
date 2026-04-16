import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues } from '../schemas/productSchema';

interface ProductFormProps { initialData?: ProductFormValues; onSubmitSuccess: (data: ProductFormValues) => void; onCancel: () => void; }

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ÚNICO'];
const DEFAULT_COLORS = ['Blanco', 'Negro', 'Azul Marino', 'Rojo', 'Gris Melange', 'Verde', 'Beige'];
const DEFAULT_CATS = ['INDUMENTARIA', 'UNIFORMES', 'ACCESORIOS'];

export const ProductForm = ({ initialData, onSubmitSuccess, onCancel }: ProductFormProps) => {
  const [availableSizes, setAvailableSizes] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('sizes') || 'null') || DEFAULT_SIZES; } catch { return DEFAULT_SIZES; } });
  const [availableColors, setAvailableColors] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('colors') || 'null') || DEFAULT_COLORS; } catch { return DEFAULT_COLORS; } });
  const [availableCats, setAvailableCats] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('cats') || 'null') || DEFAULT_CATS; } catch { return DEFAULT_CATS; } });

  const [newSize, setNewSize] = useState(''); const [newColor, setNewColor] = useState(''); const [newCat, setNewCat] = useState('');
  
  const [hasVariations, setHasVariations] = useState(!!initialData?.variations?.length);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initialData?.variations ? [...new Set(initialData.variations.map((v)=>v.size))] as string[] : []);
  const [selectedColors, setSelectedColors] = useState<string[]>(initialData?.variations ? [...new Set(initialData.variations.map((v)=>v.color))] as string[] : []);

  const { register, control, handleSubmit, setValue, getValues, formState: { isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || { sku: '', name: '', category: '', price: 0, cost: 0, notes: '', location: '', stock: 0, minStock: 5, variations: [] }
  });

  const currentCat = useWatch({ control, name: 'category' });
  const { fields, replace } = useFieldArray({ control, name: 'variations' });

  useEffect(() => {
    if (!hasVariations) { replace([]); return; }
    if (selectedSizes.length > 0 || selectedColors.length > 0) {
      const current = getValues('variations') || [];
      const sizesToUse = selectedSizes.length ? selectedSizes : ['-'];
      const colorsToUse = selectedColors.length ? selectedColors : ['-'];
      const newVariations = [];
      for (const s of sizesToUse) {
        for (const c of colorsToUse) {
          const existing = current.find(v => v.size === s && v.color === c);
          newVariations.push(existing || { id: crypto.randomUUID(), size: s, color: c, stock: 0 });
        }
      }
      replace(newVariations);
    }
  }, [selectedSizes, selectedColors, hasVariations, replace, getValues]);

  const handleAddCat = () => { if(newCat && !availableCats.includes(newCat.toUpperCase())){ const updated = [...availableCats, newCat.toUpperCase()]; setAvailableCats(updated); localStorage.setItem('cats', JSON.stringify(updated)); setValue('category', newCat.toUpperCase()); setNewCat(''); }};
  const handleAddSize = () => { if(newSize && !availableSizes.includes(newSize.toUpperCase())){ const updated = [...availableSizes, newSize.toUpperCase()]; setAvailableSizes(updated); localStorage.setItem('sizes', JSON.stringify(updated)); setSelectedSizes(p=>[...p, newSize.toUpperCase()]); setNewSize(''); }};
  const handleAddColor = () => { if(newColor && !availableColors.includes(newColor)){ const updated = [...availableColors, newColor]; setAvailableColors(updated); localStorage.setItem('colors', JSON.stringify(updated)); setSelectedColors(p=>[...p, newColor]); setNewColor(''); }};

  return (
    <form onSubmit={handleSubmit(onSubmitSuccess)} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border dark:border-slate-700 shadow-xl space-y-6 mb-8">
      <div className="flex justify-between border-b dark:border-slate-700 pb-4">
        <div>
          <h2 className="text-2xl font-black dark:text-white tracking-tight">{initialData ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
          <p className="text-xs font-bold text-slate-500 uppercase">{initialData ? 'Modificando catálogo' : 'Ingreso de mercadería'}</p>
        </div>
        <button type="button" onClick={onCancel} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-rose-500 font-bold">✕</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">SKU</label>
          <div className="flex gap-2">
            <input {...register('sku')} className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 dark:text-white uppercase" />
            <button type="button" onClick={()=>setValue('sku', `SKU-${Math.random().toString(36).substring(2,8).toUpperCase()}`)} className="px-3 bg-blue-100 text-blue-600 rounded-xl text-xs font-bold">⚡</button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Nombre</label>
          <input {...register('name')} className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 dark:text-white" />
        </div>

        <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border dark:border-slate-700">
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Categoría</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {availableCats.map(c => <button type="button" key={c} onClick={()=>setValue('category', c)} className={`px-3 py-1 text-xs font-bold rounded-lg ${currentCat === c ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border dark:text-slate-300'}`}>{c}</button>)}
          </div>
          <div className="flex gap-2"><input value={newCat} onChange={e=>setNewCat(e.target.value)} className="px-3 py-1 rounded-lg border dark:bg-slate-900 dark:text-white text-xs" placeholder="Nueva categoría"/><button type="button" onClick={handleAddCat} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold dark:text-white">+</button></div>
        </div>

        <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Costo ($)</label><input type="number" {...register('cost',{valueAsNumber:true})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 text-rose-500 font-bold" /></div>
        <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Precio ($)</label><input type="number" {...register('price',{valueAsNumber:true})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 text-emerald-500 font-bold" /></div>
        <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">📍 Ubicación / Estante</label><input {...register('location')} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 dark:text-blue-400 font-bold" /></div>
        <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Notas</label><input {...register('notes')} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 dark:text-white" /></div>
      </div>

      <div className="border-t dark:border-slate-700 pt-6">
        <div className="flex items-center gap-2 mb-4"><input type="checkbox" checked={hasVariations} onChange={e=>setHasVariations(e.target.checked)} className="w-4 h-4"/><label className="text-sm font-black dark:text-white uppercase tracking-widest">Gestionar Stock por Talles y Colores</label></div>
        
        {!hasVariations ? (
          <div className="flex gap-4">
            <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Stock</label><input type="number" {...register('stock',{valueAsNumber:true})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 dark:text-white" /></div>
            <div className="flex-1"><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Mínimo (Alerta)</label><input type="number" {...register('minStock',{valueAsNumber:true})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 dark:text-white" /></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">1. Talles</label>
                <div className="flex flex-wrap gap-2 mb-2">{availableSizes.map(s=><button type="button" key={s} onClick={()=>setSelectedSizes(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])} className={`px-2 py-1 text-xs font-bold rounded ${selectedSizes.includes(s)?'bg-blue-600 text-white':'bg-slate-100 dark:bg-slate-800 dark:text-white'}`}>{s}</button>)}</div>
                <div className="flex gap-2"><input value={newSize} onChange={e=>setNewSize(e.target.value)} className="w-20 px-2 border rounded text-xs dark:bg-slate-900 dark:text-white"/><button type="button" onClick={handleAddSize} className="px-2 bg-slate-200 dark:bg-slate-700 rounded font-bold dark:text-white">+</button></div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">2. Colores</label>
                <div className="flex flex-wrap gap-2 mb-2">{availableColors.map(c=><button type="button" key={c} onClick={()=>setSelectedColors(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])} className={`px-2 py-1 text-xs font-bold rounded ${selectedColors.includes(c)?'bg-slate-800 text-white':'bg-slate-100 dark:bg-slate-800 dark:text-white'}`}>{c}</button>)}</div>
                <div className="flex gap-2"><input value={newColor} onChange={e=>setNewColor(e.target.value)} className="w-24 px-2 border rounded text-xs dark:bg-slate-900 dark:text-white"/><button type="button" onClick={handleAddColor} className="px-2 bg-slate-200 dark:bg-slate-700 rounded font-bold dark:text-white">+</button></div>
              </div>
            </div>
            
            {fields.length > 0 && (
              <div className="mt-4 border dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-black text-slate-500"><tr><th className="p-2">Talle | Color</th><th className="p-2 w-24">Cantidad</th></tr></thead>
                <tbody className="divide-y dark:divide-slate-700 font-bold dark:text-white">
                  {fields.map((f, i) => (
                    <tr key={f.id}><td className="p-2">{f.size} | {f.color}</td><td className="p-2 bg-blue-50 dark:bg-blue-900/20"><input type="number" {...register(`variations.${i}.stock` as const, {valueAsNumber:true})} className="w-full bg-transparent text-center font-black text-blue-600 dark:text-blue-400 outline-none"/></td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
            <div className="w-1/3 pt-2"><label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Mínimo Global (Alerta)</label><input type="number" {...register('minStock',{valueAsNumber:true})} className="w-full px-4 py-2 rounded-xl border dark:bg-slate-900 dark:text-white font-bold" /></div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-700">
        <button type="button" onClick={onCancel} className="px-6 py-2 text-xs font-black text-slate-500 uppercase">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-500/30 active:scale-95">{isSubmitting ? 'Guardando...' : (initialData ? 'Guardar Cambios' : 'Guardar Artículo')}</button>
      </div>
    </form>
  );
};