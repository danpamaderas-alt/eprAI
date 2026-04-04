import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema, type TransactionFormValues } from '../schemas/transactionSchema';

interface TransactionFormProps {
  onSubmitSuccess: (data: TransactionFormValues) => void;
  onCancel: () => void;
}

export const TransactionForm = ({ onSubmitSuccess, onCancel }: TransactionFormProps) => {
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors, isSubmitting } 
  } = useForm<TransactionFormValues>({
    // @ts-expect-error - Silenciamos el desajuste de tipos entre librerías
    resolver: zodResolver(transactionSchema),
    defaultValues: { 
      type: 'INCOME', 
      date: new Date().toISOString().split('T')[0], 
      amount: 0,
      accountId: 'MERCADO_PAGO',
      businessUnit: 'GENERAL',
      status: 'COMPLETED',
      categoryId: 'VENTA'
    },
  });

  // Suscripción al cambio de tipo para la UI sin romper el compilador de React
  const currentType = useWatch({ control, name: 'type' });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Registrar Movimiento</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Carga de flujo de caja y tesorería</p>
        </div>
        <button type="button" onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-all">✕</button>
      </div>
      <form onSubmit={handleSubmit((data) => onSubmitSuccess(data as unknown as TransactionFormValues))} className="p-8 space-y-8">
        {/* SELECTOR DE TIPO */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tipo de Operación</label>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((type) => (
              <label 
                key={type}
                className={`flex-1 text-center py-3 rounded-xl cursor-pointer text-[10px] font-black uppercase transition-all duration-300 ${
                  currentType === type 
                    ? type === 'INCOME' ? 'bg-emerald-500 text-white shadow-lg' : 
                      type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-lg' : 
                      'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <input type="radio" value={type} className="hidden" {...register('type')} />
                {type === 'INCOME' ? '📥 Ingreso' : type === 'EXPENSE' ? '📤 Egreso' : '🔄 Transf.'}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* MONTO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto ($)</label>
            <input 
              type="number" 
              step="0.01" 
              {...register('amount', { valueAsNumber: true })} 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-black text-xl text-slate-800 transition-all" 
              placeholder="0.00"
            />
            {errors.amount && <p className="text-[10px] text-rose-500 font-bold italic ml-1">{errors.amount.message}</p>}
          </div>

          {/* FECHA */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha de Registro</label>
            <input 
              type="date" 
              {...register('date')} 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" 
            />
          </div>

          {/* CONCEPTO */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Concepto / Detalle</label>
            <input 
              type="text" 
              placeholder="Ej: Pago de alquiler, Venta de remeras..." 
              {...register('concept')} 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-800" 
            />
            {errors.concept && <p className="text-[10px] text-rose-500 font-bold italic ml-1">{errors.concept.message}</p>}
          </div>

          {/* CUENTA */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cuenta de Origen/Destino</label>
            <select {...register('accountId')} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 appearance-none">
              <option value="EFECTIVO">💵 CAJA FUERTE (EFECTIVO)</option>
              <option value="MERCADO_PAGO">📱 MERCADO PAGO</option>
              <option value="BANCO">🏦 BANCO GALICIA / OTRO</option>
            </select>
          </div>

          {/* UNIDAD DE NEGOCIO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unidad de Negocio</label>
            <select {...register('businessUnit')} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 appearance-none">
              <option value="GENERAL">🏠 ADMINISTRACIÓN GENERAL</option>
              <option value="RAICES">🌱 RAÍCES</option>
              <option value="ROJO_SHOWROOM">👗 ROJO SHOWROOM</option>
              <option value="UNIFORMES">👕 UNIFORMES</option>
              <option value="RJ_CO">💼 RJ & CO.</option>
              <option value="BITA_IT">💻 BITA IT</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onCancel} 
            className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest"
          >
            Cancelar Operación
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="px-12 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Sincronizando...' : 'Confirmar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
};