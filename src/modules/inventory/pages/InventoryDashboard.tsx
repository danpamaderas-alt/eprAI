import { useMemo, useState, useEffect } from 'react';
import { useInventoryStore, type Product } from '../treasury/store/useInventoryStore';
import { ProductTable } from '../treasury/components/ProductTable';
import { ProductForm } from '../treasury/components/ProductForm';

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export const InventoryDashboard = () => {
  const { products, addProduct, updateProduct, deleteProduct, updateProductStock, fetchProducts, isLoading } = useInventoryStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const metrics = useMemo(() => {
    let totalItems = 0; let capital = 0; let revenue = 0; let alerts = 0;
    products.forEach(p => {
      const stock = p.variations?.length ? p.variations.reduce((a, v) => a + v.stock, 0) : p.stock;
      totalItems += stock;
      capital += (p.cost || 0) * stock;
      revenue += p.price * stock;
      if (stock <= p.minStock) alerts++;
    });
    return { totalItems, capital, profit: revenue - capital, alerts };
  }, [products]);

  const filtered = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
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

  const handleEdit = (p: Product) => { setProductToEdit(p); setIsFormOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black dark:text-white italic">Inventario General</h1>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Gestión de activos y catálogo</p>
        </div>
        {!isFormOpen && (
          <button onClick={() => { setProductToEdit(null); setIsFormOpen(true); }} className="px-6 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 active:scale-95">
            + AGREGAR PRODUCTO
          </button>
        )}
      </div>

      {isFormOpen && <ProductForm initialData={productToEdit} onSubmitSuccess={handleSave} onCancel={() => { setIsFormOpen(false); setProductToEdit(null); }} />}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-8 border-l-slate-400">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Mercadería</h3>
          <p className="text-3xl font-black dark:text-white mt-2">{metrics.totalItems}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-8 border-l-blue-600">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Invertido</h3>
          <p className="text-3xl font-black dark:text-white mt-2">{ARS.format(metrics.capital)}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-8 border-l-emerald-500">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Ganancia</h3>
          <p className="text-3xl font-black text-emerald-600 mt-2">{ARS.format(metrics.profit)}</p>
        </div>
        <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border-l-8 ${metrics.alerts > 0 ? 'border-l-rose-500' : 'border-l-slate-300'}`}>
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Alertas</h3>
          <p className={`text-3xl font-black mt-2 ${metrics.alerts > 0 ? 'text-rose-600' : 'dark:text-white'}`}>{metrics.alerts}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border dark:border-slate-700 min-h-[400px]">
        {isLoading && <div className="p-4 text-center text-blue-500 font-bold">Cargando...</div>}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b dark:border-slate-700 flex justify-between items-center">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catálogo</h2>
           <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-72 px-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none" />
        </div>
        <ProductTable data={filtered} onDelete={deleteProduct} onUpdateStock={updateProductStock} onEditFullProduct={handleEdit} />
      </div>
    </div>
  );
};