import { useMemo, useEffect } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';

export const ProfitabilityDashboard = () => {
  const { products, inventory, fetchAllCatalogs, isLoading } = useCatalogStore();

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  // 🧠 EL CEREBRO FINANCIERO: Cálculo de métricas
  const metrics = useMemo(() => {
    let capitalBase = 0;
    let capitalTerminado = 0;
    let facturacionPotencial = 0;

    // Array para el Top 5 de productos
    const productMargins: { name: string, margin: number, stock: number, gananciaUnidad: number }[] = [];

    products.forEach(p => {
      const costo = p.cost_price || 0;
      const venta = p.price || 0;
      const gananciaUnidad = venta - costo;
      const margenPorcentaje = venta > 0 ? (gananciaUnidad / venta) * 100 : 0;

      const variants = inventory.filter(v => v.product_id === p.id);
      let totalStock = 0;

      variants.forEach(v => {
        const qtyBase = v.base_quantity || 0;
        const qtyFin = v.finished_quantity || 0;
        
        totalStock += (qtyBase + qtyFin);

        // Plata hundida en el galpón
        capitalBase += (qtyBase * costo);
        capitalTerminado += (qtyFin * costo);

        // Plata que va a entrar si vendemos el stock terminado
        facturacionPotencial += (qtyFin * venta);
      });

      if (totalStock > 0 && venta > 0) {
        productMargins.push({
          name: p.name,
          margin: margenPorcentaje,
          stock: totalStock,
          gananciaUnidad: gananciaUnidad
        });
      }
    });

    const totalInvertido = capitalBase + capitalTerminado;
    const gananciaNetaEsperada = facturacionPotencial - capitalTerminado;
    const margenGlobal = facturacionPotencial > 0 ? (gananciaNetaEsperada / facturacionPotencial) * 100 : 0;

    return {
      capitalBase,
      capitalTerminado,
      totalInvertido,
      facturacionPotencial,
      gananciaNetaEsperada,
      margenGlobal,
      topProducts: productMargins.sort((a, b) => b.margin - a.margin).slice(0, 5)
    };
  }, [products, inventory]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">Calculando métricas financieras...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          📊 Radar de Rentabilidad
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
          Visión financiera en tiempo real del Holder Raíces.
        </p>
      </header>

      {/* TARJETAS PRINCIPALES (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: La plata frenada */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">📦</div>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Capital Inmovilizado</h3>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            ${metrics.totalInvertido.toLocaleString('es-AR')}
          </p>
          <div className="mt-4 flex flex-col gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Stock Liso (Base):</span>
              <span>${metrics.capitalBase.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between text-indigo-500">
              <span>Stock Terminado:</span>
              <span>${metrics.capitalTerminado.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: La plata a cobrar */}
        <div className="bg-indigo-600 dark:bg-indigo-500 p-6 rounded-3xl border border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">💸</div>
          <h3 className="text-[11px] font-black text-indigo-200 uppercase tracking-widest mb-1">Facturación Lista</h3>
          <p className="text-3xl font-black mb-1">
            ${metrics.facturacionPotencial.toLocaleString('es-AR')}
          </p>
          <p className="text-xs font-medium text-indigo-100">
            Ingreso bruto si se vende todo el Stock Terminado hoy.
          </p>
        </div>

        {/* KPI 3: La ganancia real */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-200 dark:border-emerald-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">✨</div>
          <h3 className="text-[11px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Ganancia Neta Esperada</h3>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            ${metrics.gananciaNetaEsperada.toLocaleString('es-AR')}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-black px-2 py-1 rounded-md">
              {metrics.margenGlobal.toFixed(1)}% MARGEN
            </span>
            <span className="text-xs font-bold text-slate-500">Promedio global</span>
          </div>
        </div>

      </div>

      {/* TOP PRODUCTOS MÁS RENTABLES */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            🏆 Top 5: Mayor Margen de Ganancia
          </h2>
          <p className="text-xs text-slate-500 font-medium">Artículos en stock con mayor rentabilidad porcentual.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="p-4">Artículo</th>
                <th className="p-4 text-center">Stock Total</th>
                <th className="p-4 text-right">Ganancia Unitaria</th>
                <th className="p-4 text-right">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {metrics.topProducts.map((prod, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {prod.name}
                  </td>
                  <td className="p-4 text-center text-slate-500 font-bold text-sm">
                    {prod.stock}
                  </td>
                  <td className="p-4 text-right text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    ${prod.gananciaUnidad.toLocaleString('es-AR')}
                  </td>
                  <td className="p-4 text-right">
                    <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-black text-xs px-3 py-1 rounded-lg">
                      {prod.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {metrics.topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-bold text-sm">
                    No hay suficientes datos de costos y precios en el stock actual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};