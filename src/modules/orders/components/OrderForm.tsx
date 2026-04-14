import { useState } from 'react';
import { useCatalogStore } from '../../../store/useCatalogStore';
import Swal from 'sweetalert2';

export const OrderForm = ({ onSubmitSuccess, onCancel }: { onSubmitSuccess: Function, onCancel: Function }) => {
  const { 
    customers, businessUnits, products, sizes, colors, personalizationTypes,
    addCustomer, addProduct, addSize, addColor, addPersonalizationType 
  } = useCatalogStore();

  // Estados del pedido
  const [customerId, setCustomerId] = useState('');
  const [businessUnit, setBusinessUnit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [advancePayment, setAdvancePayment] = useState('');
  
  // Estados del artículo
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedPersoId, setSelectedPersoId] = useState(''); // 🆕 Personalización
  const [quantity, setQuantity] = useState('1');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);

  // Estados para creación rápida
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingPerso, setIsAddingPerso] = useState(false); // 🆕
  const [tempName, setTempName] = useState('');
  const [tempPrice, setTempPrice] = useState('');

  const handleQuickAdd = async (type: 'customer' | 'product' | 'size' | 'color' | 'perso') => {
    if (!tempName) return;
    try {
      let created;
      if (type === 'customer') {
        created = await addCustomer({ name: tempName });
        setCustomerId(created.id);
        setIsAddingCustomer(false);
      } else if (type === 'product') {
        created = await addProduct({ name: tempName, category: 'General', base_price: Number(tempPrice) || 0 });
        setSelectedProductId(created.id);
        setIsAddingProduct(false);
      } else if (type === 'size') {
        created = await addSize(tempName);
        setSelectedSizeId(created.id);
        setIsAddingSize(false);
      } else if (type === 'color') {
        created = await addColor(tempName);
        setSelectedColorId(created.id);
        setIsAddingColor(false);
      } else if (type === 'perso') {
        created = await addPersonalizationType(tempName, Number(tempPrice) || 0);
        setSelectedPersoId(created.id);
        setIsAddingPerso(false);
      }
      setTempName(''); setTempPrice('');
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado', showConfirmButton: false, timer: 1500 });
    } catch (e) { Swal.fire('Error', 'No se pudo guardar', 'error'); }
  };

  const handleAddItem = () => {
    if (!selectedProductId || !selectedSizeId || !selectedColorId || !quantity) return;
    
    const product = products.find(p => p.id === selectedProductId);
    const size = sizes.find(s => s.id === selectedSizeId);
    const color = colors.find(c => c.id === selectedColorId);
    const perso = personalizationTypes.find(p => p.id === selectedPersoId);

    // Sumamos: Precio Prenda + Precio Técnica
    const finalUnitPrice = (product?.base_price || 0) + (Number(perso?.base_price) || 0);

    const newItem = {
      id: editingItemId || crypto.randomUUID(),
      productId: selectedProductId,
      sizeId: selectedSizeId,
      colorId: selectedColorId,
      persoId: selectedPersoId,
      productName: product?.name,
      personalization: perso?.name || 'Liso', // Para el remito
      variations: [{
        id: crypto.randomUUID(),
        size: size?.name,
        color: color?.name,
        quantityOrdered: Number(quantity),
        quantityDelivered: 0
      }],
      price: finalUnitPrice * Number(quantity)
    };

    if (editingItemId) {
      setCartItems(cartItems.map(item => item.id === editingItemId ? newItem : item));
      setEditingItemId(null);
    } else {
      setCartItems([...cartItems, newItem]);
    }

    setSelectedProductId(''); setSelectedSizeId(''); setSelectedColorId(''); setSelectedPersoId(''); setQuantity('1');
  };

  const handleEditClick = (item: any) => {
    setEditingItemId(item.id);
    setSelectedProductId(item.productId);
    setSelectedSizeId(item.sizeId);
    setSelectedColorId(item.colorId);
    setSelectedPersoId(item.persoId || '');
    setQuantity(item.variations[0].quantityOrdered.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !businessUnit || cartItems.length === 0) return;
    onSubmitSuccess({
      customerName: customers.find(c => c.id === customerId)?.name,
      businessUnit, dueDate, items: cartItems, status: 'PENDING',
      totalAmount: cartItems.reduce((acc, i) => acc + i.price, 0),
      advancePayment: Number(advancePayment)
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden">
      
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">📦 Pedido de Producción</h2>
        <button onClick={() => onCancel()} className="text-slate-400 hover:text-rose-500 font-bold">✕</button>
      </div>

      <div className="p-8 overflow-y-auto space-y-8 flex-1">
        
        {/* SECCIÓN 1: CLIENTE */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Cliente</label>
              {!isAddingCustomer && <button type="button" onClick={() => setIsAddingCustomer(true)} className="text-[9px] font-black text-blue-600">+ NUEVO</button>}
            </div>
            {isAddingCustomer ? (
              <div className="flex gap-2">
                <input autoFocus placeholder="Nombre" value={tempName} onChange={e => setTempName(e.target.value)} className="flex-1 p-2 text-xs border rounded-lg dark:bg-slate-800" />
                <button type="button" onClick={() => handleQuickAdd('customer')} className="bg-blue-600 text-white px-3 rounded-lg text-[10px] font-black">OK</button>
              </div>
            ) : (
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:text-white font-bold outline-none">
                <option value="">Seleccionar...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Unidad de Negocio</label>
            <select value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:text-white font-bold outline-none">
              <option value="">Seleccionar...</option>
              {businessUnits.map(b => <option key={b.id} value={b.code}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Fecha de Entrega</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:text-white font-bold outline-none" />
          </div>
        </section>

        {/* SECCIÓN 2: CARGA / EDICIÓN */}
        <section className={`p-6 rounded-3xl border ${editingItemId ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700'}`}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            
            {/* PRODUCTO */}
            <div className="col-span-2">
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Prenda de Stock</label>
                {!isAddingProduct && <button type="button" onClick={() => setIsAddingProduct(true)} className="text-[9px] font-black text-emerald-600">+ NUEVO</button>}
              </div>
              {isAddingProduct ? (
                <div className="flex gap-1">
                  <input placeholder="Nombre" value={tempName} onChange={e => setTempName(e.target.value)} className="flex-1 p-2 text-xs border rounded-lg dark:bg-slate-800" />
                  <input placeholder="$" value={tempPrice} onChange={e => setTempPrice(e.target.value)} className="w-12 p-2 text-xs border rounded-lg dark:bg-slate-800" />
                  <button type="button" onClick={() => handleQuickAdd('product')} className="bg-emerald-600 text-white px-2 rounded-lg text-[9px] font-black">OK</button>
                </div>
              ) : (
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:text-white font-bold text-sm outline-none">
                  <option value="">Elegir prenda...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (${p.base_price})</option>)}
                </select>
              )}
            </div>

            {/* TÉCNICA / PERSONALIZACIÓN */}
            <div className="col-span-1">
              <div className="flex justify-between mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Técnica</label>
                {!isAddingPerso && <button type="button" onClick={() => setIsAddingPerso(true)} className="text-[9px] font-black text-violet-600">+ NUEVA</button>}
              </div>
              {isAddingPerso ? (
                <div className="flex gap-1">
                  <input placeholder="Ej: Bordado" value={tempName} onChange={e => setTempName(e.target.value)} className="flex-1 p-2 text-xs border rounded-lg dark:bg-slate-800" />
                  <input placeholder="$" value={tempPrice} onChange={e => setTempPrice(e.target.value)} className="w-12 p-2 text-xs border rounded-lg dark:bg-slate-800" />
                  <button type="button" onClick={() => handleQuickAdd('perso')} className="bg-violet-600 text-white px-2 rounded-lg text-[9px] font-black">OK</button>
                </div>
              ) : (
                <select value={selectedPersoId} onChange={e => setSelectedPersoId(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:text-white font-bold text-sm outline-none border-blue-200">
                  <option value="">Liso</option>
                  {personalizationTypes.map(p => <option key={p.id} value={p.id}>{p.name} (+${p.base_price})</option>)}
                </select>
              )}
            </div>

            {/* TALLE Y COLOR */}
            <div className="flex gap-1">
               <select value={selectedSizeId} onChange={e => setSelectedSizeId(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-slate-800 text-sm font-bold">
                  <option value="">Talle</option>
                  {sizes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
               <select value={selectedColorId} onChange={e => setSelectedColorId(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-slate-800 text-sm font-bold">
                  <option value="">Color</option>
                  {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>

            {/* CANTIDAD Y BOTÓN */}
            <div className="flex gap-2">
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-16 p-2.5 rounded-xl border dark:bg-slate-800 font-black text-center" />
              <button type="button" onClick={handleAddItem} className={`flex-1 rounded-xl font-black text-white text-lg shadow-lg ${editingItemId ? 'bg-blue-600' : 'bg-slate-900 dark:bg-blue-600'}`}>
                {editingItemId ? '✔️' : '+'}
              </button>
            </div>
          </div>

          {/* LISTA (CARRITO) */}
          <div className="mt-6 space-y-2">
            {cartItems.map((item, index) => (
              <div key={item.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-black">{item.variations[0].quantityOrdered}x</span>
                  <div>
                    <p className="font-black text-xs text-slate-800 dark:text-white uppercase leading-none">{item.productName}</p>
                    <p className="text-[9px] font-bold text-blue-500 uppercase mt-1">Estampa: {item.personalization} — {item.variations[0].size}/{item.variations[0].color}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <span className="font-black text-xs text-slate-600 dark:text-slate-400">${item.price}</span>
                  <button type="button" onClick={() => handleEditClick(item)} className="text-blue-500 text-xs font-black">Editar</button>
                  <button type="button" onClick={() => setCartItems(cartItems.filter((_, i) => i !== index))} className="text-rose-400">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER: TOTALES */}
        <section className="flex justify-between items-center pt-6 border-t">
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seña / Adelanto</p>
             <input type="number" value={advancePayment} onChange={e => setAdvancePayment(e.target.value)} className="w-32 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 text-emerald-700 font-black text-right outline-none" placeholder="0" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Calculado</p>
            <p className="text-4xl font-black text-slate-900 dark:text-white">${cartItems.reduce((acc, i) => acc + i.price, 0)}</p>
          </div>
        </section>
      </div>

      <div className="p-6 border-t flex justify-end gap-4 bg-slate-50 dark:bg-slate-900">
        <button type="button" onClick={() => onCancel()} className="px-8 py-3 bg-white border font-black text-[10px] uppercase rounded-2xl">Cancelar</button>
        <button type="button" onClick={handleSubmit} disabled={cartItems.length === 0} className="px-10 py-3 bg-slate-900 dark:bg-blue-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-blue-500/20">Confirmar Pedido</button>
      </div>
    </div>
  );
};