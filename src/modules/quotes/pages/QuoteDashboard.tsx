import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore, type Product } from '../../../store/useCatalogStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { generateQuotePDF } from '../../../utils/printQuotePDF';
import { ARS } from '../../../shared/utils/format';

const Swal = {
  fire: async (...args: [options?: import('sweetalert2').SweetAlertOptions]) => {
    const m = (await import('sweetalert2')).default as unknown as { fire: (...a: [options?: import('sweetalert2').SweetAlertOptions]) => Promise<unknown> };
    return m.fire(...args);
  },
};
import {
  FileText, Plus, Search, Download, Copy, Trash2,
  Send, CheckCircle, XCircle,
  Calendar, MessageSquare,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  cuit?: string;
}

interface QuoteItemForm {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

const TARGET_MARGIN_KEY = 'raices_quote_target_margin';

const emptyItem = (): QuoteItemForm => ({
  product_id: '',
  description: '',
  quantity: 1,
  unit_price: 0,
  unit_cost: 0,
});

interface QuoteRecord {
  id: string;
  company_id?: string;
  customer_id: string;
  quote_number?: string;
  total?: number;
  total_amount?: number;
  notes?: string;
  status: string;
  created_at: string;
  valid_until?: string;
  items?: unknown[];
  customers?: { name?: string } | null;
}

export function QuoteDashboard() {
  const { products, fetchAllCatalogs } = useCatalogStore();

  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuoteItemForm[]>([emptyItem()]);
  const [targetMargin, setTargetMargin] = useState<number>(() => {
    const stored = Number(localStorage.getItem(TARGET_MARGIN_KEY));
    return Number.isFinite(stored) && stored > 0 && stored < 95 ? stored : 30;
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      await fetchAllCatalogs();
      if (cancelled) return;
      await fetchData();
    };
    load();
    return () => { cancelled = true; };
  }, [fetchAllCatalogs]);

  const fetchData = async () => {
    try {
      const companyId = useTenantStore.getState().activeCompanyId;
      if (!companyId) return;

      const [clientsRes, quotesRes] = await Promise.allSettled([
        supabase.from('customers').select('id, name, cuit').eq('company_id', companyId).order('name'),
        supabase.from('quotes').select('*, customers(name)').eq('company_id', companyId).order('created_at', { ascending: false }),
      ]);

      if (clientsRes.status === 'fulfilled' && !clientsRes.value.error) {
        setClients((clientsRes.value.data || []) as unknown as Client[]);
      }
      if (quotesRes.status === 'fulfilled' && !quotesRes.value.error) {
        setQuotes((quotesRes.value.data || []) as unknown as QuoteRecord[]);
      }
    } catch (err) {
      console.error('Error loading quotes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemRow = () => {
    setQuoteItems([...quoteItems, emptyItem()]);
  };

  const removeItemRow = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof QuoteItemForm, value: string | number) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].unit_price = Number(product.price || 0);
        newItems[index].unit_cost = Number((product as Product).cost_price || 0);
        newItems[index].description = product.name || '';
      }
    }
    setQuoteItems(newItems);
  };

  const calculateTotal = useCallback(() => {
    return quoteItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  }, [quoteItems]);

  const totals = useMemo(() => {
    const sale = quoteItems.reduce((acc, i) => acc + i.quantity * Number(i.unit_price || 0), 0);
    const cost = quoteItems.reduce((acc, i) => acc + i.quantity * Number(i.unit_cost || 0), 0);
    const profit = sale - cost;
    const marginPct = sale > 0 ? (profit / sale) * 100 : 0;
    const suggested = targetMargin < 100 && targetMargin > 0 ? cost / (1 - targetMargin / 100) : 0;
    return { sale, cost, profit, marginPct, suggested };
  }, [quoteItems, targetMargin]);

  const handleTargetMarginChange = (v: number) => {
    setTargetMargin(v);
    localStorage.setItem(TARGET_MARGIN_KEY, String(v));
  };

  const handleSaveQuote = async () => {
    if (!selectedClient) return;
    if (quoteItems.some(i => !i.product_id || i.quantity <= 0)) return;

    setIsSaving(true);
    try {
      const companyId = useTenantStore.getState().activeCompanyId;
      if (!companyId) throw new Error('No hay empresa activa');

      const quoteNumber = `PRE-${String(quotes.length + 1).padStart(3, '0')}`;
      const totalAmount = calculateTotal();

      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          company_id: companyId,
          customer_id: selectedClient,
          quote_number: quoteNumber,
          total: totalAmount,
          notes: quoteNotes,
          status: 'PENDIENTE',
          items: quoteItems as never,
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      const itemsToInsert = quoteItems.map(item => ({
        quote_id: newQuote.id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      setIsModalOpen(false);
      setSelectedClient('');
      setQuoteNotes('');
      setQuoteItems([emptyItem()]);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error saving quote:', message);
      void Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo guardar el presupuesto: ${message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', quoteId);
      if (error) throw error;
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDuplicate = (quote: QuoteRecord) => {
    setSelectedClient(quote.customer_id);
    setQuoteNotes(quote.notes || '');
    setQuoteItems([emptyItem()]);
    setIsModalOpen(true);
  };

  const handleDelete = async (quoteId: string) => {
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', quoteId);
      if (error) throw error;
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
    } catch (err) {
      console.error('Error deleting quote:', err);
    }
  };

  const handleDownloadPDF = async (quote: QuoteRecord) => {
    try {
      const { data: items, error } = await supabase
        .from('quote_items')
        .select('id, product_id, description, quantity, unit_price')
        .eq('quote_id', quote.id);
      if (error) throw error;

      const totalAmount = quote.total_amount || quote.total || 0;
      const quoteForPdf = {
        ...quote,
        total: totalAmount,
        quote_number: quote.quote_number || 'S/N',
        clients: { name: quote.customers?.name || 'Sin cliente', document_id: '' },
      };

      const mappedItems = (items || []).map((item: Record<string, unknown>) => ({
        quantity: Number(item.quantity) || 0,
        description: String(item.description || item.product_id || ''),
        unit_price: Number(item.unit_price) || 0,
      }));

      await generateQuotePDF(quoteForPdf, mappedItems);
    } catch {
      console.error('Error generating PDF');
    }
  };

  const handleShareWhatsApp = (quote: QuoteRecord) => {
    const customerName = quote.customers?.name || 'Sin cliente';
    const total = quote.total_amount || quote.total || 0;
    const quoteNumber = quote.quote_number || 'S/N';
    const message = `Hola ${customerName}, le enviamos la cotización ${quoteNumber} por ${ARS.format(total)}. Gracias por su interés.`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredQuotes = useMemo(() => {
    let list = [...quotes];
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(q =>
        (q.quote_number || '').toLowerCase().includes(term) ||
        (q.customers?.name || '').toLowerCase().includes(term) ||
        (q.notes || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter(q => q.status === statusFilter);
    }
    list.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortDir === 'desc' ? db - da : da - db;
    });
    return list;
  }, [quotes, search, statusFilter, sortDir]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: quotes.length };
    quotes.forEach(q => { counts[q.status] = (counts[q.status] || 0) + 1; });
    return counts;
  }, [quotes]);

  const stats = useMemo(() => {
    const totalValue = quotes.reduce((s, q) => s + Number(q.total_amount || q.total || 0), 0);
    const pending = quotes.filter(q => q.status === 'PENDIENTE').length;
    const approved = quotes.filter(q => q.status === 'APROBADO').length;
    return { totalValue, pending, approved, total: quotes.length };
  }, [quotes]);

  const handleExportCSV = useCallback(() => {
    const rows: string[][] = [
      ['COTIZACIONES', '', '', '', '', ''],
      ['Fecha', new Date().toISOString().slice(0, 10), '', '', '', ''],
      [''],
      ['Número', 'Fecha', 'Cliente', 'Estado', 'Total', 'Notas'],
      ...filteredQuotes.map(q => [
        q.quote_number || 'S/N',
        new Date(q.created_at).toLocaleDateString('es-AR'),
        q.customers?.name || 'Sin cliente',
        q.status,
        String(q.total_amount || q.total || 0),
        q.notes || '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cotizaciones_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredQuotes]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'APROBADO': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'ENVIADO': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'RECHAZADO': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl w-64" />
        <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300 print:p-0">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Cotizador
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Presupuestos para clientes e instituciones</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
            <Download className="w-3 h-3" /> CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
            <Plus className="w-3 h-3" /> Nuevo Presupuesto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: String(stats.total), color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800' },
          { label: 'Pendientes', value: String(stats.pending), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Aprobados', value: String(stats.approved), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Valor Total', value: ARS.format(stats.totalValue), color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm`}>
            <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            <p className={`text-sm font-black ${color} tabular-nums mt-0.5`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente o notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {['ALL', 'PENDIENTE', 'APROBADO', 'ENVIADO', 'RECHAZADO'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'ALL' ? 'Todos' : status} <span className="ml-1 opacity-60">{statusCounts[status] || 0}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
          <Calendar className="w-3 h-3" /> {sortDir === 'desc' ? 'Más recientes' : 'Más antiguos'}
        </button>
      </div>

      {/* Quotes Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-[9px] font-black uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="p-3">Número / Fecha</th>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-400">
                      {search || statusFilter !== 'ALL' ? 'Sin resultados para la búsqueda' : 'Sin presupuestos registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="p-3">
                      <span className="font-black text-xs dark:text-white block">{q.quote_number || 'S/N'}</span>
                      <span className="text-[9px] font-bold text-slate-400">{new Date(q.created_at).toLocaleDateString('es-AR')}</span>
                    </td>
                    <td className="p-3 font-bold text-xs dark:text-slate-300 uppercase">{q.customers?.name || 'Sin cliente'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusColor(q.status)}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-xs tabular-nums dark:text-white">
                      {ARS.format(q.total_amount || q.total || 0)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleDownloadPDF(q)} title="PDF"
                          className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 rounded-lg transition-all">
                          <Download className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleShareWhatsApp(q)} title="WhatsApp" className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all">
                          <MessageSquare className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDuplicate(q)} title="Duplicar"
                          className="p-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-600 hover:text-white text-slate-500 rounded-lg transition-all">
                          <Copy className="w-3 h-3" />
                        </button>
                        {q.status === 'PENDIENTE' && (
                          <>
                            <button onClick={() => handleUpdateStatus(q.id, 'APROBADO')} title="Aprobar"
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg transition-all">
                              <CheckCircle className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleUpdateStatus(q.id, 'RECHAZADO')} title="Rechazar"
                              className="p-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 rounded-lg transition-all">
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(q.id)} title="Eliminar"
                          className="p-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 rounded-lg transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVO PRESUPUESTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl border dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">

            <div className="p-5 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h2 className="font-black dark:text-white uppercase tracking-tighter text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Nuevo Presupuesto
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Client */}
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <label className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-2 block tracking-widest">Cliente / Institución</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-indigo-500">
                  <option value="">-- Seleccionar cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.cuit ? `(CUIT: ${c.cuit})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b dark:border-slate-700 pb-2">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Artículos</h3>
                  <button onClick={addItemRow} className="flex items-center gap-1 text-[9px] bg-slate-900 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg uppercase font-black">
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                </div>

                {quoteItems.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border dark:border-slate-700 items-start md:items-center">
                    <div className="w-full md:w-1/3">
                      <select value={item.product_id} onChange={e => updateItemRow(index, 'product_id', e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-bold dark:text-white outline-none">
                        <option value="">-- Producto --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.sku ? `${p.sku} | ` : ''}{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-1/4">
                      <input type="text" placeholder="Descripción" value={item.description}
                        onChange={e => updateItemRow(index, 'description', e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-medium dark:text-white outline-none" />
                    </div>
                    <div className="w-full md:w-20">
                      <input type="number" min="1" value={item.quantity}
                        onChange={e => updateItemRow(index, 'quantity', Number(e.target.value))}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-black text-center dark:text-white outline-none" />
                    </div>
                    <div className="w-full md:w-28">
                      <input type="number" value={item.unit_price}
                        onChange={e => updateItemRow(index, 'unit_price', Number(e.target.value))}
                        title="Precio de venta"
                        className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-black text-emerald-600 dark:text-emerald-400 outline-none" />
                    </div>
                    <div className="w-full md:w-24">
                      <input type="number" value={item.unit_cost || ''}
                        placeholder="Costo"
                        onChange={e => updateItemRow(index, 'unit_cost', Number(e.target.value))}
                        title="Costo real por unidad (insumos + blank)"
                        className="w-full p-2.5 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-lg text-[10px] font-black text-rose-600 dark:text-rose-400 outline-none" />
                    </div>
                    <div className="w-full md:w-28 text-right">
                      <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums">{ARS.format(item.quantity * item.unit_price)}</span>
                    </div>
                    {quoteItems.length > 1 && (
                      <button onClick={() => removeItemRow(index)} className="text-rose-500 hover:text-rose-600 p-1">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Notes + Total */}
              <div className="flex flex-col md:flex-row justify-between items-start pt-4 border-t dark:border-slate-700 gap-4">
                <div className="w-full md:w-1/2">
                  <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block tracking-widest">Observaciones</label>
                  <textarea placeholder="Validez del precio, tiempos de entrega, etc."
                    value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-medium resize-none text-xs" rows={3} />
                </div>
                <div className="w-full md:w-[42%] bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Costo estimado</p>
                      <p className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">{ARS.format(totals.cost)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Venta total</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight">{ARS.format(totals.sale)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ganancia</p>
                      <p className={`text-xs font-black tabular-nums ${totals.profit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{ARS.format(totals.profit)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Margen real</p>
                      <p className={`text-xs font-black tabular-nums ${
                        totals.sale === 0 ? 'text-slate-400'
                          : totals.marginPct >= 30 ? 'text-emerald-600 dark:text-emerald-400'
                          : totals.marginPct >= 10 ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}>
                        {totals.sale > 0 ? `${totals.marginPct.toFixed(1)}%` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-700">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap" htmlFor="q-target-margin">Margen objetivo</label>
                    <input id="q-target-margin" type="number" min="1" max="95" value={targetMargin}
                      onChange={e => handleTargetMarginChange(Number(e.target.value))}
                      className="w-14 p-1.5 bg-white dark:bg-slate-800 border dark:border-slate-600 rounded-lg text-[10px] font-black text-center dark:text-white outline-none" />
                    <span className="text-[9px] font-bold text-indigo-500 tabular-nums whitespace-nowrap">
                      → Sugerido: {ARS.format(totals.suggested)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)}
                className="uppercase text-[10px] font-black text-slate-400 px-4 hover:text-slate-600 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveQuote} disabled={isSaving}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                <Send className="w-3 h-3" /> {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

QuoteDashboard.displayName = 'QuoteDashboard';
