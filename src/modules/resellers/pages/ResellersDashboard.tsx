import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useResellerStore } from '../store/useResellerStore';
import { useTreasuryStore } from '../../inventory/treasury/store/useTreasuryStore';
import Swal from 'sweetalert2';

// Tipos para los formularios
interface NewResellerFields { name: string; phone: string; }
interface NewTransactionFields { type: 'GOODS_GIVEN' | 'PAYMENT'; amount: number; description: string; paymentMethod: string; }

export const ResellersDashboard = () => {
  const { resellers, transactions, fetchData, addReseller, addTransaction, isLoading } = useResellerStore();
  const { addTransaction: addTreasuryTransaction } = useTreasuryStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. Formularios optimizados
  const resellerForm = useForm<NewResellerFields>();
  const txForm = useForm<NewTransactionFields>({
    defaultValues: { type: 'GOODS_GIVEN', paymentMethod: 'EFECTIVO' }
  });

  const watchTxType = txForm.watch('type');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedReseller = resellers.find(r => r.id === selectedId);
  const resellerTxs = useMemo(() => 
    transactions.filter(t => t.resellerId === selectedId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [transactions, selectedId]);

  // 2. Cálculo de deuda con lógica de colores
  const totalDebt = useMemo(() => {
    return resellerTxs.reduce((acc, tx) => {
      const amount = Number(tx.amount) || 0;
      return tx.type === 'GOODS_GIVEN' ? acc + amount : acc - amount;
    }, 0);
  }, [resellerTxs]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  // Handlers
  const onCreateReseller = async (data: NewResellerFields) => {
    await addReseller(data.name, data.phone);
    resellerForm.reset();
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Revendedor creado', showConfirmButton: false, timer: 1500 });
  };

  const onRegisterTx = async (data: NewTransactionFields) => {
    if (!selectedReseller) return;

    try {
      // A. Registrar en Cuenta Corriente del Revendedor
      await addTransaction({
        resellerId: selectedReseller.id,
        type: data.type,
        amount: Number(data.amount),
        description: data.description || (data.type === 'GOODS_GIVEN' ? 'Entrega de mercadería' : 'Pago a cuenta')
      });

      // B. Sincronizar con Tesorería si es un pago (Entrada de Efectivo/Banco)
      if (data.type === 'PAYMENT') {
        await addTreasuryTransaction({
          type: 'INCOME',
          amount: Number(data.amount),
          concept: `💰 PAGO REV.: ${selectedReseller.name} (${data.description || 'S/D'})`,
          categoryId: 'VENTA',
          date: new Date().toISOString(),
          accountId: data.paymentMethod as any,
          businessUnit: 'RAICES',
          status: 'COMPLETED'
        });
      }

      txForm.reset({ type: data.type, paymentMethod: data.paymentMethod, description: '', amount: 0 });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Movimiento registrado', showConfirmButton: false, timer: 1500 });
    } catch (error) {
      Swal.fire('Error', 'No se pudo registrar la operación', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Gestión de Concesionarios</h1>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Control de mercadería externa y cuentas corrientes.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
        
        {/* PANEL IZQUIERDO: Directorio */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Directorio de Socios</h2>
            <form onSubmit={resellerForm.handleSubmit(onCreateReseller)} className="space-y-2">
              <input 
                {...resellerForm.register('name', { required: true })}
                type="text" 
                placeholder="Nombre del socio..." 
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 shadow-sm transition-all" 
              />
              <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                + Vincular Socio
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="p-10 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="divide-y divide-slate-50">
                {resellers.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full p-5 text-left transition-all relative ${selectedId === r.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    {selectedId === r.id && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-r-lg"></div>}
                    <p className={`font-black text-xs uppercase tracking-tight ${selectedId === r.id ? 'text-blue-600' : 'text-slate-700'}`}>{r.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{r.phone || 'Sin contacto'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Detalle Cuenta Corriente */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
          {!selectedReseller ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Selecciona un revendedor para auditar</p>
            </div>
          ) : (
            <>
              {/* Header con Saldo */}
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{selectedReseller.name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <p className="text-[10px] font-black uppercase tracking-widest italic">Cta. Corriente Activa</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 min-w-[200px] text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo a Liquidar</p>
                  <p className={`text-3xl font-black tabular-nums ${totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(totalDebt)}
                  </p>
                </div>
              </div>

              {/* Registro de Movimientos Fast-Entry */}
              <div className="p-6 bg-slate-900">
                <form onSubmit={txForm.handleSubmit(onRegisterTx)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Operación</label>
                    <select {...txForm.register('type')} className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none focus:border-blue-500">
                      <option value="GOODS_GIVEN">📤 ENTREGA MERCADERÍA</option>
                      <option value="PAYMENT">💰 COBRO DE DINERO</option>
                    </select>
                  </div>

                  {watchTxType === 'PAYMENT' && (
                    <div className="space-y-1.5 animate-in slide-in-from-left-4">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 text-emerald-500">Destino Tesorería</label>
                      <select {...txForm.register('paymentMethod')} className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none">
                        <option value="EFECTIVO">CAJA FUERTE (EFE)</option>
                        <option value="MERCADO_PAGO">MERCADO PAGO</option>
                        <option value="BANCO">BANCO GALICIA</option>
                      </select>
                    </div>
                  )}

                  <div className={`space-y-1.5 transition-all ${watchTxType === 'PAYMENT' ? 'md:col-span-1' : 'md:col-span-2'}`}>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Concepto / Detalle</label>
                    <input 
                      {...txForm.register('description', { required: true })}
                      type="text" 
                      placeholder="Ej: 5 Buzos, 2 Pantalones..." 
                      className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none focus:border-blue-500" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor Final</label>
                    <div className="flex gap-2">
                      <input 
                        {...txForm.register('amount', { required: true })}
                        type="number" 
                        placeholder="$ 0"
                        className="w-full bg-slate-800 border border-slate-700 text-white text-xs p-3 rounded-xl outline-none focus:border-blue-500 font-black tabular-nums" 
                      />
                      <button 
                        disabled={txForm.formState.isSubmitting}
                        type="submit" 
                        className={`px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${watchTxType === 'GOODS_GIVEN' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'}`}
                      >
                        {txForm.formState.isSubmitting ? '...' : 'Registrar'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Libro de Movimientos Histórico */}
              <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                <div className="space-y-3">
                  {resellerTxs.map(tx => (
                    <div key={tx.id} className="group flex justify-between items-center p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner ${tx.type === 'GOODS_GIVEN' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {tx.type === 'GOODS_GIVEN' ? '📤' : '💰'}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{tx.description}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">{new Date(tx.date).toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-black tabular-nums ${tx.type === 'GOODS_GIVEN' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {tx.type === 'GOODS_GIVEN' ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                      </div>
                    </div>
                  ))}
                  {resellerTxs.length === 0 && (
                    <div className="py-20 text-center opacity-30">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin actividad reciente</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};