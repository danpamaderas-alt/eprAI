import { useMemo } from 'react';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel 
} from '@tanstack/react-table';
import { type Transaction } from '../schemas/transactionSchema';

interface TransactionTableProps {
  data: Transaction[];
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: Transaction['status']) => void;
}

const columnHelper = createColumnHelper<Transaction>();

export const TransactionTable = ({ data, onDelete, onUpdateStatus }: TransactionTableProps) => {
  
  // 1. Columnas Memoizadas: Rendimiento de nivel profesional
  const columns = useMemo(() => [
    columnHelper.accessor('date', {
      header: 'Fecha',
      cell: (info) => {
        const dateStr = info.getValue();
        if (!dateStr) return <span className="text-slate-400">-</span>;
        // Formateo seguro para evitar saltos de zona horaria
        return (
          <span className="text-slate-500 font-medium text-[11px] tabular-nums">
            {new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        );
      },
    }),
    columnHelper.accessor('concept', {
      header: 'Concepto / Operación',
      cell: (info) => (
        <div className="max-w-[200px] md:max-w-xs">
          <p className="font-black text-slate-800 uppercase text-[11px] leading-tight truncate">
            {info.getValue() || 'SIN CONCEPTO'}
          </p>
          <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono mt-1 inline-block uppercase tracking-tighter">
            ID: {info.row.original.id?.slice(0, 8)}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('businessUnit', {
      header: 'Unidad',
      cell: (info) => {
        const bu = info.getValue() || 'GENERAL';
        const colors: Record<string, string> = {
          GENERAL: 'bg-slate-100 text-slate-600',
          RAICES: 'bg-orange-100 text-orange-700',
          RJ_CO: 'bg-indigo-100 text-indigo-700',
          BITA_IT: 'bg-cyan-100 text-cyan-700',
          ROJO_SHOWROOM: 'bg-rose-100 text-rose-700',
          UNIFORMES: 'bg-emerald-100 text-emerald-700',
        };
        return (
          <span className={`px-2 py-1 text-[9px] font-black tracking-widest rounded-md uppercase border border-white/50 shadow-sm ${colors[bu] || colors.GENERAL}`}>
            {bu.replace('_', ' ')}
          </span>
        );
      },
    }),
    columnHelper.accessor('accountId', {
      header: 'Cuenta',
      cell: (info) => {
        const acc = info.getValue() || 'EFECTIVO';
        return <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{acc.replace('_', ' ')}</span>;
      },
    }),
    columnHelper.accessor('status', {
      header: 'Estado',
      cell: (info) => {
        const status = info.getValue();
        const isPending = status === 'PENDING';
        return (
          <button 
            onClick={() => onUpdateStatus(info.row.original.id, isPending ? 'COMPLETED' : 'PENDING')}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all active:scale-95
              ${isPending 
                ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
              }
            `}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
            {isPending ? 'Pendiente' : 'Pagado'}
          </button>
        );
      },
    }),
    columnHelper.accessor('amount', {
      header: () => <div className="text-right">Monto</div>,
      cell: (info) => {
        const tx = info.row.original;
        const amount = Number(info.getValue()) || 0;
        const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
        
        const isIncome = tx.type === 'INCOME';
        const isTransfer = tx.type === 'TRANSFER';

        return (
          <div className="text-right">
            <span className={`text-sm font-black tabular-nums ${isTransfer ? 'text-blue-600' : isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isTransfer ? '⇅' : isIncome ? '+' : '-'} {formatted}
            </span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <button 
          onClick={() => onDelete(info.row.original.id)} 
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ),
    })
  ], [onDelete, onUpdateStatus]);

  const table = useReactTable({ 
    data, 
    columns, 
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel() 
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <span className="text-5xl mb-4">📖</span>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Sin movimientos registrados.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-200">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/50">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-50">
          {table.getRowModel().rows.map((row) => (
            <tr 
              key={row.id} 
              className={`
                group transition-all 
                ${row.original.status === 'PENDING' ? 'bg-amber-50/30' : 'hover:bg-slate-50/80'}
              `}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`py-3.5 px-6 ${cell.column.id === 'amount' ? 'bg-slate-50/30 group-hover:bg-transparent' : ''}`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};