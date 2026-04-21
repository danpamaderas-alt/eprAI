import { useMemo, useEffect } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { TrendingUp, DollarSign, PieChart, PackageOpen } from 'lucide-react';

export const FinancialDashboard = () => {
  const { products, inventory, fetchAllCatalogs, isLoading } = useCatalogStore();

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  // 🧮 CÁLCULOS FINANCIEROS MAESTROS
  const { patrimonioCosto, valorVentaPotencial, margenGanancia, margenPorcentaje, totalItems } = useMemo(() => {
    if (!products || !inventory) return { patrimonioCosto: 0, valorVentaPotencial: 0, margenGanancia: 0, margenPorcentaje: 0, totalItems: 0 };
    
    let costoTotal = 0;
    let ventaTotal = 0;
    let items = 0;

    products.forEach(p => {
      const costo = p.cost_price || 0;
      const precioVenta = p.price || 0;
      
      const productVariants = inventory.filter(v => v.product_id === p.id);
      const stockDelProducto = productVariants.reduce((sum, v) => sum + v.stock_quantity, 0);
      
      if (stockDelProducto > 0) {
        costoTotal += (stockDelProducto * costo);
        ventaTotal += (stockDelProducto * precioVenta);
        items += stockDelProducto;
      }
    });
    
    const ganancia = ventaTotal - costoTotal;
    const porcentaje = costoTotal > 0 ? (ganancia / costoTotal) * 100 : 0;

    return { 
      patrimonioCosto: costoTotal, 
      valorVentaPotencial: ventaTotal, 
      margenGanancia: ganancia,
      margenPorcentaje: porcentaje,
      totalItems: items
    };
  }, [products, inventory]);

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">CENTRO FINANCIERO</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest mt-1">Análisis de Patrimonio y Rentabilidad</p>
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 flex justify-center text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">Calculando métricas...</div>
      ) : (
        <>
          {/* 📊 TARJETAS PRINCIPALES (KPIs) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tarjeta 1: Costo (Patrimonio Real) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <PackageOpen className="w-24 h-24 text-blue-600" />
              </div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor de Costo Físico</h3>
                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{formatMoney(patrimonioCosto)}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold uppercase">
                  <span>En Stock: {totalItems} prendas</span>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Venta Potencial */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign className="w-24 h-24 text-emerald-600" />
              </div>
              <div className="relative z-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor de Venta Estimado</h3>
                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{formatMoney(valorVentaPotencial)}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold uppercase">
                  <span>Facturación Total Máxima</span>
                </div>
              </div>
            </div>

            {/* Tarjeta 3: Margen de Ganancia (EL MÁS IMPORTANTE) */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-20">
                <TrendingUp className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10 text-white">
                <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Ganancia Potencial Bruta</h3>
                <p className="text-4xl font-black tracking-tighter">{formatMoney(margenGanancia)}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest">
                  <PieChart className="w-4 h-4" />
                  <span>Rentabilidad Global: {margenPorcentaje.toFixed(1)}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* 📋 TABLA DE DESGLOSE RÁPIDO */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
               <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Desglose de Rentabilidad por Artículo</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="py-4 px-6">Artículo</th>
                    <th className="py-4 px-6 text-center">Stock</th>
                    <th className="py-4 px-6 text-right text-rose-500">Costo Unit.</th>
                    <th className="py-4 px-6 text-right text-emerald-500">Venta Unit.</th>
                    <th className="py-4 px-6 text-right text-blue-500">Margen Unit.</th>
                    <th className="py-4 px-6 text-right">Ganancia Total Esperada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {products.map(p => {
                    const stock = inventory?.filter(v => v.product_id === p.id).reduce((s, v) => s + v.stock_quantity, 0) || 0;
                    if (stock === 0) return null; // Ocultamos los que no tienen stock

                    const costo = p.cost_price || 0;
                    const venta = p.price || 0;
                    const margenUnitario = venta - costo;
                    const gananciaTotal = margenUnitario * stock;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                        <td className="py-4 px-6 font-bold text-sm text-slate-800 dark:text-white uppercase">{p.name}</td>
                        <td className="py-4 px-6 text-center font-black">{stock}</td>
                        <td className="py-4 px-6 text-right font-bold text-slate-500">{formatMoney(costo)}</td>
                        <td className="py-4 px-6 text-right font-bold text-slate-500">{formatMoney(venta)}</td>
                        <td className="py-4 px-6 text-right font-black text-blue-600 dark:text-blue-400">{formatMoney(margenUnitario)}</td>
                        <td className="py-4 px-6 text-right font-black text-lg text-emerald-600 dark:text-emerald-400">{formatMoney(gananciaTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};