import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues } from '../schemas/productSchema';

interface ProductFormProps {
  onSubmitSuccess: (data: ProductFormValues) => void;
  onCancel: () => void;
}

export const ProductForm = ({ onSubmitSuccess, onCancel }: ProductFormProps) => {
  // 1. Configuración de Formulario con Blindaje Total
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting } 
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: { 
      sku: '', 
      name: '', 
      category: '', 
      price: 0, 
      stock: 0, 
      minStock: 5 
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Nuevo Artículo</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Carga de productos al catálogo general</p>
        </div>
        <button type="button" onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-colors">✕</button>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmitSuccess(data))} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SKU */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-blue-600">Código SKU</label>
            <input 
              type="text" 
              className={`w-full px-4 py-3 bg-slate-50 border ${errors.sku ? 'border-rose-500' : 'border-slate-200'} rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-slate-700 uppercase`}
              {...register('sku')} 
            />
            {errors.sku && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase italic">{errors.sku.message}</p>}
          </div>

          {/* NOMBRE */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Producto</label>
            <input 
              type="text" 
              className={`w-full px-4 py-3 bg-slate-50 border ${errors.name ? 'border-rose-500' : 'border-slate-200'} rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800`}
              {...register('name')} 
            />
            {errors.name && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase italic">{errors.name.message}</p>}
          </div>

          {/* CATEGORÍA */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría</label>
            <input 
              type="text" 
              className={`w-full px-4 py-3 bg-slate-50 border ${errors.category ? 'border-rose-500' : 'border-slate-200'} rounded-xl outline-none focus:border-blue-500 font-semibold text-slate-700`}
              {...register('category')} 
            />
          </div>

          {/* PRECIO - Con valueAsNumber para eliminar errores de tipo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Precio de Venta ($)</label>
            <input 
              type="number" 
              step="0.01"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-800"
              {...register('price', { valueAsNumber: true })} 
            />
          </div>

          {/* STOCK - Con valueAsNumber */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Stock Inicial</label>
            <input 
              type="number" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-800"
              {...register('stock', { valueAsNumber: true })} 
            />
          </div>

          {/* STOCK MÍNIMO - Con valueAsNumber */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-rose-500">Stock Crítico (Aviso)</label>
            <input 
              type="number" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-slate-800"
              {...register('minStock', { valueAsNumber: true })} 
            />
          </div>
        </div>

        <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl font-black text-[11px] text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors">Descartar</button>
          <button type="submit" disabled={isSubmitting} className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50">
            {isSubmitting ? 'Sincronizando...' : 'Guardar Artículo'}
          </button>
        </div>
      </form>
    </div>
  );
};