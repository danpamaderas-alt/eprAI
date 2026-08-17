import { memo } from 'react';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { ARS } from '../../../shared/utils/format';

interface ProductCardProps {
  product: Product;
  onAdd: (p: Product) => void;
}

export const ProductCard = memo(({ product, onAdd }: ProductCardProps) => (
  <button
    type="button"
    onClick={() => onAdd(product)}
    className="group bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:border-blue-500 hover:shadow-2xl transition-all flex flex-col items-start text-left relative overflow-hidden"
  >
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
      {product.sku || 'SIN SKU'}
    </span>
    <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm mt-2 leading-tight h-10 overflow-hidden">
      {product.name}
    </h3>
    <p className="mt-4 text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
      {ARS.format(Number.parseFloat(String(product.price || 0)))}
    </p>
    <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl group-hover:scale-110 transition-transform" aria-hidden="true">
      📦
    </div>
  </button>
));

ProductCard.displayName = 'ProductCard';
