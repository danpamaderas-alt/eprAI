import { useState, useEffect, useCallback, memo } from 'react';
import { useCrmStore } from '../crm/store/useCrmStore';
import Swal from 'sweetalert2';
import { X, Loader2 } from 'lucide-react';

// 1. Integridad Financiera: Formateo desde centavos (Evita errores de punto flotante)
const formatMoney = (amountInCents: number) => {
  const amount = amountInCents / 100;
  return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
};

export const CurrentAccounts = memo(() => {
  const { balances, isLoading, fetchBalances, addMovement } = useCrmStore();
  
  // Estado de UI
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado local del formulario (String para evitar NaN en inputs)
  const [formParams, setFormParams] = useState({ 
    movement_type: 'PAGO' as 'PAGO' | 'CARGO', 
    amount: '', 
    description: '' 
  });

  useEffect(() => {
    const timer = setTimeout(() => fetchBalances(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchBalances]);

  // Reset y apertura segura del modal
  const handleOpenModal = (customer: { id: string; name: string }) => {
    setSelectedCustomer(customer);
    setFormParams({ movement_type: 'PAGO', amount: '', description: '' });
    setIsModalOpen(true);
  };

  const handleSaveMovement = useCallback(async () => {
    const amountVal = Number.parseFloat(formParams.amount);
      
    // Validación de integridad
    if (!selectedCustomer || Number.isNaN(amountVal) || amountVal <= 0 || !formParams.description.trim()) {
      Swal.fire({ icon: 'warning', title: 'Datos inválidos', text: 'Verifica el monto y el concepto.' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Lógica Contable: Centavos + Signed Amount
      const amountInCents = Math.round(amountVal * 100);
      const signedAmount = formParams.movement_type === 'PAGO' ? -amountInCents : amountInCents;

      // 3. Idempotencia: UUID generado en cliente para evitar registros duplicados
      const success = await addMovement({
        transaction_id: crypto.randomUUID(), 
        customer_id: selectedCustomer.id,
        signed_amount: signedAmount,
        description: formParams.description.trim(),
        // NOTA: No enviamos fecha. El Backend pone created_at: now()
      });

      if (success) {
        Swal.fire({ toast: true, icon: 'success', title: 'Registrado', position: 'top-end', showConfirmButton: false, timer: 1500 });
        setIsModalOpen(false);
      } else {
        throw new Error("Rechazo de servidor");
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar la operación.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCustomer, formParams, addMovement]);

  return (
    <div className="space-y-6">
      <header className="bg-white dark:bg-slate-800 p-6 rounded-3xl border dark:border-slate-700 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 uppercase italic">Cuentas Corrientes</h1>
        <p className="text-sm font-bold text-slate-500 uppercase">Radar de Cobranzas</p>
      </header>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-slate-400 italic">Sincronizando...</div>
        ) : balances.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400">No se encontraron clientes.</div>
        ) : (
          balances.map(b => {
            const balance = b.balance || 0;
            return (
              <button key={b.id} onClick={() => handleOpenModal({ id: b.id, name: b.name })} className="bg-white p-5 rounded-3xl border hover:border-blue-400 transition-all text-left">
                <div className="flex justify-between mb-4">
                  <h4 className="font-black truncate w-2/3">{b.name}</h4>
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${balance > 0 ? 'bg-rose-100 text-rose-700' : balance < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {balance > 0 ? 'Debe' : balance < 0 ? 'A favor' : 'Al día'}
                  </span>
                </div>
                <p className="text-2xl font-black">{formatMoney(balance)}</p>
              </button>
            );
          })
        )}
      </div>

      {/* Modal - Bloqueado durante submit */}
      {isModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-black text-xl italic">Registrar Movimiento</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedCustomer.name}</p>
              </div>
              {!isSubmitting && <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>}
            </div>
            
            <div className="space-y-4">
              {/* Selector tipo movimiento */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {(['PAGO', 'CARGO'] as const).map(t => (
                  <button key={t} onClick={() => setFormParams(p => ({...p, movement_type: t}))} className={`flex-1 py-3 rounded-lg text-[10px] font-black ${formParams.movement_type === t ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}>{t === 'PAGO' ? 'Recibí Dinero' : 'Sumar Deuda'}</button>
                ))}
              </div>
              
              <input type="number" placeholder="Monto $" value={formParams.amount} onChange={e => setFormParams(p => ({...p, amount: e.target.value}))} className="w-full p-4 bg-slate-50 rounded-xl font-black text-xl" />
              <input type="text" placeholder="Concepto..." value={formParams.description} onChange={e => setFormParams(p => ({...p, description: e.target.value}))} className="w-full p-4 bg-slate-50 rounded-xl text-sm" />
              
              <button disabled={isSubmitting} onClick={handleSaveMovement} className={`w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[10px] ${isSubmitting ? 'opacity-50' : ''}`}>
                {isSubmitting ? <Loader2 className="animate-spin mx-auto w-4 h-4" /> : 'Confirmar Operación 💾'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CurrentAccounts.displayName = 'CurrentAccounts';