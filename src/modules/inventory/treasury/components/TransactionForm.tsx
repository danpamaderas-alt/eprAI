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
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors, isSubmitting } 
  } = useForm<TransactionFormValues>({
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

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-w-4xl mx-auto">
      
      {/* CABECERA RESPONSIVE */}
      <div className="bg-slate-50 px-4 py-4 sm:px-8 sm:py-5 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest italic">Registrar Movimiento</h3>
          <p className="hidden sm:block text-[10px] text-blue-600 font-bold uppercase mt-1">Gestión de Tesorería Digital</p>
        </div>
        <button 
          type="button" 
          onClick={onCancel} 
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 transition-all font-black"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit((data) => onSubmitSuccess(data as any))} className="p-4 sm:p-8 space-y-6 sm:space-y-8">
        
        {/* SELECTOR DE TIPO (Stackeado en móvil muy chico, flex en el resto) */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Tipo de Operación</label>
          <div className="grid grid-cols-1 sm:flex bg-slate-100 p-1.5 rounded-xl sm:rounded-2xl gap-1">
            {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((type) => (
              <label 
                key={type}
                className={`flex-1 text-center py-3 sm:py-3 rounded-lg sm:rounded-xl cursor-pointer text-[10px] font-black uppercase transition-all duration-300 ${
                  currentType === type 
                    ? type === 'INCOME' ? 'bg-emerald-500 text-white shadow-md' : 
                      type === 'EXPENSE' ? 'bg-rose-500 text-white shadow-md' : 
                      'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <input type="radio" value={type} className="hidden" {...register('type')} />
                {type === 'INCOME' ? '📥 Ingreso' : type === 'EXPENSE' ? '📤 Egreso' : '🔄 Transf.'}
              </label>
            ))}
          </div>
        </div>

        {/* GRILLA DE DATOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* MONTO (Full width en móvil) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Importe ($)</label>
            <input 
              type="number" 
              step="0.01" 
              inputMode="decimal" // Abre el teclado numérico en celulares
              {...register('amount', { valueAsNumber: true })} 
              className={`w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border ${errors.amount ? 'border-rose-300' : 'border-slate-200'} rounded-xl sm:rounded-2xl outline-none focus:border-blue-500 font-black text-lg sm:text-xl text-slate-800 transition-all`} 
              placeholder="0.00"
            />
          </div>

          {/* FECHA (Full width en móvil) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
            <input 
              type="date" 
              {...register('date')} 
              className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" 
            />
          </div>

          {/* CATEGORÍA */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categoría</label>
            <select 
              {...register('category')} 
              className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 appearance-none cursor-pointer"
            >
              {CATEGORIES[currentType].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* MÉTODO DE PAGO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Caja / Cuenta</label>
            <select {...register('paymentMethod')} className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 appearance-none">
              <option value="EFECTIVO">💵 EFECTIVO</option>
              <option value="MERCADO_PAGO">📱 MERCADO PAGO</option>
              <option value="BANCO">🏦 BANCO / TRANSF.</option>
            </select>
          </div>

          {/* DESCRIPCIÓN (Ocupa todo el ancho siempre) */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Detalle / Concepto</label>
            <textarea 
              rows={2}
              placeholder={currentType === 'EXPENSE' ? 'Ej: Factura de Telas, Pago a Proveedor...' : 'Ej: Venta del día, Cobro de pedido...'} 
              {...register('description')} 
              className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-800 resize-none" 
            />
          </div>

          {/* UNIDAD DE NEGOCIO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Negocio</label>
            <select {...register('businessUnit')} className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 appearance-none">
              <option value="ROJO_SHOWROOM">👗 ROJO SHOWROOM</option>
              <option value="UNIFORMES">👕 UNIFORMES</option>
              <option value="RAICES">🌱 RAÍCES</option>
              <option value="BITA_IT">💻 BITA IT</option>
              <option value="GENERAL">🏠 GENERAL</option>
            </select>
          </div>

          {/* ESTADO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado</label>
            <select {...register('status')} className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 appearance-none">
              <option value="COMPLETED">✅ PAGADO / COBRADO</option>
              <option value="PENDING">⏳ PENDIENTE</option>
            </select>
          </div>
        </div>

        {/* BOTONERA FINAL (Vertical en móvil, horizontal en desktop) */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onCancel} 
            className="w-full sm:w-auto px-8 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors tracking-widest"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className={`w-full sm:w-auto px-12 py-4 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50 text-white ${
              currentType === 'INCOME' ? 'bg-emerald-600 shadow-emerald-600/20' : 
              currentType === 'EXPENSE' ? 'bg-rose-600 shadow-rose-600/20' : 
              'bg-blue-600 shadow-blue-600/20'
            }`}
          >
            {isSubmitting ? 'Sincronizando...' : 'Grabar Movimiento'}
          </button>
        </div>
      </form>
    </div>
  );
};