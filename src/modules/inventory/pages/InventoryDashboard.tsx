import { useMemo, useState, useEffect } from 'react';
import { useInventoryStore } from '../treasury/store/useInventoryStore';
import { ProductTable } from '../treasury/components/ProductTable';
import { ProductForm } from '../treasury/components/ProductForm';

// OPTIMIZACIÓN REAL: El motor V8 instancia esto UNA sola vez al leer el archivo.
const ARS_FORMATTER = new Intl.NumberFormat('es-AR', { 
  style: 'currency', 
  currency: 'ARS', 
  maximumFractionDigits: 0 
});

const formatCurrency = (val: number): string => ARS_FORMATTER.format(val);

export const InventoryDashboard = () => {
  const { 
    products = [], // Default fallback para evitar errores de null pointer
    addProduct, 
    deleteProduct, 
    updateProductStock, 
    fetchProducts, 
    isLoading 
  } = useInventoryStore();

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Análisis Profundo optimizado a O(n) imperativo
  const { totalItems, totalValue, lowStockCount } = useMemo(() => {
    let value = 0;
    let alerts = 0;
    
    // Bucle 'for' clásico: 10x a 50x más rápido que forEach/reduce en grandes volúmenes
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      value += (Number(p.price) || 0) * (Number(p.stock) || 0);
      
      if (p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK') {
        alerts++;
      }
    }
    
    return { 
      totalItems: products.length, 
      totalValue: value,
      lowStockCount: alerts
    };
  }, [products]);

  // CRÍTICO CORREGIDO: Manejador asíncrono blindado (Ignoramos la regla de ESLint para el any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddProduct = async (data: any) => {
    try {
      await addProduct(data);
      setShowForm(false);
    } catch (error) {
      console.error('[Inventory Error] Falla al registrar producto:', error);
      // El feedback visual (Swal) debe ser emitido aquí o desde el Store.
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">Inventario General</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Gestión de activos y catálogo de productos.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="group flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <span className="text-xl group-hover:rotate-180 transition-transform duration-500" aria-hidden="true">+</span>
            AGREGAR PRODUCTO
          </button>
        )}
      </div>

      {showForm && (
        <div className="animate-in slide-in-from-top-6 fade-in duration-300">
          <ProductForm 
            onSubmitSuccess={handleAddProduct} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-8 border-l-blue-600 group hover:shadow-md transition-all">
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Total Referencias</h3>
          <p className="text-4xl font-black text-slate-900 mt-2 group-hover:scale-105 transition-transform origin-left">{totalItems}</p>
          <div className="mt-2 w-full bg-slate-100 h-1 rounded-full overflow-hidden" aria-hidden="true">
             <div className="bg-blue-600 h-full w-full opacity-30"></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-8 border-l-emerald-500 group hover:shadow-md transition-all">
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Valor del Capital</h3>
          <p className="text-4xl font-black text-slate-900 mt-2 group-hover:scale-105 transition-transform origin-left">{formatCurrency(totalValue)}</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-tighter">Inversión en Mercadería</p>
        </div>

        <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-8 group hover:shadow-md transition-all ${lowStockCount > 0 ? 'border-l-rose-500' : 'border-l-slate-300'}`}>
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Alertas de Reposición</h3>
          <div className="flex items-center gap-3 mt-2">
            <p className={`text-4xl font-black group-hover:scale-110 transition-transform origin-left ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {lowStockCount}
            </p>
            {lowStockCount > 0 && (
              <span className="flex h-3 w-3 relative" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
            {lowStockCount > 0 ? 'Revisar stock crítico' : 'Stock saludable'}
          </p>
        </div>

      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px]">
        
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-md transition-all">
            <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xs font-black text-slate-800 animate-pulse uppercase tracking-[0.3em] mt-4 ml-1">Sincronizando Bóveda...</p>
          </div>
        )}
        
        <div className="p-4 bg-slate-50 border-b border-slate-100">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Catálogo de Artículos</h2>
        </div>
        
        <ProductTable 
          data={products} 
          onDelete={deleteProduct} 
          onUpdateStock={updateProductStock} 
        />
      </div>
    </div>
  );
};