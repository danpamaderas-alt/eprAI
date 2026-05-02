import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import { Search, CreditCard, TrendingUp, ArrowLeft, Plus } from 'lucide-react';

export const CurrentAccounts = () => {
  const [balances, setBalances] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formParams, setFormParams] = useState({ movement_type: 'PAGO', amount: 0, description: '' });

  useEffect(() => {
    fetchGlobalBalances();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) fetchMovements(selectedCustomerId);
  }, [selectedCustomerId]);

const fetchGlobalBalances = async () => {
    setIsLoading(true);
    try {
      console.log("Intentando leer la vista v_customer_balances...");
      
      const { data, error } = await supabase
        .from('v_customer_balances')
        .select('*')
        .order('current_balance', { ascending: false });

      if (error) {
        // 🚨 Si hay un error, nos va a avisar con un cartel
        console.error("Error de Supabase:", error);
        Swal.fire('Error en la Vista', error.message, 'error');
        return;
      }

      console.log("Datos recibidos:", data);
      setBalances(data || []);

    } catch (err: any) {
      console.error("Fallo total:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovements = async (id: string) => {
    const { data } = await supabase.from('account_movements').select('*').eq('customer_id', id).order('date', { ascending: false });
    setMovements(data || []);
  };

  // Cálculos de cabecera
  const globalTotal = useMemo(() => 
    balances.reduce((acc, curr) => curr.current_balance > 0 ? acc + curr.current_balance : acc, 0)
  , [balances]);

  const filteredBalances = balances.filter(b => b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSaveMovement = async () => {
    if (formParams.amount <= 0 || !formParams.description) return;
    try {
      const { error } = await supabase.from('account_movements').insert([{
        customer_id: selectedCustomerId,
        ...formParams
      }]);
      if (error) throw error;
      Swal.fire({ toast: true, icon: 'success', title: 'Registrado', position: 'top-end', showConfirmButton: false, timer: 1500 });
      setIsModalOpen(false);
      setFormParams({ movement_type: 'PAGO', amount: 0, description: '' });
      fetchMovements(selectedCustomerId!);
      fetchGlobalBalances();
    } catch (e) { Swal.fire('Error', 'No se pudo guardar', 'error'); }
  };

  // VISTA DE DETALLE (Cuando seleccionas un cliente)
  if (selectedCustomerId) {
    const customer = balances.find(b => b.customer_id === selectedCustomerId);
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <button onClick={() => setSelectedCustomerId(null)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors uppercase text-xs">
          <ArrowLeft className="w-4 h-4" /> Volver al Radar
        </button>
        
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{customer?.customer_name}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase">Historial de movimientos</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Saldo Actual</p>
            <p className={`text-4xl font-black ${customer?.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ${Math.abs(customer?.current_balance || 0).toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-black text-slate-700 dark:text-white uppercase text-sm">Libro de Cuenta</h3>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
              + Nuevo Movimiento
            </button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                <th className="p-5">Fecha</th>
                <th className="p-5">Detalle</th>
                <th className="p-5 text-center">Tipo</th>
                <th className="p-5 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold">
              {movements.map(mov => (
                <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="p-5 text-slate-500">{new Date(mov.date).toLocaleDateString('es-AR')}</td>
                  <td className="p-5 text-slate-800 dark:text-slate-200">{mov.description}</td>
                  <td className="p-5 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${mov.movement_type === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {mov.movement_type === 'PAGO' ? 'Pago' : 'Cargo'}
                    </span>
                  </td>
                  <td className={`p-5 text-right font-black ${mov.movement_type === 'PAGO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {mov.movement_type === 'PAGO' ? '-' : '+'}${Number(mov.amount).toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL REUTILIZADO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5 border border-slate-200">
              <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">Registrar en Cuenta</h2>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                {['PAGO', 'CARGO'].map(t => (
                  <button key={t} onClick={() => setFormParams({...formParams, movement_type: t as any})} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formParams.movement_type === t ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}>
                    {t === 'PAGO' ? 'Recibí Dinero' : 'Sumar Deuda'}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Monto $" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black outline-none focus:border-blue-500" value={formParams.amount || ''} onChange={e => setFormParams({...formParams, amount: Number(e.target.value)})} />
              <input type="text" placeholder="¿Por qué concepto?" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500" value={formParams.description} onChange={e => setFormParams({...formParams, description: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 px-4">Cancelar</button>
                <button onClick={handleSaveMovement} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISTA DE RADAR (General)
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Radar de Cobranzas</h1>
        <p className="text-sm font-bold text-slate-500 uppercase">Quién tiene que pagar y cuánto</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-6 rounded-3xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest mb-1">Total en la calle</p>
              <h3 className="text-4xl font-black text-rose-700 dark:text-rose-500">${globalTotal.toLocaleString('es-AR')}</h3>
            </div>
            <TrendingUp className="text-rose-400 w-8 h-8" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" placeholder="Buscar deudor por nombre..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Escaneando saldos...</div>
        ) : filteredBalances.map(b => (
          <div 
            key={b.customer_id} 
            onClick={() => setSelectedCustomerId(b.customer_id)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl hover:shadow-xl hover:border-blue-400 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm leading-tight truncate w-2/3">{b.customer_name}</h4>
              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${b.current_balance > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {b.current_balance > 0 ? 'Debe' : 'A favor'}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo</p>
                <p className={`text-2xl font-black ${b.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ${Math.abs(b.current_balance).toLocaleString('es-AR')}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};