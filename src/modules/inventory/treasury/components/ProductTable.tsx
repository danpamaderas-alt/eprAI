import { useMemo } from 'react';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable,
  getSortedRowModel 
} from '@tanstack/react-table';
interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface ProductTableProps {
  data: Product[];
  onDelete: (id: string) => void;
  onUpdateStock: (id: string, newStock: number) => void;
}

const columnHelper = createColumnHelper<Product>();

export const ProductTable = ({ data, onDelete, onUpdateStock }: ProductTableProps) => {
  
  // 1. Columnas Memoizadas: Máximo rendimiento al ajustar stock
  const columns = useMemo(() => [
    columnHelper.accessor('sku', {
      header: 'SKU / Código',
      cell: (info) => (
        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono text-[10px] font-black tracking-tighter border border-slate-200">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Producto',
      cell: (info) => (
        <div className="max-w-[200px]">
          <p className="font-black text-slate-800 text-[11px] uppercase leading-tight truncate">{info.getValue()}</p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{info.row.original.category}</p>
        </div>
      ),
    }),
    columnHelper.accessor('price', {
      header: 'Precio Unit.',
      cell: (info) => {
        const amount = Number(info.getValue()) || 0;
        const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
        return <span className="font-black text-slate-700 tabular-nums text-sm">{formatted}</span>;
      },
    }),
    columnHelper.accessor('stock', {
      header: 'Stock / Min',
      cell: (info) => {
        const stock = Number(info.getValue());
        const min = Number(info.row.original.minStock);
        return (
          <div className="flex flex-col">
            <div className="flex items-end gap-1">
              <span className={`text-sm font-black ${stock <= min ? 'text-rose-600' : 'text-slate-900'}`}>{stock}</span>
              <span className="text-[10px] text-slate-400 font-bold mb-0.5">/ {min} un.</span>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Disponibilidad',
      cell: (info) => {
        const status = info.getValue();
        const styles = {
          ACTIVE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          LOW_STOCK: 'bg-amber-50 text-amber-600 border-amber-100',
          OUT_OF_STOCK: 'bg-rose-50 text-rose-600 border-rose-100',
        };
        const labels = { ACTIVE: 'ACTIVO', LOW_STOCK: 'STOCK BAJO', OUT_OF_STOCK: 'AGOTADO' };
        
        return (
          <span className={`px-2 py-1 text-[9px] font-black rounded-md border shadow-sm ${styles[status]}`}>
            {labels[status]}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <div className="text-right pr-2">Ajuste de Stock</div>,
      cell: (info) => {
        const product = info.row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button 
                onClick={() => onUpdateStock(product.id, Math.max(0, product.stock - 1))}
                disabled={product.stock <= 0}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 shadow-sm transition-all active:scale-90 disabled:opacity-30 disabled:hover:bg-white"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
              </button>
              
              <div className="w-8 text-center font-black text-xs text-slate-500 tabular-nums">
                {product.stock}
              </div>

              <button 
                onClick={() => onUpdateStock(product.id, product.stock + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 shadow-sm transition-all active:scale-90"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
            
            <button 
              onClick={() => onDelete(product.id)}
              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              title="Eliminar producto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      },
    })
  ], [onDelete, onUpdateStock]);
// eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns, 
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel() 
  });

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 opacity-30">
        <span className="text-6xl mb-4">🛒</span>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Catálogo Vacío</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
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
                group transition-all hover:bg-slate-50/80
                ${row.original.status === 'OUT_OF_STOCK' ? 'bg-rose-50/20' : ''}
              `}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-3 px-6">
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