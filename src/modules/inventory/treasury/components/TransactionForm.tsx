import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { transactionSchema, type TransactionFormValues } from '../schemas/transactionSchema';

interface TransactionFormProps {
  onSubmitSuccess: (data: TransactionFormValues) => void;
  onCancel: () => void;
}

const CATEGORIES = {
  INCOME: ['VENTA', 'INVERSIÓN', 'AJUSTE POSITIVO', 'OTROS INGRESOS'],
  EXPENSE: ['PROVEEDORES', 'ALQUILER', 'SERVICIOS', 'SUELDOS', 'PUBLICIDAD', 'LOGÍSTICA', 'INSUMOS', 'AJUSTE NEGATIVO'],
  TRANSFER: ['TRANSFERENCIA ENTRE CUENTAS']
};

export const TransactionForm = ({ onSubmitSuccess, onCancel }: TransactionFormProps) => {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: { 
      type: 'INCOME', 
      date: new Date().toISOString().split('T')[0], 
      amount: 0, 
      paymentMethod: 'EFECTIVO', 
      businessUnit: 'GENERAL', 
      status: 'COMPLETED', 
      category: 'VENTA', 
      description: '' 
    },
  });

  const currentType = useWatch({ control, name: 'type' }) as 'INCOME' | 'EXPENSE' | 'TRANSFER';

  const inputClass = `w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 font-bold text-slate-700 dark:text-slate-200 transition-colors`;
  const labelClass = `text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1`;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300">
      <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest italic">Registrar Movimiento</h3>
        <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">✕</button>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmitSuccess(data as any))} className="p-8 space-y-8">
        
        {/* SELECTOR DE TIPO */}
        <div className="space-y-3">
          <label className={labelClass}>Tipo de Operación</label>
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 border dark:border-slate-700">
            {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((type) => (
              <label key={type} className={`flex-1 text-center py-3 rounded-xl cursor-pointer text-[10px] font-black uppercase transition-colors ${currentType === type ? (type === 'INCOME' ? 'bg-emerald-500 text-white shadow-md' : type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-md' : 'bg-blue-600 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>
                <input type="radio" value={type} className="hidden" {...register('type')} />
                {type === 'INCOME' ? '📥 Ingreso' : type === 'EXPENSE' ? '📤 Egreso' : '🔄 Transf.'}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={labelClass}>Importe ($)</label>
            <input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} className={`${inputClass} text-xl ${errors.amount ? 'border-rose-400' : ''}`} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Fecha</label>
            <input type="date" {...register('date')} className={inputClass} />
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Categoría</label>
            <select {...register('category')} className={inputClass}>
              {CATEGORIES[currentType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Caja / Cuenta</label>
            <select {...register('paymentMethod')} className={inputClass}>
              <option value="EFECTIVO">💵 EFECTIVO</option>
              <option value="MERCADO_PAGO">📱 MERCADO PAGO</option>
              <option value="BANCO">🏦 BANCO / TRANSF.</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className={labelClass}>Detalle / Concepto</label>
            <textarea rows={2} {...register('description')} className={`${inputClass} resize-none`} placeholder="Ej: Pago a proveedores, Venta Showroom..." />
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Negocio</label>
            <select {...register('businessUnit')} className={inputClass}>
              <option value="ROJO_SHOWROOM">👗 ROJO SHOWROOM</option>
              <option value="UNIFORMES">👕 UNIFORMES</option>
              <option value="RAICES">🌱 RAÍCES</option>
              <option value="BITA_IT">💻 BITA IT</option>
              <option value="GENERAL">🏠 GENERAL</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>Estado Inicial</label>
            <select {...register('status')} className={inputClass}>
              <option value="COMPLETED">✅ PAGADO / COBRADO</option>
              <option value="PENDING">⏳ PENDIENTE</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
          <button type="button" onClick={onCancel} className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors tracking-widest">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className={`px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-colors transition-transform active:scale-95 text-white ${currentType === 'INCOME' ? 'bg-emerald-600' : currentType === 'EXPENSE' ? 'bg-rose-600' : 'bg-blue-600'}`}>
            {isSubmitting ? 'Sincronizando...' : 'Grabar Movimiento'}
          </button>
        </div>
      </form>
    </div>
  );
};