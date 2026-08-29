import { useMemo, useState, useEffect } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable, getSortedRowModel } from '@tanstack/react-table';
import { supabase } from '../../../../lib/supabase'; // 🚀 CONEXIÓN A SUPABASE PARA LEER LOS NICHOS
import Swal from 'sweetalert2';
import { ARS } from '../../../../shared/utils/format';

interface Variation {
  id: string;
  size: string;
  color: string;
  stock: number;
}

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  variationId?: string;
  displaySize: string;
  displayColor: string;
  displayStock: number;
  variations?: Variation[];
  niche_id?: string; // 🚀 AGREGAMOS EL CAMPO NICHO
}

interface ProductTableProps {
  data: ProductRow[];
  onDelete: (id: string) => void;
  deleteVariation: (id: string, variationId: string) => void;
  onUpdateStock: (id: string, stock: number, variationId?: string) => void;
  onEditFullProduct: (product: ProductRow) => void;
}

const columnHelper = createColumnHelper<ProductRow>();

export const ProductTable = ({ data, onDelete, deleteVariation, onUpdateStock, onEditFullProduct }: ProductTableProps) => {
  // 🚀 ESTADO PARA GUARDAR LOS NOMBRES DE LOS NICHOS
  const [niches, setNiches] = useState<{id: string, name: string}[]>([]);

  // 🚀 BUSCAMOS LOS NICHOS PARA TRADUCIR EL ID A TEXTO VISUAL
  useEffect(() => {
    const fetchNiches = async () => {
      const { data } = await supabase.from('niches').select('id, name');
      if (data) setNiches(data);
    };
    fetchNiches();
  }, []);

  const flatData = useMemo(() => {
    const res: ProductRow[] = [];
    if (!data) return [];
    data.forEach((p: ProductRow) => {
      if (p.variations?.length) {
        p.variations.forEach((v: Variation) => res.push({ ...p, variationId: v.id, displaySize: v.size, displayColor: v.color, displayStock: v.stock }));
      } else {
        res.push({ ...p, displaySize: '-', displayColor: '-', displayStock: p.stock });
      }
    });
    return res;
  }, [data]);

  const columns = useMemo(() => [
    columnHelper.accessor('sku', { 
      header: 'SKU', 
      cell: i => <span className="font-mono text-xs font-black text-slate-400 uppercase">{i.getValue()}</span> 
    }),
    columnHelper.accessor('name', { 
      header: 'Producto', 
      cell: i => {
        // 🚀 LÓGICA PARA ENCONTRAR Y MOSTRAR LA ETIQUETA DEL NICHO
        const rowNicheId = i.row.original.niche_id;
        const matchedNiche = niches.find(n => n.id === rowNicheId);
        
        return (
          <div className="max-w-[250px]">
            <p className="font-black text-sm uppercase dark:text-white truncate">{i.getValue()}</p>
            <div className="flex items-center gap-2 mt-1">
              {matchedNiche && (
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded border border-indigo-200 dark:border-indigo-800">
                  {matchedNiche.name}
                </span>
              )}
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{i.row.original.category}</p>
            </div>
          </div>
        );
      }
    }),
    columnHelper.accessor('displaySize', { 
      header: 'Talle', 
      cell: i => <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs uppercase">{i.getValue()}</span> 
    }),
    columnHelper.accessor('displayStock', { 
      header: 'Stock', 
      cell: i => (
        <span className={`font-black text-base tabular-nums ${i.getValue() <= i.row.original.minStock ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
          {i.getValue()}
        </span>
      )
    }),
    columnHelper.accessor('price', { 
      header: 'Precio', 
      cell: i => <span className="font-black text-base text-emerald-600 tabular-nums">{ARS.format(i.getValue())}</span> 
    }),
    columnHelper.display({
      id: 'actions',
      cell: i => (
        <div className="flex items-center justify-end gap-3">
          {/* BOTÓN EDITAR */}
          <button onClick={() => onEditFullProduct(i.row.original)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          
          {/* CONTROL DE STOCK RÁPIDO */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button onClick={() => onUpdateStock(i.row.original.id, Math.max(0, i.row.original.displayStock - 1), i.row.original.variationId)} className="w-8 h-8 flex items-center justify-center dark:text-white font-black hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">-</button>
            <button onClick={() => onUpdateStock(i.row.original.id, i.row.original.displayStock + 1, i.row.original.variationId)} className="w-8 h-8 flex items-center justify-center dark:text-white font-black hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">+</button>
          </div>

          {/* BOTÓN BORRAR */}
          <button 
            onClick={() => {
              const isVar = !!i.row.original.variationId;
              Swal.fire({
                title: isVar ? '¿Borrar talle?' : '¿Borrar producto?',
                text: isVar ? `Se eliminará el talle ${i.row.original.displaySize}` : 'Se borrará el producto completo.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'BORRAR',
                cancelButtonText: 'CANCELAR'
              }).then((r) => {
                if(r.isConfirmed) {
                  if (isVar && i.row.original.variationId) {
                    deleteVariation(i.row.original.id, i.row.original.variationId);
                  } else {
                    onDelete(i.row.original.id);
                  }
                }
              });
            }} 
            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )
    })
  ], [onDelete, deleteVariation, onUpdateStock, onEditFullProduct, niches]); // 🚀 AGREGAMOS NICHES COMO DEPENDENCIA

  const table = useReactTable({ 
    data: flatData, 
    columns, 
    getCoreRowModel: getCoreRowModel(), 
    getSortedRowModel: getSortedRowModel() 
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-y-2 px-4">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => <th key={h.id} className="py-3 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-colors group">
              {row.getVisibleCells().map((cell, idx) => (
                <td key={cell.id} className={`py-4 px-6 ${idx === 0 ? 'rounded-l-2xl' : ''} ${idx === row.getVisibleCells().length - 1 ? 'rounded-r-2xl' : ''}`}>
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