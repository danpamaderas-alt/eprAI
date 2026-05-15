import { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { useCrmStore } from '../crm/store/useCrmStore'; // ✅ RUTA CORREGIDA
import { ClientFormModal } from '../crm/pages/ClientFormModal';

export const CustomerCRM = memo(() => {
  const { balances: customers, fetchBalances } = useCrmStore();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  const loadHistory = async (customer: any) => {
    setSelectedCustomer(customer);
    const { data } = await supabase.from('account_movements').select('*').eq('customer_id', customer.id).order('date', { ascending: false });
    setHistory(data || []);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 p-4">
      <div className="w-1/3 bg-white dark:bg-slate-800 rounded-[2rem] border dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-black uppercase tracking-tighter italic dark:text-white">Clientes</h2>
          <button onClick={() => setIsNewModalOpen(true)} className="w-8 h-8 bg-blue-600 text-white rounded-full font-bold shadow-lg">+</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {customers.map(c => (
            <button key={c.id} onClick={() => loadHistory(c)} className={`w-full text-left p-4 rounded-2xl transition-all ${selectedCustomer?.id === c.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white'}`}>
              <p className="font-black text-xs uppercase truncate">{c.name}</p>
              <p className="text-[10px] opacity-60">Saldo: ${c.balance}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-800 p-8 overflow-y-auto">
        {selectedCustomer ? (
          <div className="space-y-6">
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">{selectedCustomer.name}</h3>
            {history.map((h: any) => (
              <div key={h.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{new Date(h.date).toLocaleDateString()}</p>
                  <p className="text-white font-bold text-sm uppercase">{h.description}</p>
                </div>
                <p className={`font-black ${h.movement_type === 'PAGO' ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {h.movement_type === 'PAGO' ? '+' : '-'}${h.amount}
                </p>
              </div>
            ))}
          </div>
        ) : <p className="text-slate-600 font-black uppercase text-center mt-20 tracking-widest italic">Seleccioná un cliente para auditar</p>}
      </div>

      <ClientFormModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
    </div>
  );
});

CustomerCRM.displayName = 'CustomerCRM';