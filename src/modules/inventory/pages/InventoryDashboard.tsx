import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import Swal from 'sweetalert2';

export const InventoryDashboard = memo(() => {
  const { products, fetchProducts, isLoading, reserveStock, processPersonalization } = useInventoryStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const handleReserve = useCallback(async (pId: string) => {
    const { value: qty } = await Swal.fire({ title: 'Reservar para Taller', input: 'number', showCancelButton: true });
    if (qty > 0) await reserveStock(pId, Number(qty));
  }, [reserveStock]);

  const handleFinish = useCallback(async (pId: string) => {
    const { value: qty } = await Swal.fire({ title: 'Terminar Prenda', input: 'number', showCancelButton: true });
    if (qty > 0) await processPersonalization(pId, Number(qty));
  }, [processPersonalization]);

  return (
    <div className="space-y-6 p-4">
      <header className="bg-slate-900 p-8 rounded-[2rem] text-white flex justify-between items-center">
        <h1 className="text-2xl font-black italic">STOCK <span className="text-blue-500">DUAL</span></h1>
        <button onClick={fetchProducts} className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">{isLoading ? '...' : 'Actualizar'}</button>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-6">Artículo</th>
              <th className="p-6 text-center">Básico</th>
              <th className="p-6 text-center text-amber-500">En Taller</th>
              <th className="p-6 text-center text-emerald-500">Listo</th>
              <th className="p-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {filteredProducts.map(p => (
              <tr key={p.id} className="dark:text-white">
                <td className="p-6 font-bold uppercase text-xs">{p.name}</td>
                <td className="p-6 text-center">{p.base_stock_qty}</td>
                <td className="p-6 text-center text-amber-500 font-bold">{p.reserved_stock_qty || 0}</td>
                <td className="p-6 text-center text-emerald-500 font-bold">{p.finished_stock_qty || 0}</td>
                <td className="p-6 text-right flex justify-end gap-2">
                  <button onClick={() => handleReserve(p.id)} className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Reserva</button>
                  <button onClick={() => handleFinish(p.id)} className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Terminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});