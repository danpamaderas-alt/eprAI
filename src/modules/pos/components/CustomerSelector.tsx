import { memo, useState } from 'react';
import { User, X } from 'lucide-react';
import { useCrmStore } from '../../crm/store/useCrmStore';

interface CustomerSelectorProps {
  selectedCustomerId: string | null;
  onSelect: (id: string | null) => void;
}

export const CustomerSelector = memo(({ selectedCustomerId, onSelect }: CustomerSelectorProps) => {
  const { balances } = useCrmStore();
  const [clientSearch, setClientSearch] = useState('');

  const filteredCustomers = balances
    .filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="p-8 border-b dark:border-slate-800">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <User className="w-3 h-3" /> Identificación de Cliente
      </p>
      {selectedCustomerId ? (
        <div className="flex items-center justify-between bg-blue-600 p-5 rounded-[2rem] text-white shadow-lg animate-in zoom-in-95">
          <div className="overflow-hidden">
            <p className="text-[9px] font-black uppercase opacity-60">Cliente Activo</p>
            <p className="text-sm font-black uppercase truncate">
              {balances.find((c) => c.id === selectedCustomerId)?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] text-sm font-black dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          {filteredCustomers.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c.id);
                    setClientSearch(c.name);
                  }}
                  className="w-full px-6 py-4 text-left text-xs font-black hover:bg-blue-50 dark:hover:bg-blue-900/40 dark:text-white border-b border-slate-50 dark:border-slate-800 last:border-none uppercase"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CustomerSelector.displayName = 'CustomerSelector';
