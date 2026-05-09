import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import { Search, CreditCard, TrendingUp, ArrowLeft } from 'lucide-react';

// 1. 🛡️ INTERFACES ESTRICTAS
interface CustomerBalance {
  customer_id: string;
  customer_name: string;
  current_balance: number;
}

interface AccountMovement {
  id: string;
  customer_id: string;
  date: string;
  description: string;
  movement_type: 'PAGO' | 'CARGO';
  amount: number;
}

// 2. 🧹 HELPER PARA LIMPIAR CÓDIGO DE MONEDA
const formatMoney = (amount: number) => `$${Math.abs(amount).toLocaleString('es-AR')}`;

export const CurrentAccounts = () => {
  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formParams, setFormParams] = useState({ 
    movement_type: 'PAGO' as 'PAGO' | 'CARGO', 
    amount: '' as number | '', 
    description: '' 
  });

  // 🚀 OPTIMIZACIÓN: Memorizamos la función y agregamos protección de montaje
  const fetchGlobalBalances = useCallback(async (isMounted: boolean = true) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, balance');

      if (error) throw error;
      
      if (isMounted) {
        const formattedData = (data || [])
          .map((c: any) => ({
            customer_id: c.id,
            customer_name: c.name,
            current_balance: Number(c.balance) || 0
          }))
          .filter(c => c.current_balance !== 0)
          .sort((a, b) => Math.abs(b.current_balance) - Math.abs(a.current_balance));

        setBalances(formattedData);
      }
    } catch (err: unknown) {
      console.error("Fallo al cargar saldos:", err);
      if (isMounted) Swal.fire('Error', 'Fallo al conectar con el servidor', 'error');
    } finally {
      if (isMounted) setIsLoading(false);
    }
  }, []);

  // 🚀 OPTIMIZACIÓN: Evitamos select('*') para mejor rendimiento de red
  const fetchMovements = useCallback(async (id: string, isMounted: boolean = true) => {
    try {
      const { data, error } = await supabase
        .from('account_movements')
        .select('id, customer_id, date, description, movement_type, amount')
        .eq('customer_id', id)
        .order('date', { ascending: false });
        
      if (error) throw error;
      if (isMounted) setMovements(data || []);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      if (isMounted) Swal.fire('Error', 'No se pudieron cargar los movimientos.', 'error');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchGlobalBalances(isMounted);
    return () => { isMounted = false; };
  }, [fetchGlobalBalances]);

  useEffect(() => {
    let isMounted = true;
    if (selectedCustomerId) {
      fetchMovements(selectedCustomerId, isMounted);
    }
    return () => { isMounted = false; };
  }, [selectedCustomerId, fetchMovements]);

  const globalTotal = useMemo(() => 
    balances.reduce((acc, curr) => curr.current_balance > 0 ? acc + curr.current_balance : acc, 0)
  , [balances]);

  const filteredBalances = useMemo(() => 
    balances.filter(b => b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  , [balances, searchTerm]);

  const handleSaveMovement = async () => {
    if (!selectedCustomerId) {
      Swal.fire('Error', 'No hay cliente seleccionado.', 'error');
      return;
    }
    
    const amountNum = Number(formParams.amount);
    
    if (isNaN(amountNum) || amountNum <= 0 || !formParams.description.trim()) {
      Swal.fire('Atención', 'El monto debe ser mayor a 0 y tener una descripción.', 'warning');
      return;
    }

    try {
      const { error } = await supabase.from('account_movements').insert([{
        customer_id: selectedCustomerId,
        movement_type: formParams.movement_type,
        amount: amountNum,
        description: formParams.description.trim()
      }]);
      if (error) throw error;

      Swal.fire({ toast: true, icon: 'success', title: 'Registrado', position: 'top-end', showConfirmButton: false, timer: 1500 });
      setIsModalOpen(false);
      setFormParams({ movement_type: 'PAGO', amount: '', description: '' });
      
      // Refrescamos datos
      fetchMovements(selectedCustomerId);
      fetchGlobalBalances();
    } catch (e) { 
      console.error(e);
      Swal.fire('Error', 'No se pudo guardar el movimiento', 'error'); 
    }
  };

  // ==========================================
  // VISTA DE DETALLE (Cuando seleccionas un cliente)
  // ==========================================
  if (selectedCustomerId) {
    const customer = balances.find(b => b.customer_id === selectedCustomerId);
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <button onClick={() => setSelectedCustomerId(null)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors uppercase text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-lg p-1">
          <ArrowLeft className="w-4 h-4" /> Volver al Radar
        </button>
        
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{customer?.customer_name}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase">Historial de pagos manuales</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400">Saldo Total</p>
            <p className={`text-4xl font-black ${customer && customer.current_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatMoney(customer?.current_balance || 0)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-black text-slate-700 dark:text-white uppercase text-sm">Libro de Cuenta</h3>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500">
              + Nuevo Movimiento
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-5">Fecha</th>
                  <th className="p-5">Detalle</th>
                  <th className="p-5 text-center">Tipo</th>
                  <th className="p-5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold">
                {movements.map(mov => (
                  <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="p-5 text-slate-500 dark:text-slate-400">{new Date(mov.date).toLocaleDateString('es-AR')}</td>
                    <td className="p-5 text-slate-800 dark:text-slate-200">{mov.description}</td>
                    <td className="p-5 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${mov.movement_type === 'PAGO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                        {mov.movement_type === 'PAGO' ? 'Pago' : 'Cargo'}
                      </span>
                    </td>
                    <td className={`p-5 text-right font-black ${mov.movement_type === 'PAGO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {mov.movement_type === 'PAGO' ? '-' : '+'}{formatMoney(mov.amount)}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                      No hay pagos ni cargos manuales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE MOVIMIENTOS */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5 border border-slate-200 dark:border-slate-700">
              <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-xl">Registrar en Cuenta</h2>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                {['PAGO', 'CARGO'].map(t => (
                  <button 
                    key={t} 
                    onClick={() => setFormParams({...formParams, movement_type: t as 'PAGO' | 'CARGO'})} 
                    className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${formParams.movement_type === t ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                  >
                    {t === 'PAGO' ? 'Recibí Dinero' : 'Sumar Deuda'}
                  </button>
                ))}
              </div>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                placeholder="Monto $" 
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xl font-black outline-none focus:border-blue-500 dark:text-white transition-colors" 
                value={formParams.amount} 
                onChange={e => setFormParams({...formParams, amount: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
              />
              <input 
                type="text" 
                placeholder="¿Por qué concepto?" 
                className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-blue-500 dark:text-white transition-colors" 
                value={formParams.description} 
                onChange={e => setFormParams({...formParams, description: e.target.value})} 
              />
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="uppercase text-[10px] font-black text-slate-400 px-4 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveMovement} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VISTA DE RADAR (General)
  // ==========================================
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
              <h3 className="text-4xl font-black text-rose-700 dark:text-rose-500">{formatMoney(globalTotal)}</h3>
            </div>
            <TrendingUp className="text-rose-400 dark:text-rose-500 w-8 h-8" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar deudor por nombre..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 dark:text-white transition-colors"
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Escaneando saldos...</div>
        ) : filteredBalances.length === 0 ? (
          <div className="col-span-full py-20 text-center font-black text-slate-400 uppercase tracking-widest">No hay deudas registradas</div>
        ) : filteredBalances.map(b => (
          <div 
            key={b.customer_id} 
            onClick={() => setSelectedCustomerId(b.customer_id)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-3xl hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm leading-tight truncate w-2/3">{b.customer_name}</h4>
              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${b.current_balance > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                {b.current_balance > 0 ? 'Debe' : 'A favor'}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Total</p>
                <p className={`text-2xl font-black ${b.current_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatMoney(b.current_balance)}
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