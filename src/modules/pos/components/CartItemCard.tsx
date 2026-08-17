import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { ARS } from '../../../shared/utils/format';

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  size_name: string;
  color_name: string;
}

interface CartItemCardProps {
  item: CartItem;
  onRemove: (id: string) => void;
}

export const CartItemCard = memo(({ item, onRemove }: CartItemCardProps) => (
  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[2rem] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-xs font-black text-slate-800 dark:text-white uppercase leading-tight">
          {item.name}
        </p>
        <div className="flex gap-2 mt-2">
          <span className="text-[8px] font-black bg-white dark:bg-slate-900 text-slate-500 px-2 py-1 rounded-lg border dark:border-slate-700 uppercase">
            T: {item.size_name}
          </span>
          <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-1 rounded-lg uppercase">
            {item.color_name}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
    <div className="flex justify-between items-end mt-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase">
        {item.qty} x {ARS.format(item.price)}
      </p>
      <p className="font-black text-sm text-slate-900 dark:text-white tabular-nums">
        {ARS.format(item.price * item.qty)}
      </p>
    </div>
  </div>
));

CartItemCard.displayName = 'CartItemCard';
