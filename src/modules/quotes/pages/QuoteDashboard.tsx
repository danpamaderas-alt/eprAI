import React, { useEffect, useState } from 'react';
import { useQuoteStore, type QuoteItem } from '../store/useQuoteStore';
import Swal from 'sweetalert2';

export const QuoteDashboard = () => {
  const { quotes, isLoading, fetchQuotes, addQuote, updateStatus, deleteQuote } = useQuoteStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado del formulario de nuevo presupuesto
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const handleAddItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const handleSubmit = async () => {
    if (!customerName || items.some(i => !i.description || i.unit_price <= 0)) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Completá todos los campos y precios', showConfirmButton: false, timer: 2000 });
      return;
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 15); // Validez de 15 días por defecto

    const success = await addQuote({
      customer_name: customerName,
      customer_contact: customerContact,
      items,
      total_amount: totalAmount,
      status: 'BORRADOR',
      valid_until: validUntil.toISOString().split('T')[0]
    });

    if (success) {
      setIsModalOpen(false);
      setCustomerName(''); setCustomerContact(''); setItems([{ description: '', quantity: 1, unit_price: 0 }]);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Presupuesto creado', showConfirmButton: false, timer: 1500, customClass: { popup: '!bg-slate-900 !text-white' } });
    }
  };

  // Colores según el estado
  const statusColors: Record<string, string> = {
    'BORRADOR': 'bg-slate-800 text-slate-300',
    'ENVIADO': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    'APROBADO': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    'RECHAZADO': 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 space-y-8">
      
      <header className="flex justify-between items-center bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">📄 Cotizador <span className="text-indigo-500">B2B</span></h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Propuestas comerciales e institucionales.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
          + Nuevo Presupuesto
        </button>
      </header>

      {/* LISTA DE PRESUPUESTOS */}
      {isLoading ? (
         <div className="p-8 text-center text-slate-400 font-black animate-pulse uppercase">Cargando propuestas...</div>
      ) : quotes.length === 0 ? (
         <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-500 font-bold uppercase tracking-widest">No hay presupuestos activos.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map(quote => (
            <div key={quote.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">{quote.customer_name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{quote.customer_contact || 'Sin contacto'}</p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${statusColors[quote.status]}`}>
                  {quote.status}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                {quote.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] font-bold text-slate-400 bg-slate-950 px-3 py-2 rounded-xl">
                    <span className="truncate pr-2">{item.quantity}x {item.description}</span>
                    <span className="text-slate-300">${(item.quantity * item.unit_price).toLocaleString()}</span>
                  </div>
                ))}
                {quote.items.length > 3 && <p className="text-[10px] text-slate-500 text-center font-black mt-2">+ {quote.items.length - 3} ítems más</p>}
              </div>

              <div className="flex justify-between items-end pt-4 border-t border-slate-800 mb-6">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Cotizado</p>
                  <p className="text-2xl font-black text-white tracking-tighter">${Number(quote.total_amount).toLocaleString()}</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-bold text-slate-500 uppercase">Válido hasta</p>
                   <p className="text-[10px] font-black text-indigo-400">{new Date(quote.valid_until || '').toLocaleDateString('es-AR')}</p>
                </div>
              </div>

              {/* CONTROLES DE ESTADO */}
              <div className="grid grid-cols-4 gap-2 border-t border-slate-800 pt-4">
                <button onClick={() => updateStatus(quote.id, 'ENVIADO')} title="Marcar como Enviado" className="p-2 bg-slate-950 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-colors flex justify-center">📤</button>
                <button onClick={() => updateStatus(quote.id, 'APROBADO')} title="Marcar Aprobado" className="p-2 bg-slate-950 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition-colors flex justify-center">✅</button>
                <button onClick={() => updateStatus(quote.id, 'RECHAZADO')} title="Marcar Rechazado" className="p-2 bg-slate-950 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-colors flex justify-center">❌</button>
                <button onClick={() => deleteQuote(quote.id)} title="Borrar" className="p-2 bg-slate-950 hover:bg-red-900 text-slate-600 hover:text-white rounded-xl transition-colors flex justify-center">🗑️</button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL CREADOR DE PRESUPUESTOS (NATIVO, SIN ALERTAS FEAS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-3xl rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter">Armar Cotización</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-rose-500 font-black text-xl">✕</button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Cliente / Institución</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full mt-2 bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl font-bold focus:border-indigo-500 outline-none" placeholder="Ej: Registro Provincial" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Contacto / Teléfono (Opcional)</label>
                  <input type="text" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className="w-full mt-2 bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-2xl font-bold focus:border-indigo-500 outline-none" placeholder="Ej: Juan Perez - 221..." />
                </div>
              </div>

              <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ítems a Cotizar</h3>
                  <button onClick={handleAddItem} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white font-black px-4 py-2 rounded-xl uppercase tracking-widest transition-colors">+ Fila</button>
                </div>
                
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} placeholder="Descripción del producto..." className="flex-1 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl font-bold text-sm focus:border-indigo-500 outline-none" />
                      <input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} placeholder="Cant." className="w-24 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-xl font-black text-sm text-center focus:border-indigo-500 outline-none" />
                      <div className="relative w-36">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">$</span>
                        <input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))} placeholder="Precio U." className="w-full bg-slate-900 border border-slate-800 text-white pl-8 pr-4 py-3 rounded-xl font-black text-sm focus:border-indigo-500 outline-none" />
                      </div>
                      <button onClick={() => handleRemoveItem(index)} className="w-12 h-12 flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-colors font-black">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Presupuestado</p>
                <p className="text-4xl font-black text-indigo-400 tracking-tighter">${totalAmount.toLocaleString()}</p>
              </div>
              <button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                Guardar Presupuesto
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};