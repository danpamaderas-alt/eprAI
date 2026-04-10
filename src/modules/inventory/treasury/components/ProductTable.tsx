import { useMemo } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable, getSortedRowModel } from '@tanstack/react-table';
import Swal from 'sweetalert2';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const columnHelper = createColumnHelper<any>();

export const ProductTable = ({ data, onDelete, onUpdateStock, onEditFullProduct }: any) => {
  const flatData = useMemo(() => {
    const res: any[] = [];
    data.forEach((p: any) => {
      if (p.variations?.length) {
        p.variations.forEach((v: any) => res.push({ ...p, variationId: v.id, displaySize: v.size, displayColor: v.color, displayStock: v.stock }));
      } else {
        res.push({ ...p, displaySize: '-', displayColor: '-', displayStock: p.stock });
      }
    });
    return res;
  }, [data]);

  const columns = useMemo(() => [
    columnHelper.accessor('sku', { header: 'SKU', cell: i => <span className="font-mono text-[9px] font-black dark:text-slate-400">{i.getValue()}</span> }),
    columnHelper.accessor('name', { header: 'Producto', cell: i => (
      <div className="max-w-[150px]">
        <p className="font-black text-[11px] uppercase dark:text-white truncate">{i.getValue()}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase">{i.row.original.category}</p>
      </div>
    )}),
    columnHelper.accessor('displaySize', { header: 'Talle', cell: i => <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-black text-[10px]">{i.getValue()}</span> }),
    columnHelper.accessor('displayColor', { header: 'Color', cell: i => <span className="text-[10px] font-black uppercase dark:text-slate-300">{i.getValue()}</span> }),
    columnHelper.accessor('location', { header: '📍 Ubicación', cell: i => <span className="text-[10px] font-black text-blue-500 italic uppercase">{i.getValue() || '---'}</span> }),
    columnHelper.accessor('price', { header: 'Precio/Costo', cell: i => (
      <div className="flex flex-col">
        <span className="font-black text-sm dark:text-slate-200">{ARS.format(i.getValue())}</span>
        {i.row.original.cost > 0 && <span className="text-[8px] font-bold text-rose-500 italic">{ARS.format(i.row.original.cost)}</span>}
      </div>
    )}),
    columnHelper.accessor('displayStock', { header: 'Stock', cell: i => <span className={`font-black ${i.getValue() <= i.row.original.minStock ? 'text-rose-600' : 'dark:text-white'}`}>{i.getValue()}</span> }),
    columnHelper.display({
      id: 'actions',
      cell: i => (
        <div className="flex items-center justify-end gap-2">
          {/* LÁPIZ REPARADO QUE BUSCA EL ID ORIGINAL */}
          <button onClick={() => { const p = data.find((x:any)=>x.id === i.row.original.id); p && onEditFullProduct(p); }} className="p-2 text-slate-400 hover:text-blue-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={() => onUpdateStock(i.row.original.id, Math.max(0, i.row.original.displayStock - 1), i.row.original.variationId)} className="w-6 h-6 dark:text-white font-bold">-</button>
            <span className="w-8 text-center text-xs font-black text-blue-600">{i.row.original.displayStock}</span>
            <button onClick={() => onUpdateStock(i.row.original.id, i.row.original.displayStock + 1, i.row.original.variationId)} className="w-6 h-6 dark:text-white font-bold">+</button>
          </div>

          <button onClick={() => Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(r => r.isConfirmed && onDelete(i.row.original.id))} className="p-2 text-slate-300 hover:text-rose-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )
    })
  ], [data, onDelete, onUpdateStock, onEditFullProduct]);

  const table = useReactTable({ data: flatData, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="border-b dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80">
              {hg.headers.map(h => <th key={h.id} className="py-3 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              {row.getVisibleCells().map(cell => <td key={cell.id} className="py-3 px-6">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};