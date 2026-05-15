import React, { useState, useEffect, useMemo, memo } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { MatrixHoldingPro } from '../components/MatrixHoldingPro'; 
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import Swal from 'sweetalert2';

export const InventoryDashboard = memo(() => {
  // Traemos TODO del store, incluyendo addSize y addColor
  const { 
    products, sizes, colors, inventory, fetchAllCatalogs, 
    addProduct, addProductVariant, updateProductComplete, 
    addSize, addColor 
  } = useCatalogStore();
  
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [matrixInitialData, setMatrixInitialData] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  const toggleRow = (productId: string) => {
    setExpandedRows(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const groupedInventory = useMemo(() => {
    if (!inventory || !products) return [];
    const groups: Record<string, any> = {};

    inventory.forEach((variant: any) => {
      const prodId = variant.product_id;
      if (!prodId) return;

      if (!groups[prodId]) {
        const product = products.find(p => p.id === prodId);
        groups[prodId] = {
          product: product || { id: prodId, name: 'Desconocido', category: 'S/C', sku: 'S/N' },
          totalBase: 0, totalFinished: 0, variants: []
        };
      }
      groups[prodId].totalBase += (variant.base_quantity || 0);
      groups[prodId].totalFinished += (variant.finished_quantity || 0);
      groups[prodId].variants.push(variant);
    });

    return Object.values(groups).sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [inventory, products]);


  const handleSaveMatrix = async (productData: any, variants: any[]) => {
    try {
      Swal.fire({ title: 'Procesando Lote...', text: `Registrando artículo y ${variants.length} variantes...`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      let productId = productData.id;
      
      if (!productId) {
        const newProduct = await addProduct({ name: productData.name, category: productData.category, sku: productData.sku, unit_measure: productData.unit_measure });
        productId = newProduct.id;
      } else {
        await updateProductComplete(productId, { 
          category: productData.category, 
          sku: productData.sku, 
          unit_measure: productData.unit_measure 
        });
      }

      for (const variant of variants) {
        await addProductVariant({ product_id: productId, sku: variant.sku, size_id: variant.size_id, color_id: variant.color_id, cost_price: variant.cost, price: variant.price, weight: variant.weight, stock_quantity: variant.quantity });
      }

      Swal.fire({ icon: 'success', title: '¡Lote Cargado!', timer: 2000, showConfirmButton: false });
      setIsMatrixOpen(false);
      setMatrixInitialData(null);
      fetchAllCatalogs(); 
    } catch (error) {
      // 🚀 ACÁ ESTÁ EL CHISMOSO: Nos va a decir el error real en la consola (F12)
      console.error('🚨 ERROR REAL AL GUARDAR LA MATRIZ:', error);
      Swal.fire('Error Crítico', 'No se pudo sincronizar el lote con Supabase', 'error');
    }
  };

  const openMatrix = (product?: any) => {
    if (product) {
      setMatrixInitialData({
        id: product.id,
        name: product.name,
        category: (product.category && product.category !== 'S/C') ? product.category : '',
        sku: (product.sku && product.sku !== 'S/N') ? product.sku : '',
        unit_measure: product.unit_measure || 'UNIDADES'
      });
    } else {
      setMatrixInitialData(null);
    }
    setIsMatrixOpen(true);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* CABECERA */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-600/20">📦</div>
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Stock <span className="text-blue-500">Dual</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Panel de Carga Masiva y Control de Valuación Agrupado.</p>
          </div>
        </div>
        <button onClick={() => openMatrix()} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
          + NUEVO PRODUCTO (MATRIZ)
        </button>
      </header>

      {/* TABLA AGRUPADA */}
      {groupedInventory.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-10">
          <p className="text-slate-400 font-black uppercase text-xs tracking-widest text-center italic py-20">No hay stock registrado. Cargá un nuevo lote usando la matriz.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-6 w-16"></th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Artículo / Base SKU</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Variantes</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Total Base (Liso)</th>
                  <th className="p-6 text-[10px] font-black uppercase text-emerald-500 tracking-widest text-center">Total Terminado</th>
                  <th className="p-6 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                
                {groupedInventory.map((group: any) => {
                  const isExpanded = expandedRows[group.product.id];

                  return (
                    <React.Fragment key={group.product.id}>
                      {/* FILA DEL PADRE */}
                      <tr 
                        onClick={() => toggleRow(group.product.id)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                      >
                        <td className="p-6 text-slate-400 group-hover:text-blue-500 transition-colors">
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </td>
                        <td className="p-6">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{group.product.name}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">{group.product.sku || 'S/N'}</span>
                            <span className="text-[9px] font-black bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">{group.product.category || 'S/C'}</span>
                          </div>
                        </td>
                        <td className="p-6 text-center"><span className="text-xs font-bold text-slate-500">{group.variants.length} comb.</span></td>
                        <td className="p-6 text-center"><span className="text-xl font-black text-slate-700 dark:text-slate-300 tabular-nums">{group.totalBase}</span></td>
                        <td className="p-6 text-center"><span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{group.totalFinished}</span></td>
                        <td className="p-6 text-right">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openMatrix(group.product); }}
                            className="bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 p-2 rounded-xl transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700"
                            title="Agregar Variantes"
                          >
                            <Plus size={16} />
                          </button>
                        </td>
                      </tr>

                      {/* FILAS DE LOS HIJOS */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0 border-b-2 border-blue-500">
                            <div className="bg-slate-50 dark:bg-slate-950/50 p-6 px-16 shadow-inner animate-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.variants.map((v: any) => {
                                  const size = sizes.find(s => s.id === v.size_id);
                                  const color = colors.find(c => c.id === v.color_id);
                                  return (
                                    <div key={v.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex justify-between items-center hover:border-blue-500 transition-colors">
                                      <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.sku || `${group.product.sku}-${size?.name}-${color?.name}`.toUpperCase()}</p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase mt-1">{size?.name || '-'} <span className="text-blue-500">|</span> {color?.name || '-'}</p>
                                        <div className="flex gap-3 mt-2">
                                          <span className="text-[10px] font-bold text-slate-500">Costo: ${v.cost_price || 0}</span>
                                          <span className="text-[10px] font-bold text-slate-500">Venta: ${v.price || 0}</span>
                                        </div>
                                      </div>
                                      <div className="text-right flex flex-col gap-1">
                                        <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-xl">B: {v.base_quantity || 0}</span>
                                        <span className="text-xs font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl">T: {v.finished_quantity || 0}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDERIZADO DE LA MATRIZ CON FUNCIONES DE AGREGAR */}
      {isMatrixOpen && (
        <MatrixHoldingPro 
          sizes={sizes} 
          colors={colors} 
          products={products} 
          initialProduct={matrixInitialData} 
          onClose={() => { setIsMatrixOpen(false); setMatrixInitialData(null); }} 
          onSave={handleSaveMatrix}
          onAddSize={addSize}      
          onAddColor={addColor}    
        />
      )}
    </div>
  );
});

InventoryDashboard.displayName = 'InventoryDashboard';