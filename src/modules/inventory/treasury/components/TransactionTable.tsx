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

  const handleStatusClick = async (tx: Transaction) => {
    const isPending = tx.status === 'PENDING';
    if (!isPending) {
      onUpdateStatus(tx.id, 'PENDING');
      return;
    }

    const { value: formValues } = await Swal.fire({
      title: tx.type === 'INCOME' ? 'Registrar Cobro' : 'Registrar Pago',
      // Agregamos clases de modo oscuro a SweetAlert2 mediante HTML
      html: `
        <div class="text-left space-y-4">
          <div class="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-sm mb-4 border border-blue-200 dark:border-blue-800">
            Total pendiente: <strong class="text-lg font-black tabular-nums">$${tx.amount}</strong>
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Monto de la operación ($)</label>
            <input id="partial-amount" type="number" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 font-black text-lg text-slate-800 dark:text-white" value="${tx.amount}" max="${tx.amount}">
          </div>
          <div>
            <label class="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Destino / Origen</label>
            <select id="partial-method" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 dark:text-slate-200">
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
      // Estilos para el popup de Swal
      customClass: {
        popup: 'dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-3xl'
      },
      preConfirm: () => {
        const amount = (document.getElementById('partial-amount') as HTMLInputElement).value;
        const method = (document.getElementById('partial-method') as HTMLSelectElement).value;
        if (!amount || Number(amount) <= 0) {
          Swal.showValidationMessage('Ingresá un monto válido');
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
        Swal.fire('Error', 'No se pudo actualizar', 'error');
      }
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('date', {
      header: 'Fecha',
      cell: (info) => {
        const dateStr = info.getValue();
        if (!dateStr) return <span className="text-xs text-slate-500">-</span>;
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{`${day}/${month}/${year}`}</span>;
      }
    }),
    columnHelper.accessor('type', {
      header: 'Tipo',
      cell: (info) => {
        const val = String(info.getValue());
        if (val === 'INCOME') return <span className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-[10px] font-black uppercase">Ingreso</span>;
        if (val === 'EXPENSE') return <span className="bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 px-2 py-1 rounded text-[10px] font-black uppercase">Egreso</span>;
        return <span className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded text-[10px] font-black uppercase">Transf.</span>;
      }
    }),
    columnHelper.accessor('description', { 
      header: 'Concepto',
      cell: (info) => <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{info.getValue()}</span>
    }),
    columnHelper.accessor('amount', {
      header: 'Monto',
      cell: (info) => {
        const amount = Number(info.getValue()) || 0;
        const type = String(info.row.original.type);
        const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
        const color = type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : type === 'EXPENSE' ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400';
        return <span className={`font-black tabular-nums ${color}`}>{type === 'EXPENSE' ? '- ' : ''}{formatted}</span>;
      }
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: (info) => {
        const isPending = info.getValue() === 'PENDING';
        return (
          <button 
            onClick={() => handleStatusClick(info.row.original)}
            className={`text-[9px] font-black px-2 py-1.5 rounded transition-colors uppercase border ${
              isPending 
                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100' 
                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100'
            }`}
          >
            {isPending ? '⏳ Pendiente' : '✅ Pagado'}
          </button>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      cell: (info) => (
        <button onClick={() => onDelete(info.row.original.id)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )
    })
  ], [onDelete, onUpdateStatus, resolvePayment]);

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  if (!data || data.length === 0) return <div className="p-16 text-center text-slate-300 dark:text-slate-600 font-black uppercase text-[10px] tracking-widest">Sin movimientos registrados</div>;

  return (
    <div className="w-full">
      {/* VISTA MÓVIL */}
      <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
        {data.map(tx => (
          <div key={tx.id} className={`p-4 rounded-2xl border transition-colors ${tx.status === 'PENDING' ? 'bg-amber-50/10 border-amber-200/50' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-slate-400">{tx.date?.split('T')[0]}</span>
              <button onClick={() => handleStatusClick(tx)} className={`text-[9px] font-black px-2 py-1 rounded uppercase border ${tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                {tx.status === 'PENDING' ? '⏳ Pendiente' : '✅ Pagado'}
              </button>
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{tx.description}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{tx.paymentMethod.replace('_', ' ')}</span>
              <span className={`text-lg font-black ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>${tx.amount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                {hg.headers.map(header => (
                  <th key={header.id} className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
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