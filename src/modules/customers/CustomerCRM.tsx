import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { ClientFormModal } from '../crm/pages/ClientFormModal';

// 🛡️ INTERFACES ESTRICTAS
interface Customer {
  id: string;
  name: string;
  balance: number;
  phone?: string;
  email?: string;
}

interface HistoryEvent {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'SALE' | 'PAYMENT' | 'DEBT';
}

export const CustomerCRM = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  // 🚀 OPTIMIZACIÓN: Columnas explícitas
  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, balance, phone, email')
      .order('name');
    
    if (error) console.error("Error cargando clientes:", error.message);
    if (data) setCustomers(data);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const loadCustomerHistory = async (customer: Customer) => {
    setIsLoading(true);
    setSelectedCustomer(customer);
    setHistory([]);
    
    try {
      // 🚀 Consulta paralela optimizada
      const [salesRes, moveRes] = await Promise.all([
        supabase.from('orders').select('id, created_at, total_amount, status').eq('customer_id', customer.id),
        supabase.from('client_movements').select('id, created_at, amount, type, concept').eq('customer_id', customer.id)
      ]);

      const combined: HistoryEvent[] = [
        ...(salesRes.data || []).map(s => ({
          id: s.id,
          date: s.created_at,
          amount: s.total_amount || 0,
          description: `Pedido #${s.id.split('-')[0].toUpperCase()} (${s.status})`,
          type: 'SALE' as const
        })),
        ...(moveRes.data || []).map(m => ({
          id: m.id,
          date: m.created_at,
          amount: m.amount,
          description: m.concept || (m.type === 'PAGO' ? 'Entrega de efectivo' : 'Cargo manual'),
          type: m.type === 'PAGO' ? 'PAYMENT' as const : 'DEBT' as const
        }))
      ];

      // Ordenar por fecha (más reciente primero)
      setHistory(combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error("Fallo al cargar historial:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 animate-in fade-in duration-500">
      
      {/* LISTADO DE CLIENTES */}
      <div className="w-1/3 flex flex-col bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter italic dark:text-white">Directorio</h2>
          <button 
            onClick={() => setIsNewClientModalOpen(true)}
            className="w-10 h-10 bg-slate-900 dark:bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {customers.map(c => (
            <button
              key={c.id}
              onClick={() => loadCustomerHistory(c)}
              className={`w-full flex items-center gap-4 p-4 rounded-[2rem] transition-all ${
                selectedCustomer?.id === c.id 
                  ? 'bg-slate-900 text-white shadow-xl translate-x-2' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                selectedCustomer?.id === c.id ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700'
              }`}>
                {getInitials(c.name)}
              </div>
              <div className="text-left overflow-hidden">
                <p className="font-black text-sm uppercase truncate">{c.name}</p>
                <p className={`text-[10px] font-bold ${selectedCustomer?.id === c.id ? 'text-slate-400' : 'text-slate-400'}`}>
                  Saldo: ${Number(c.balance).toLocaleString('es-AR')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* DETALLE Y AUDITORÍA */}
      <div className="flex-1 bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden relative border border-slate-800">
        {selectedCustomer ? (
          <div className="h-full flex flex-col">
            
            {/* Header Detalle */}
            <div className="p-10 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-800 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">Expediente de Cliente</p>
                <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic">{selectedCustomer.name}</h3>
                <div className="flex gap-4 mt-4">
                   <div className="text-slate-400 text-xs font-bold">📞 {selectedCustomer.phone || 'Sin Teléfono'}</div>
                   <div className="text-slate-400 text-xs font-bold">✉️ {selectedCustomer.email || 'Sin Email'}</div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo en Cuenta</p>
                <p className={`text-5xl font-black tracking-tighter ${selectedCustomer.balance > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                  ${Number(selectedCustomer.balance).toLocaleString('es-AR')}
                </p>
              </div>
            </div>

            {/* Timeline de Eventos */}
            <div className="flex-1 overflow-y-auto p-10 space-y-6">
              {isLoading ? (
                <div className="h-full flex items-center justify-center font-black text-slate-700 uppercase tracking-[0.5em] animate-pulse">Escaneando historial...</div>
              ) : history.length > 0 ? (
                <div className="space-y-4">
                  {history.map(event => (
                    <div key={event.id} className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-[2rem] hover:bg-slate-800 transition-colors group">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              event.type === 'SALE' ? 'bg-white' : event.type === 'PAYMENT' ? 'bg-emerald-400' : 'bg-rose-500'
                            }`} />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(event.date).toLocaleDateString('es-AR')}</p>
                          </div>
                          <p className="font-black text-white uppercase text-sm">{event.description}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black text-xl tracking-tighter ${
                            event.type === 'SALE' || event.type === 'DEBT' ? 'text-white' : 'text-emerald-400'
                          }`}>
                            {event.type === 'SALE' || event.type === 'DEBT' ? '-' : '+'}${Number(event.amount).toLocaleString('es-AR')}
                          </p>
                          <p className="text-[9px] font-black text-slate-600 uppercase">{event.type}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center opacity-20 font-black uppercase text-[10px] tracking-[0.5em]">Sin actividad registrada</div>
              )}
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-20 text-center">
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">🤝</div>
            <h3 className="text-white font-black uppercase tracking-widest text-lg">Auditoría de Clientes</h3>
            <p className="text-slate-600 font-bold text-xs uppercase tracking-widest mt-2">Seleccioná un perfil para visualizar el flujo de fondos</p>
          </div>
        )}
      </div>

      {/* MODAL PARA NUEVO CLIENTE */}
      <ClientFormModal 
        isOpen={isNewClientModalOpen} 
        onClose={() => setIsNewClientModalOpen(false)}
        onSuccess={() => {
          setIsNewClientModalOpen(false);
          fetchCustomers(); 
        }}
      />
    </div>
  );
};