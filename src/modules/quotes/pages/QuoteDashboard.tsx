<<<<<<< HEAD
import { generateQuotePDF } from '../../../utils/printQuotePDF'; 
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';
import { useCatalogStore } from '../../../store/useCatalogStore';
=======
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { generateQuotePDF } from '../../../utils/printQuotePDF';

// Interfaces
interface Client {
  id: string;
  name: string;
  cuit?: string; 
}
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2

interface QuoteItemForm {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export const QuoteDashboard = () => {
<<<<<<< HEAD
  const { products, customers, addCustomer, addProduct, fetchAllCatalogs } = useCatalogStore();
  
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null); 
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [businessUnit, setBusinessUnit] = useState('RAICES'); // <--- NUEVO: Unidad de Negocio
  const [quoteNotes, setQuoteNotes] = useState('');
  
  const [quoteItems, setQuoteItems] = useState<QuoteItemForm[]>([
    { product_id: '', description: '', quantity: 1, unit_price: 0 }
  ]);

  useEffect(() => {
    fetchAllCatalogs();
    fetchQuotesHistory();
  }, []);

  const fetchQuotesHistory = async () => {
    setIsLoading(true);
    try {
      const { data: quotesData, error } = await supabase
=======
  const { products, fetchAllCatalogs } = useCatalogStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  
  // Lista de renglones del presupuesto
  const [quoteItems, setQuoteItems] = useState<QuoteItemForm[]>([
    { product_id: '', description: '', quantity: 1, unit_price: 0 }
  ]);

  useEffect(() => {
    fetchAllCatalogs();
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Cargamos los clientes para el buscador
      const { data: clientsData, error: clientsError } = await supabase
        .from('customers')
        .select('*')
        .order('name');
        
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // 2. Traemos presupuestos vinculando con la tabla customers
      const { data: quotesData, error: quotesError } = await supabase
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
        .from('quotes')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });
        
<<<<<<< HEAD
      if (error) throw error;
      if (quotesData) setQuotes(quotesData);
    } catch (e) {
      console.error("Error al traer historial:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ABRIR MODAL VACÍO (NUEVO PRESUPUESTO) ---
  const handleOpenNewQuote = () => {
    setEditingQuoteId(null);
    setSelectedCustomer('');
    setBusinessUnit('RAICES'); // <--- Resetea a la unidad por defecto
    setQuoteNotes('');
    setQuoteItems([{ product_id: '', description: '', quantity: 1, unit_price: 0 }]);
    setIsModalOpen(true);
  };

  // --- ✏️ ABRIR MODAL CON DATOS (EDITAR PRESUPUESTO) ---
  const handleEditQuote = async (quote: any) => {
    try {
      // 1. Buscamos los renglones guardados de este presupuesto
      const { data: items, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id);

      if (error) throw error;

      // 2. Cargamos todo en el formulario
      setEditingQuoteId(quote.id);
      setSelectedCustomer(quote.customer_id);
      setBusinessUnit(quote.business_unit || 'RAICES'); // <--- Carga la unidad del presupuesto
      setQuoteNotes(quote.notes || '');
      
      if (items && items.length > 0) {
        setQuoteItems(items.map((item: any) => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })));
      } else {
        setQuoteItems([{ product_id: '', description: '', quantity: 1, unit_price: 0 }]);
      }

      // 3. Abrimos el modal
      setIsModalOpen(true);
    } catch (error) {
      Swal.fire('Error', 'No se pudo cargar el presupuesto para editar.', 'error');
    }
  };

  // --- 👤 CREAR CLIENTE EXPRESS ---
  const handleQuickAddClient = async () => {
    const { value: formValues } = await Swal.fire({
      title: '✨ Nuevo Cliente',
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nombre completo o Institución">
        <input id="swal-phone" class="swal2-input" placeholder="Teléfono (Opcional)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar y Seleccionar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value;
        const phone = (document.getElementById('swal-phone') as HTMLInputElement).value;
        if (!name) Swal.showValidationMessage('El nombre es obligatorio');
        return { name, phone };
      }
    });

    if (formValues) {
      try {
        const newCustomer = await addCustomer({ 
          name: formValues.name, 
          phone: formValues.phone,
          balance: 0,
          type: 'MINORISTA'
        } as any); 
        
        setSelectedCustomer(newCustomer.id);
        Swal.fire({ toast: true, icon: 'success', title: 'Cliente guardado', position: 'top-end', showConfirmButton: false, timer: 1500 });
      } catch (error: any) {
        Swal.fire('Error de Base de Datos', error.message, 'error');
      }
    }
  };

  // --- 📦 CREAR ARTÍCULO EXPRESS ---
  const handleQuickAddProduct = async (index: number) => {
    const { value: formValues } = await Swal.fire({
      title: '📦 Nuevo Artículo Rápido',
      html: `
        <input id="swal-prod-name" class="swal2-input" placeholder="Nombre (Ej: Remera Estampada)">
        <input id="swal-prod-sku" class="swal2-input" placeholder="SKU / Código (Opcional)">
        <input id="swal-prod-price" type="number" class="swal2-input" placeholder="Precio de Venta Unitario ($)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar y Agregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        const name = (document.getElementById('swal-prod-name') as HTMLInputElement).value;
        const sku = (document.getElementById('swal-prod-sku') as HTMLInputElement).value;
        const price = (document.getElementById('swal-prod-price') as HTMLInputElement).value;
        if (!name) Swal.showValidationMessage('El nombre es obligatorio');
        if (!price) Swal.showValidationMessage('El precio es obligatorio');
        return { name, sku, price: Number(price) };
      }
    });

    if (formValues) {
      try {
        const newProduct = await addProduct({
          name: formValues.name,
          sku: formValues.sku,
          price: formValues.price,
          category: 'GENERAL',
          cost_price: 0
        });

        const newItems = [...quoteItems];
        newItems[index] = {
          ...newItems[index],
          product_id: newProduct.id,
          description: newProduct.name,
          unit_price: newProduct.price || 0
        };
        setQuoteItems(newItems);

        Swal.fire({ toast: true, icon: 'success', title: 'Artículo Creado', position: 'top-end', showConfirmButton: false, timer: 1500 });
      } catch (error: any) {
        Swal.fire('Error', 'No se pudo crear el artículo', 'error');
      }
    }
  };

  // --- LÓGICA DE RENGLONES ---
  const addItemRow = () => {
    setQuoteItems([...quoteItems, { product_id: '', description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItemRow = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof QuoteItemForm, value: any) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].unit_price = selectedProduct.price || 0;
        newItems[index].description = selectedProduct.name || '';
      }
    }
    setQuoteItems(newItems);
  };

  const calculateTotal = () => {
    return quoteItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  };

  // --- GUARDAR O ACTUALIZAR PRESUPUESTO ---
  const handleSaveQuote = async () => {
    if (!selectedCustomer) return Swal.fire('Atención', 'Debes seleccionar un cliente.', 'warning');
    if (quoteItems.some(i => !i.product_id)) return Swal.fire('Atención', 'Todos los renglones deben tener un producto seleccionado.', 'warning');

    try {
      const totalAmount = calculateTotal();
      let finalQuoteId = editingQuoteId;

      if (editingQuoteId) {
        // 🔄 ACTUALIZAR EXISTENTE
        const { error: quoteUpdateError } = await supabase
          .from('quotes')
          .update({
            customer_id: selectedCustomer,
            business_unit: businessUnit, // <--- Actualiza la Unidad de Negocio
            total: totalAmount,
            notes: quoteNotes
          })
          .eq('id', editingQuoteId);
        if (quoteUpdateError) throw quoteUpdateError;

        // Borramos los renglones viejos para clavar los nuevos (Es más seguro y rápido)
        const { error: deleteError } = await supabase.from('quote_items').delete().eq('quote_id', editingQuoteId);
        if (deleteError) throw deleteError;

      } else {
        // 🆕 CREAR NUEVO
        const quoteNumber = `PRE-${String(quotes.length + 1).padStart(3, '0')}`;
        const { data: newQuote, error: quoteError } = await supabase.from('quotes').insert([{
          customer_id: selectedCustomer, 
          business_unit: businessUnit, // <--- Guarda la Unidad de Negocio en la creación
          quote_number: quoteNumber,
          total: totalAmount,
          notes: quoteNotes,
          status: 'ENVIADO'
        }]).select().single();

        if (quoteError) throw quoteError;
        finalQuoteId = newQuote.id;
      }

      // Guardamos los renglones (nuevos o actualizados)
      const itemsToInsert = quoteItems.map(item => ({
        quote_id: finalQuoteId,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      Swal.fire({ 
        toast: true, icon: 'success', 
        title: editingQuoteId ? 'Presupuesto Actualizado ✏️' : 'Presupuesto Generado 🚀', 
        position: 'top-end', showConfirmButton: false, timer: 1500 
      });
      
      setIsModalOpen(false);
      fetchQuotesHistory();

    } catch (error: any) {
      Swal.fire('Error', error.message || 'No se pudo guardar el presupuesto', 'error');
    }
  };

  const handleDownloadPDF = async (quote: any) => {
    try {
      const { data: items, error } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
      if (error) throw error;
      generateQuotePDF(quote, items || []);
    } catch (error) {
      Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
=======
      if (quotesError) throw quotesError;
      setQuotes(quotesData || []);
      
    } catch (error: any) {
      console.error("Error detectado:", error);
      Swal.fire('Error de Conexión', `No pudimos cargar los datos: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- LÓGICA DE FILAS ---
  const addItemRow = () => {
    setQuoteItems([...quoteItems, { product_id: '', description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItemRow = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof QuoteItemForm, value: any) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index].unit_price = selectedProduct.price || 0;
        newItems[index].description = selectedProduct.name || '';
      }
    }
    setQuoteItems(newItems);
  };

  const calculateTotal = () => {
    return quoteItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  };

  // --- PDF ---
  const handleDownloadPDF = async (quote: any) => {
    try {
      const { data: items, error } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
      if (error) throw error;
      
      const quoteForPdf = {
        ...quote,
        clients: { name: quote.customers?.name, document_id: '' } 
      };

      generateQuotePDF(quoteForPdf, items || []);
    } catch (error) {
      Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
    }
  };

  // --- GUARDAR PRESUPUESTO ---
  const handleSaveQuote = async () => {
    if (!selectedClient) return Swal.fire('Atención', 'Debes seleccionar un cliente.', 'warning');
    if (quoteItems.some(i => !i.product_id)) return Swal.fire('Atención', 'Todos los renglones deben tener un producto.', 'warning');

    try {
      const quoteNumber = `PRE-${String(quotes.length + 1).padStart(3, '0')}`;
      const totalAmount = calculateTotal();

      // Inserción en la tabla quotes usando customer_id
      const { data: newQuote, error: quoteError } = await supabase.from('quotes').insert([{
        customer_id: selectedClient,
        quote_number: quoteNumber,
        total: totalAmount,
        notes: quoteNotes,
        status: 'ENVIADO'
      }]).select().single();

      if (quoteError) throw quoteError;

      const itemsToInsert = quoteItems.map(item => ({
        quote_id: newQuote.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      Swal.fire({ toast: true, icon: 'success', title: 'Presupuesto Generado', position: 'top-end', showConfirmButton: false, timer: 1500 });
      setIsModalOpen(false);
      
      setSelectedClient('');
      setQuoteNotes('');
      setQuoteItems([{ product_id: '', description: '', quantity: 1, unit_price: 0 }]);
      fetchData();

    } catch (error: any) {
      Swal.fire('Error', `No se pudo guardar: ${error.message}`, 'error');
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <header className="flex justify-between items-end gap-4">
        <div>
<<<<<<< HEAD
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cotizador B2B</h1>
          <p className="text-sm font-bold text-slate-500 uppercase">Generación de Presupuestos Profesionales</p>
        </div>
        <button onClick={handleOpenNewQuote} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
          + Nuevo Presupuesto
        </button>
      </header>

      {/* HISTORIAL DE PRESUPUESTOS */}
=======
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Cotizador de Ventas</h1>
          <p className="text-sm font-bold text-slate-500 uppercase">Presupuestos para Empresas e Instituciones</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
          + Generar Presupuesto
        </button>
      </header>

      {/* TABLA DE HISTORIAL */}
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
      <div className="bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 border-b dark:border-slate-700">
              <th className="p-5">Número / Fecha</th>
              <th className="p-5">Cliente</th>
              <th className="p-5 text-center">Estado</th>
              <th className="p-5 text-right">Total</th>
              <th className="p-5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-700">
            {quotes.length === 0 ? (
<<<<<<< HEAD
              <tr><td colSpan={5} className="p-8 text-center text-sm font-bold text-slate-400">No hay presupuestos emitidos aún.</td></tr>
=======
              <tr><td colSpan={5} className="p-8 text-center text-sm font-bold text-slate-400">Sin presupuestos registrados.</td></tr>
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
            ) : (
              quotes.map(q => (
                <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                  <td className="p-5">
                    <span className="font-black text-sm dark:text-white block">{q.quote_number}</span>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(q.created_at).toLocaleDateString('es-AR')}</span>
                  </td>
<<<<<<< HEAD
                  <td className="p-5 font-bold text-sm dark:text-slate-300 uppercase">{q.customers?.name || 'Cliente'}</td>
=======
                  <td className="p-5 font-bold text-sm dark:text-slate-300 uppercase">{q.customers?.name}</td>
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
                  <td className="p-5 text-center">
                    <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg">
                      {q.status}
                    </span>
                  </td>
                  <td className="p-5 text-right font-black text-emerald-600 dark:text-emerald-400">
                    ${q.total.toLocaleString('es-AR')}
                  </td>
<<<<<<< HEAD
                  <td className="p-5 text-center flex justify-center gap-2">
                    {/* BOTON DE EDITAR NUEVO */}
                    <button 
                      onClick={() => handleEditQuote(q)} 
                      className="px-3 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-lg uppercase shadow-sm hover:scale-105 transition-all"
                    >
                      ✏️ Editar
                    </button>
                    {/* BOTON DE PDF */}
                    <button 
                      onClick={() => handleDownloadPDF(q)} 
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white text-[10px] font-black rounded-lg uppercase shadow-sm hover:scale-105 transition-all"
                    >
                      Ver / PDF 📄
=======
                  <td className="p-5 text-center">
                    <button 
                      onClick={() => handleDownloadPDF(q)}
                      className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg uppercase shadow-sm transition-all"
                    >
                      Bajar PDF 📄
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

<<<<<<< HEAD
      {/* MODAL PRINCIPAL: CREADOR / EDITOR DE PRESUPUESTOS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl border dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              {/* Título Dinámico */}
              <h2 className="font-black dark:text-white uppercase tracking-tighter text-xl">
                {editingQuoteId ? '✏️ Editar Presupuesto' : '📄 Nuevo Presupuesto'}
              </h2>
=======
      {/* MODAL NUEVO PRESUPUESTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl border dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="font-black dark:text-white uppercase tracking-tighter text-xl">📄 Nuevo Presupuesto</h2>
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
              <button onClick={() => setIsModalOpen(false)} className="dark:text-white text-xl">✕</button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
<<<<<<< HEAD

              {/* UNIDAD DE NEGOCIO */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Unidad de Negocio</label>
                <select value={businessUnit} onChange={e => setBusinessUnit(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500">
                  <option value="RAICES">Raíces (Indumentaria)</option>
                  <option value="RAICES_3D">Raíces 3D (Impresión y Fabricación)</option>
                </select>
              </div>
              
              {/* SELECCIÓN DE CLIENTE */}
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-2 block tracking-widest">Cliente / Institución</label>
                <div className="flex gap-3">
                  <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="flex-1 p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500">
                    <option value="">-- Seleccionar de la agenda --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={handleQuickAddClient} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl text-xs font-black uppercase shadow-sm transition-all whitespace-nowrap">
                    + Nuevo
                  </button>
                </div>
              </div>

              {/* RENGLONES DEL PRESUPUESTO (YA CON EL DISEÑO ANTI-APLASTAMIENTO) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b dark:border-slate-700 pb-2">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Detalle de Artículos</h3>
                  <button onClick={addItemRow} className="text-[10px] bg-slate-900 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg uppercase font-black">+ Agregar Renglón</button>
=======
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-2 block tracking-widest">Cliente</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-indigo-500">
                  <option value="">-- Seleccionar cliente del CRM --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.cuit ? `(CUIT: ${c.cuit})` : ''}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center border-b dark:border-slate-700 pb-2">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Artículos del Catálogo</h3>
                  <button onClick={addItemRow} className="text-[10px] bg-slate-900 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg uppercase font-black">+ Agregar Fila</button>
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
                </div>

                {quoteItems.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border dark:border-slate-700 animate-in slide-in-from-top-1 items-start md:items-center">
<<<<<<< HEAD
                    
                    <div className="w-full md:w-[35%]">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Artículo del Catálogo</label>
                      <div className="flex gap-2">
                        <select value={item.product_id} onChange={e => updateItemRow(index, 'product_id', e.target.value)} className="flex-1 w-full min-w-0 p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-bold dark:text-white outline-none">
                          <option value="">-- Seleccionar --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.sku} | {p.name}</option>)}
                        </select>
                        <button 
                          onClick={() => handleQuickAddProduct(index)}
                          className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white w-10 h-[38px] rounded-lg text-lg font-black shadow-sm transition-all active:scale-95 flex items-center justify-center"
                          title="Crear Artículo Nuevo Rápido"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 w-full min-w-[150px]">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Descripción / Detalles</label>
                      <input type="text" placeholder="Ej: Curva de talles S a XL" value={item.description} onChange={e => updateItemRow(index, 'description', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-medium dark:text-white outline-none" />
                    </div>

                    <div className="w-full md:w-20 shrink-0">
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Cantidad</label>
                      <input type="number" min="1" value={item.quantity} onChange={e => updateItemRow(index, 'quantity', Number(e.target.value))} className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-black text-center dark:text-white outline-none" />
                    </div>

                    <div className="w-full md:w-28 shrink-0">
                      <label className="block text-[9px] font-black text-emerald-500 uppercase mb-1">Precio Unit. ($)</label>
                      <input type="number" value={item.unit_price} onChange={e => updateItemRow(index, 'unit_price', Number(e.target.value))} className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-black text-emerald-600 dark:text-emerald-400 outline-none" />
                    </div>

                    <div className="w-full md:w-28 shrink-0 pt-2 md:pt-4 text-right flex justify-end items-center gap-2">
                      <span className="text-sm font-black text-slate-800 dark:text-white">
                        ${(item.quantity * item.unit_price).toLocaleString('es-AR')}
                      </span>
                      {quoteItems.length > 1 && (
                        <button onClick={() => removeItemRow(index)} className="text-rose-500 hover:text-rose-700 ml-2">🗑️</button>
                      )}
                    </div>

=======
                    <div className="w-full md:w-1/3">
                      <select value={item.product_id} onChange={e => updateItemRow(index, 'product_id', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-bold dark:text-white outline-none">
                        <option value="">-- Producto --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.sku} | {p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-full md:w-1/3">
                      <input type="text" placeholder="Descripción adicional" value={item.description} onChange={e => updateItemRow(index, 'description', e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-medium dark:text-white outline-none" />
                    </div>
                    <div className="w-full md:w-24">
                      <input type="number" min="1" value={item.quantity} onChange={e => updateItemRow(index, 'quantity', Number(e.target.value))} className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-xs font-black text-center dark:text-white outline-none" />
                    </div>
                    <div className="w-full md:w-32">
                      <input type="number" value={item.unit_price} onChange={e => updateItemRow(index, 'unit_price', Number(e.target.value))} className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-black text-emerald-600 dark:text-emerald-400 outline-none" />
                    </div>
                    <div className="w-full md:w-32 text-right">
                      <span className="text-sm font-black text-slate-800 dark:text-white">${(item.quantity * item.unit_price).toLocaleString('es-AR')}</span>
                    </div>
                    {quoteItems.length > 1 && (
                      <button onClick={() => removeItemRow(index)} className="text-rose-500 px-2">✕</button>
                    )}
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
                  </div>
                ))}
              </div>

<<<<<<< HEAD
              {/* TOTAL Y NOTAS */}
              <div className="flex flex-col md:flex-row justify-between items-start pt-6 border-t dark:border-slate-700 gap-6">
                <div className="w-full md:w-1/2">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Condiciones comerciales / Notas al cliente</label>
                  <textarea placeholder="Ej: Validez del presupuesto 15 días. Seña del 50% para congelar precio." value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-medium resize-none" rows={3} />
                </div>
                <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-right">Total Presupuesto</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 text-right">
=======
              <div className="flex flex-col md:flex-row justify-between items-start pt-6 border-t dark:border-slate-700 gap-6">
                <div className="w-full md:w-1/2">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Observaciones</label>
                  <textarea placeholder="Validez del precio, tiempos de entrega, etc." value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-medium resize-none" rows={3} />
                </div>
                <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-700 text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
                    ${calculateTotal().toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
<<<<<<< HEAD

            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 px-4">Cancelar</button>
              <button onClick={handleSaveQuote} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
                {editingQuoteId ? 'Guardar Cambios 💾' : 'Guardar y Emitir Presupuesto 🚀'}
=======
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 px-4 hover:text-slate-600">Cancelar</button>
              <button onClick={handleSaveQuote} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
                Guardar y Emitir Presupuesto 🚀
>>>>>>> 074298303a43c4b7ef95d4be2ebaf1f67b5476d2
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};