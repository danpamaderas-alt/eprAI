import { useMemo } from 'react';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable 
} from '@tanstack/react-table';
import { type Transaction } from '../schemas/transactionSchema';
import Swal from 'sweetalert2';
import { useTreasuryStore } from '../store/useTreasuryStore';

interface TransactionTableProps {
  data: Transaction[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: 'PENDING' | 'COMPLETED') => void;
}

const columnHelper = createColumnHelper<Transaction>();

export const TransactionTable = ({ data, onDelete, onUpdateStatus }: TransactionTableProps) => {
  const resolvePayment = useTreasuryStore(state => state.resolvePayment);

  // ----------------------------------------------------------------------
  // LÓGICA CENTRALIZADA DE COBRO (Sirve para Móvil y Desktop)
  // ----------------------------------------------------------------------
  const handleStatusClick = async (tx: Transaction) => {
    const isPending = tx.status === 'PENDING';
    
    if (!isPending) {
      // Si está completado y apretás, lo vuelve a hacer Pendiente (por si te equivocaste)
      onUpdateStatus(tx.id, 'PENDING');
      return;
    }

    // SI ESTÁ PENDIENTE: Abrimos el cartel inteligente de cobro/pago
    const { value: formValues } = await Swal.fire({
      title: tx.type === 'INCOME' ? 'Registrar Cobro' : 'Registrar Pago',
      html: `
        <div class="text-left space-y-4">
          <div class="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4 border border-blue-200">
            Total pendiente: <strong class="text-lg font-black tabular-nums">$${tx.amount}</strong>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Monto de la operación ($)</label>
            <input id="partial-amount" type="number" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-lg text-slate-800" value="${tx.amount}" max="${tx.amount}">
            <p class="text-[10px] text-slate-400 mt-1">Modificá el valor si es un pago parcial.</p>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Destino / Origen</label>
            <select id="partial-method" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700">
              <option value="EFECTIVO" ${tx.paymentMethod === 'EFECTIVO' ? 'selected' : ''}>💵 EFECTIVO</option>
              <option value="MERCADO_PAGO" ${tx.paymentMethod === 'MERCADO_PAGO' ? 'selected' : ''}>📱 MERCADO PAGO</option>
              <option value="BANCO" ${tx.paymentMethod === 'BANCO' ? 'selected' : ''}>🏦 BANCO / TRANSF.</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const amount = (document.getElementById('partial-amount') as HTMLInputElement).value;
        const method = (document.getElementById('partial-method') as HTMLSelectElement).value;
        if (!amount || Number(amount) <= 0) {
          Swal.showValidationMessage('Ingresá un monto válido mayor a 0');
          return false;
        }
        return { amount: Number(amount), method };
      }
    });

    if (formValues) {
      try {
        await resolvePayment(tx.id, formValues.amount, formValues.method);
        Swal.fire({ icon: 'success', title: '¡Registrado!', timer: 1500, showConfirmButton: false });
      } catch (e) {
        Swal.fire('Error', 'No se pudo actualizar el pago', 'error');
      }
    }
  };

  const handleDeleteClick = (id: string) => {
    Swal.fire({
      title: '¿Eliminar movimiento?',
      text: 'Esta acción borrará el registro de la Tesorería.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sí, eliminar'
    }).then((res) => {
      if (res.isConfirmed) onDelete(id);
    });
  };

  // ----------------------------------------------------------------------
  // CONFIGURACIÓN DE COLUMNAS (Para la versión PC)
  // ----------------------------------------------------------------------
  const columns = useMemo(() => [
    columnHelper.accessor('date', {
      header: 'Fecha',
      cell: (info) => {
        const dateStr = info.getValue();
        if (!dateStr) return <span className="text-xs text-slate-500">-</span>;
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return <span className="text-xs text-slate-500 font-medium">{`${day}/${month}/${year}`}</span>;
      }
    }),
    columnHelper.accessor('type', {
      header: 'Tipo',
      cell: (info) => {
        const val = String(info.getValue());
        if (val === 'INCOME') return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">Ingreso</span>;
        if (val === 'EXPENSE') return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-black uppercase">Egreso</span>;
        if (val === 'TRANSFER') return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-black uppercase">Transf.</span>;
        return <span className="text-[10px] uppercase font-bold">{val}</span>;
      }
    }),
    columnHelper.accessor('description', { 
      header: 'Concepto / Detalle',
      cell: (info) => <span className="text-xs font-bold text-slate-800">{info.getValue()}</span>
    }),
    columnHelper.accessor('category', {
      header: 'Categoría',
      cell: (info) => <span className="text-[10px] text-slate-500 font-bold uppercase">{info.getValue()}</span>
    }),
    columnHelper.accessor('amount', {
      header: 'Monto',
      cell: (info) => {
        const amount = Number(info.getValue()) || 0;
        const type = String(info.row.original.type);
        const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
        const color = type === 'INCOME' ? 'text-emerald-600' : type === 'EXPENSE' ? 'text-rose-600' : 'text-blue-600';
        return <span className={`font-black tabular-nums ${color}`}>{type === 'EXPENSE' ? '- ' : ''}{formatted}</span>;
      }
    }),
    columnHelper.accessor('paymentMethod', { 
      header: 'Cuenta',
      cell: (info) => {
        const val = String(info.getValue() || '').replace('_', ' ');
        return <span className="text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded uppercase">{val}</span>;
      }
    }),
    columnHelper.accessor('businessUnit', {
      header: 'Unidad',
      cell: (info) => {
        const val = String(info.getValue() || '').replace('_', ' ');
        return <span className="text-[10px] font-black text-slate-500 uppercase">{val}</span>;
      }
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: (info) => {
        const isPending = info.getValue() === 'PENDING';
        return (
          <button 
            onClick={() => handleStatusClick(info.row.original)}
            className={`text-[9px] font-black px-2 py-1.5 rounded transition-colors uppercase cursor-pointer border ${
              isPending 
                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:shadow-sm' 
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:shadow-sm'
            }`}
          >
            {isPending ? '⏳ Pendiente' : '✅ Pagado'}
          </button>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button 
          onClick={() => handleDeleteClick(info.row.original.id)}
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )
    })
  ], [onDelete, onUpdateStatus, resolvePayment]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  if (!data || data.length === 0) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-300">
        <span className="text-4xl mb-2">💸</span>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sin movimientos registrados</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      
      {/* ====================================================================
          VISTA MÓVIL (Lista de Tarjetas - Solo se ve en celulares)
          ==================================================================== */}
      <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
        {data.map(tx => {
          const isPending = tx.status === 'PENDING';
          const isIncome = tx.type === 'INCOME';
          const isExpense = tx.type === 'EXPENSE';
          
          const formattedDate = tx.date ? (() => {
            const [y, m, d] = tx.date.split('T')[0].split('-');
            return `${d}/${m}/${y}`;
          })() : '-';

          const formattedAmount = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(tx.amount || 0);

          return (
            <div key={tx.id} className={`relative bg-white p-4 rounded-2xl border shadow-sm flex flex-col gap-3 ${isPending ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'}`}>
              
              {/* Botón Borrar Absoluto */}
              <button onClick={() => handleDeleteClick(tx.id)} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>

              <div className="flex justify-between items-center pr-6">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${isIncome ? 'bg-emerald-100 text-emerald-700' : isExpense ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                    {isIncome ? 'Ingreso' : isExpense ? 'Egreso' : 'Transf.'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{formattedDate}</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 leading-tight">{tx.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{tx.businessUnit.replace('_', ' ')}</span>
                  <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{tx.paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-1">
                <span className={`text-xl font-black tabular-nums ${isIncome ? 'text-emerald-600' : isExpense ? 'text-rose-600' : 'text-blue-600'}`}>
                  {isExpense ? '- ' : ''}{formattedAmount}
                </span>
                
                <button 
                  onClick={() => handleStatusClick(tx)}
                  className={`text-[10px] font-black px-3 py-2 rounded-lg transition-colors uppercase border shadow-sm ${
                    isPending 
                      ? 'bg-amber-100 text-amber-700 border-amber-200 active:bg-amber-200' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200 active:bg-emerald-100'
                  }`}
                >
                  {isPending ? '⏳ Pendiente' : '✅ Pagado'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* ====================================================================
          VISTA DESKTOP (Tabla ancha - Solo se ve en pantallas grandes)
          ==================================================================== */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-slate-200 bg-slate-50">
                {hg.headers.map(header => (
                  <th key={header.id} className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="py-3 px-6">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};