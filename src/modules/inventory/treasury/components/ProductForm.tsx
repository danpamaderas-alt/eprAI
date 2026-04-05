import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues } from '../schemas/productSchema';

interface ProductFormProps {
  onSubmitSuccess: (data: ProductFormValues) => void;
  onCancel: () => void;
}

export const ProductForm = ({ onSubmitSuccess, onCancel }: ProductFormProps) => {
  // 1. Configuración de Formulario con Blindaje Total
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
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

  // 2. Generador automático de SKU (El Rayo)
  const handleGenerateSKU = () => {
    // Genera 6 caracteres aleatorios en mayúsculas (ej: 8F3A2B)
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newSKU = `SKU-${randomChars}`;
    
    // Lo inyecta en el campo 'sku' y le avisa al formulario que el campo ya es válido
    setValue('sku', newSKU, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitSuccess)} className="bg-white p-8 rounded-3xl w-full max-w-2xl mx-auto shadow-2xl space-y-6">
      
      {/* CABECERA DEL FORMULARIO */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Producto</h2>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-rose-500 transition-colors">
          <span className="text-xl">✖</span>
        </button>
      </div>

      {/* GRILLA DE CAMPOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SKU CON BOTÓN GENERADOR */}
        <div className="space-y-1">
          <div className="flex justify-between items-end mb-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Código SKU</label>
            <button
              type="button"
              onClick={handleGenerateSKU}
              className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-1"
            >
              ⚡ Auto-Generar
            </button>
          </div>
          <input
            {...register('sku')}
            placeholder="Ej: REM-AZ-L"
            className={`w-full px-4 py-3 bg-slate-50 border ${errors.sku ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 transition-colors uppercase`}
          />
          {errors.sku && <p className="text-xs text-red-500 ml-1 font-bold">{errors.sku.message}</p>}
        </div>

        {/* NOMBRE */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Nombre del Producto</label>
          <input
            {...register('name')}
            placeholder="Ej: Chomba Piqué Azul"
            className={`w-full px-4 py-3 bg-slate-50 border ${errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 transition-colors`}
          />
          {errors.name && <p className="text-xs text-red-500 ml-1 font-bold">{errors.name.message}</p>}
        </div>

        {/* CATEGORÍA */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Categoría</label>
          <select
            {...register('category')}
            className={`w-full px-4 py-3 bg-slate-50 border ${errors.category ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 transition-colors cursor-pointer`}
          >
            <option value="">Seleccionar...</option>
            <option value="UNIFORMES">Uniformes</option>
            <option value="SHOWROOM">Showroom</option>
            <option value="ACCESORIOS">Accesorios</option>
          </select>
          {errors.category && <p className="text-xs text-red-500 ml-1 font-bold">{errors.category.message}</p>}
        </div>

        {/* PRECIO */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Precio de Venta ($)</label>
          <input
            type="number"
            step="0.01"
            {...register('price')}
            placeholder="0.00"
            className={`w-full px-4 py-3 bg-slate-50 border ${errors.price ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 transition-colors`}
          />
          {errors.price && <p className="text-xs text-red-500 ml-1 font-bold">{errors.price.message}</p>}
        </div>

        {/* STOCK */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Actual</label>
          <input
            type="number"
            {...register('stock')}
            placeholder="0"
            className={`w-full px-4 py-3 bg-slate-50 border ${errors.stock ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 transition-colors`}
          />
          {errors.stock && <p className="text-xs text-red-500 ml-1 font-bold">{errors.stock.message}</p>}
        </div>

        {/* STOCK MÍNIMO */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Stock Mínimo (Alerta)</label>
          <input
            type="number"
            {...register('minStock')}
            placeholder="5"
            className={`w-full px-4 py-3 bg-slate-50 border ${errors.minStock ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} rounded-xl outline-none font-bold text-slate-800 transition-colors`}
          />
          {errors.minStock && <p className="text-xs text-red-500 ml-1 font-bold">{errors.minStock.message}</p>}
        </div>
      </div>

      {/* BOTONERA */}
      <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/30 transition-all active:scale-95"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
        </button>
      </div>
    </form>
  );
};