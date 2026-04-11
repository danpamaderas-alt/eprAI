import { useMemo, useState, useEffect } from 'react';
import { useInventoryStore, type Product } from '../treasury/store/useInventoryStore';
import { ProductTable } from '../treasury/components/ProductTable';
import { ProductForm } from '../treasury/components/ProductForm';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const InventoryDashboard = () => {
  const { 
    products, addProduct, updateProduct, deleteProduct, 
    deleteVariation, updateProductStock, fetchProducts, isLoading 
  } = useInventoryStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const metrics = useMemo(() => {
    let totalItems = 0; let capital = 0; let revenue = 0; let alerts = 0;
    products.forEach(p => {
      const stock = p.variations?.length ? p.variations.reduce((a, v) => a + v.stock, 0) : (p.stock || 0);
      totalItems += stock;
      capital += (p.cost || 0) * stock;
      revenue += (p.price || 0) * stock;
      if (stock <= (p.minStock || 0)) alerts++;
    });
    return { totalItems, capital, profit: revenue - capital, alerts };
  }, [products]);

  const filtered = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) || 
      p.category.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleSave = async (data: any) => {
    if (productToEdit) {
      if (data.variations?.length) data.stock = data.variations.reduce((a:number, v:any) => a + Number(v.stock), 0);
      await updateProduct(productToEdit.id, data);
    } else {
      await addProduct(data);
    }
    setIsFormOpen(false); setProductToEdit(null);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">Inventario</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Control de Stock & Activos</p>
        </div>
        <button 
          onClick={() => { setProductToEdit(null); setIsFormOpen(true); }} 
          className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-blue-600 transition-all active:scale-95"
        >
          + AGREGAR PRODUCTO
        </button>
      </div>

      {isFormOpen && (
        <div className="animate-in slide-in-from-top-4 duration-300">
          <ProductForm 
            initialData={productToEdit} 
            onSubmitSuccess={handleSave} 
            onCancel={() => { setIsFormOpen(false); setProductToEdit(null); }} 
          />
        </div>
      )}

      {/* MÉTRICAS GRANDES Y LEGIBLES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Unidades Totales</h3>
          <p className="text-4xl font-black dark:text-white mt-3 tabular-nums">{metrics.totalItems}</p>
        </div>
        <div className="bg-blue-600 p-8 rounded-[2rem] shadow-blue-500/20 shadow-2xl text-white">
          <h3 className="text-[10px] font-black uppercase text-blue-200 tracking-widest">Capital Invertido</h3>
          <p className="text-4xl font-black mt-3 tabular-nums">{ARS.format(metrics.capital)}</p>
        </div>
        <div className="bg-emerald-500 p-8 rounded-[2rem] shadow-emerald-500/20 shadow-2xl text-white">
          <h3 className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">Ganancia Proyectada</h3>
          <p className="text-4xl font-black mt-3 tabular-nums">{ARS.format(metrics.profit)}</p>
        </div>
        <div className={`p-8 rounded-[2rem] border-2 transition-all ${metrics.alerts > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest ${metrics.alerts > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Alertas de Stock</h3>
          <p className={`text-4xl font-black mt-3 ${metrics.alerts > 0 ? 'text-rose-600' : 'dark:text-white'}`}>{metrics.alerts}</p>
        </div>
      </div>

      {/* BUSCADOR Y TABLA */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="relative w-full md:w-96">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar por nombre, SKU o talle..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl shadow-sm font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] p-2">
          {isLoading ? (
            <div className="py-20 text-center font-black text-blue-500 animate-pulse uppercase tracking-widest">Sincronizando Inventario...</div>
          ) : (
            <ProductTable 
              data={filtered} 
              onDelete={deleteProduct} 
              deleteVariation={deleteVariation}
              onUpdateStock={updateProductStock} 
              onEditFullProduct={(p: Product) => { setProductToEdit(p); setIsFormOpen(true); }} 
            />
          )}
        </div>
      </div>
    </div>
  );
};