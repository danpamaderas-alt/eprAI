import { memo } from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { ARS } from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/cn';

interface CartItemCardProps {
  item: {
    variantId: string;
    name: string;
    size: string;
    color: string;
    price: number;
    qty: number;
    maxQty: number;
  };
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, delta: number) => void;
}

export const CartItemCard = memo(({ item, onRemove, onUpdateQty }: CartItemCardProps) => (
  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors group">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-tight">
          {item.name}
        </p>
        <div className="flex gap-1.5 mt-1.5">
          <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded uppercase">
            {item.size}
          </span>
          <span className="text-[8px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">
            {item.color}
          </span>
          <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">
            ${item.price.toLocaleString('es-AR')}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.variantId)}
        className="p-1.5 text-slate-300 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>

    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onUpdateQty(item.variantId, -1)}
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center transition-colors transition-transform active:scale-90',
            'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-danger/20 hover:text-danger'
          )}
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-xs font-black text-brand min-w-[1.5rem] text-center tabular-nums">
          {item.qty}
        </span>
        <button
          onClick={() => item.qty < item.maxQty && onUpdateQty(item.variantId, 1)}
          disabled={item.qty >= item.maxQty}
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center transition-colors transition-transform active:scale-90',
            item.qty >= item.maxQty
              ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 cursor-not-allowed'
              : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'
          )}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <div className="text-right">
        <p className="text-[9px] text-slate-400 font-medium">
          {item.qty} x {ARS.format(item.price)}
        </p>
        <p className="font-black text-xs text-slate-900 dark:text-white tabular-nums">
          {ARS.format(item.price * item.qty)}
        </p>
      </div>
    </div>
  </div>
));

CartItemCard.displayName = 'CartItemCard';
