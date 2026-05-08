import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { ClientFormModal } from '../crm/pages/ClientFormModal'; 

export const CustomerCRM = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const loadCustomerHistory = async (customerId: string) => {
    setIsLoading(true);
    setHistory([]);
    
    const [salesRes, transRes] = await Promise.all([
      supabase.from('orders').select('*').eq('customer_id', customerId),
      supabase.from('client_movements').select('*').eq('customer_id', customerId)
    ]);

    const combined = [
      ...(salesRes.data || []).map(s => ({ 
        ...s, 
        type: 'SALE', 
        amount: s.total_amount || s.total || 0,
        description: `Pedido #${s.id.split('-')[0].toUpperCase()}`
      })),
      
      ...(transRes.data || []).map(t => {
        const typeUpper = t.type?.toUpperCase() || '';
        const descUpper = t.description?.toUpperCase() || '';
        
        const isDebt = 
          ['VENTA', 'DEBITO', 'ORDEN', 'SISTEMA', 'DEUDA', 'CARGO'].includes(typeUpper) || 
          descUpper.includes('HOJAS') || 
          descUpper.includes('PEDIDO') ||
          descUpper.includes('RESPUESTO') ||
          t.amount < 0; 

        return {
          ...t,
          type: isDebt ? 'SALE' : 'PAYMENT',
          amount: Math.abs(t.amount || 0),
          description: t.description || (isDebt ? 'Cargo en Cuenta' : 'Entrega de Dinero'),
          categoryLabel: isDebt ? 'Débito' : 'Crédito'
        };
      })
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setHistory(combined);
    setIsLoading(false);
  };

  const stats = useMemo(() => {
    const totalSales = history
      .filter(h => h.type === 'SALE')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    const totalPayments = history
      .filter(h => h.type === 'PAYMENT')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);

    return {
      totalSales,
      totalPayments,
      currentBalance: totalSales - totalPayments
    };
  }, [history]);

  const handleSendReminder = () => {
    if (!selectedCustomer) return;
    const message = `*ESTADO DE CUENTA - RAÍCES*%0A` +
      `--------------------------------%0A` +
      `*Cliente:* ${selectedCustomer.name}%0A` +
      `*Total Compras/Cargos:* $${stats.totalSales.toLocaleString()}%0A` +
      `*Total Abonado:* $${stats.totalPayments.toLocaleString()}%0A` +
      `*SALDO PENDIENTE:* $${stats.currentBalance.toLocaleString()}%0A` +
      `--------------------------------%0A` +
      `_Por favor, verifique para coordinar entregas. Gracias!_`;
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-white">
      <header className="flex justify-between items-center border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            👥 CRM <span className="text-indigo-500">& Auditoría</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Control de Cuentas Corrientes Raíces</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 h-[75vh] overflow-y-auto shadow-2xl">
          
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Seleccionar Cliente</h2>
            <button 
              onClick={() => setIsNewClientModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20"
            >
              + Nuevo
            </button>
          </div>

          <div className="space-y-2">
            {customers.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedCustomer(c); loadCustomerHistory(c.id); }}
                className={`w-full text-left p-5 rounded-3xl border transition-all transform active:scale-95 ${
                  selectedCustomer?.id === c.id 
                    ? 'bg-indigo-600 border-indigo-400 shadow-xl' 
                    : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-black uppercase text-sm truncate pr-2">{c.name}</p>
                  {/* 🚀 ACÁ DEVOLVEMOS A LA VIDA LOS SALDOS REALES */}
                  <p className={`text-[10px] font-black ${c.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    ${Number(c.balance || 0).toLocaleString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Ficha de Cliente</p>
                    <h3 className="text-5xl font-black uppercase italic tracking-tighter leading-none">{selectedCustomer.name}</h3>
                  </div>
                  <button 
                    onClick={handleSendReminder}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-900/40"
                  >
                    📱 Cobrar WhatsApp
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Total Compras</p>
                    <p className="text-3xl font-black italic">$ {stats.totalSales.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-[9px] font-black text-emerald-500 uppercase mb-2">Total Pagos</p>
                    <p className="text-3xl font-black italic text-emerald-400">$ {stats.totalPayments.toLocaleString()}</p>
                  </div>
                  <div className={`p-6 rounded-3xl border transition-colors ${stats.currentBalance > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-950/50 border-slate-800'}`}>
                    <p className="text-[9px] font-black uppercase mb-2 opacity-60">Saldo a Fecha</p>
                    <p className="text-3xl font-black italic">$ {stats.currentBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-xl">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-10 italic">Línea de Tiempo de Actividad</h2>
                
                {isLoading ? (
                  <div className="py-20 text-center animate-pulse text-slate-600 font-black uppercase text-xs">Analizando movimientos...</div>
                ) : history.length > 0 ? (
                  <div className="space-y-4 relative border-l-2 border-slate-800 ml-4 pl-10">
                    {history.map((event, i) => (
                      <div key={i} className="relative group">
                        <div className={`absolute -left-[51px] top-2 w-6 h-6 rounded-full border-4 border-slate-900 shadow-2xl transition-all ${
                          event.type === 'SALE' ? 'bg-slate-600' : 'bg-emerald-500'
                        }`}></div>
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-[2rem] flex justify-between items-center group-hover:border-indigo-500/50 transition-all shadow-sm">
                          <div>
                            <p className="text-[10px] font-black text-slate-600 uppercase mb-1">
                              {new Date(event.created_at).toLocaleDateString()} — {event.categoryLabel}
                            </p>
                            <p className="font-black text-white uppercase text-sm tracking-tight">{event.description}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-black text-xl tracking-tighter ${event.type === 'SALE' ? 'text-white' : 'text-emerald-400'}`}>
                              {event.type === 'SALE' ? '-' : '+'}${Number(event.amount).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-20 font-black uppercase text-[10px] tracking-[0.5em]">Sin historial registrado</div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/20">
              <span className="text-6xl mb-4 opacity-10 animate-bounce">🤝</span>
              <p className="text-slate-700 font-black uppercase text-[10px] tracking-[0.5em] italic text-center">
                Seleccioná un cliente <br /> para auditar saldos
              </p>
            </div>
          )}
        </div>
      </div>

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