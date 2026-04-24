import React, { useEffect, useMemo } from 'react';
import { useProductionStore } from '../store/useProductionStore';
import { useCatalogStore } from '../../../store/useCatalogStore';

export const ProductionDashboard = () => {
  const { activeOrders, isLoading, fetchActiveOrders } = useProductionStore();
  const { inventory, fetchAllCatalogs } = useCatalogStore();

  useEffect(() => {
    fetchActiveOrders();
    fetchAllCatalogs();
  }, [fetchActiveOrders, fetchAllCatalogs]);
  

  // 🧠 CEREBRO DE CÁLCULO ESTRICTO DE PRODUCCIÓN
  const productionList = useMemo(() => {
    const needs: Record<string, any> = {};

    activeOrders.forEach(order => {
      const items = order.items || [];
      items.forEach((item: any) => {
        const variations = item.variations || [];
        variations.forEach((v: any) => {
          // 1. Calculamos estrictamente lo que falta entregar de este remito
          const ordered = Number(v.quantityOrdered) || 0;
          const delivered = Number(v.quantityDelivered) || 0;
          const pendingToDeliver = ordered - delivered;
          
          // Solo nos importa si todavía le debemos esta prenda al cliente
          if (pendingToDeliver > 0) {
            const key = `${item.productName}-${v.size}-${v.color}`;
            
            if (!needs[key]) {
              needs[key] = {
                productName: item.productName,
                size: v.size,
                color: v.color,
                totalPendingDelivery: 0,
                ordersWaiting: []
              };
            }
            // Sumamos la deuda real, no el total del pedido
            needs[key].totalPendingDelivery += pendingToDeliver;
            needs[key].ordersWaiting.push(`${order.customer_name} (Faltan ${pendingToDeliver})`);
          }
        });
      });
    });

    // 2. Cruzamos la deuda total con el Stock Físico Real que hay en el taller
    const finalProduction = Object.values(needs).map(need => {
      const stockItem = inventory.find(i => 
        i.products?.name === need.productName && 
        i.sizes?.name === need.size && 
        i.colors?.name === need.color
      );
      
      const currentStock = stockItem ? Number(stockItem.stock_quantity) : 0;
      
      // 3. Lo que hay que fabricar es la deuda MENOS lo que ya tenés en estantería
      const toManufacture = need.totalPendingDelivery - currentStock;

      return {
        ...need,
        currentStock,
        toManufacture: toManufacture > 0 ? toManufacture : 0
      };
    }).filter(item => item.toManufacture > 0); // Filtramos para que SOLO aparezca si hay que prender las máquinas

    return finalProduction.sort((a, b) => b.toManufacture - a.toManufacture);
  }, [activeOrders, inventory]);

  if (isLoading) {
    return <div className="p-8 text-slate-400 font-black animate-pulse uppercase tracking-widest text-sm">Calculando necesidades de producción...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
          <span className="bg-rose-500 text-white p-2 rounded-xl text-xl">⚙️</span>
          A Fabricar
        </h1>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
          Cálculo exacto: (Pendiente de Entrega - Stock Físico)
        </p>
      </header>

      {productionList.length === 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 p-12 rounded-3xl text-center">
          <span className="text-4xl block mb-4">🙌</span>
          <h3 className="text-emerald-700 dark:text-emerald-400 font-black uppercase tracking-widest text-lg">Taller al día</h3>
          <p className="text-emerald-600/70 dark:text-emerald-500/70 font-bold text-sm mt-2">Con el stock físico actual alcanza para cubrir todas las entregas pendientes de los remitos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productionList.map((item, index) => (
            <div key={index} className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/30 p-6 rounded-3xl shadow-xl shadow-rose-500/5 relative overflow-hidden group hover:border-rose-400 dark:hover:border-rose-700 transition-colors">
              
              <div className="absolute top-0 right-0 bg-rose-500 text-white px-4 py-2 rounded-bl-2xl font-black text-xl shadow-lg">
                HACER {item.toManufacture}
              </div>

              <div className="mt-4 mb-6">
                <span className="text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 px-2 py-1 rounded-md">
                  FALTANTE COMPROBADO
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mt-2">
                  {item.productName}
                </h3>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg uppercase">
                    Talle: {item.size}
                  </span>
                  <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg uppercase">
                    Color: {item.color}
                  </span>
                </div>
              </div>

              {/* DESGLOSE MATEMÁTICO TRANSPARENTE */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest">Falta entregar (Remitos):</span>
                  <span className="font-black text-slate-700 dark:text-slate-200">{item.totalPendingDelivery} un.</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest">Stock físico actual:</span>
                  <span className="font-black text-emerald-500">{item.currentStock} un.</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-800/50">
                  <span className="font-black text-rose-500 uppercase tracking-widest">Balance (A Fabricar):</span>
                  <span className="font-black text-rose-500">{item.toManufacture} un.</span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Para quién son:</p>
                <div className="flex flex-col gap-1">
                  {Array.from(new Set(item.ordersWaiting)).map((client: any, i) => (
                    <span key={i} className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md">
                      👤 {client}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};