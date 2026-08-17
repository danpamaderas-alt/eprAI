import { memo, useCallback } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { ARS } from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/cn';
import { Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAdd: (p: Product) => void;
}

function getCategoryGradient(category: string | null) {
  const c = (category || '').toLowerCase();
  if (c.includes('remera')) return 'from-brand-400 to-brand-600';
  if (c.includes('buzo')) return 'from-indigo-400 to-indigo-600';
  if (c.includes('pantalon')) return 'from-emerald-400 to-emerald-600';
  if (c.includes('campera')) return 'from-amber-400 to-amber-600';
  if (c.includes('accesorio')) return 'from-pink-400 to-pink-600';
  return 'from-slate-400 to-slate-600';
}

export const ProductCard = memo(({ product, onAdd }: ProductCardProps) => (
  <button
    type="button"
    onClick={() => onAdd(product)}
    className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-brand dark:hover:border-brand hover:shadow-2xl transition-all flex flex-col items-stretch text-left relative overflow-hidden active:scale-[0.97]"
  >
    <div className={cn('h-24 bg-gradient-to-br flex items-center justify-center', getCategoryGradient(product.category))}>
      <Package className="w-8 h-8 text-white/60 group-hover:scale-110 transition-transform" />
    </div>
    <div className="p-4">
      <span className="text-[8px] font-black text-brand/60 uppercase tracking-[0.2em]">
        {product.sku || 'SIN SKU'}
      </span>
      <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs mt-1 leading-tight line-clamp-2 min-h-[2.5rem]">
        {product.name}
      </h3>
      <p className="mt-3 text-lg font-black text-brand dark:text-brand-400 tabular-nums">
        {ARS.format(Number.parseFloat(String(product.price || 0)))}
      </p>
    </div>
  </button>
));

ProductCard.displayName = 'ProductCard';
