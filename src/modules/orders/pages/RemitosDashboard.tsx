import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCatalogStore } from '../../../store/useCatalogStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { useOrderStore } from '../store/useOrderStore';
import type { Database } from '../../../shared/types/database.types';

type RemitoJson = Database['public']['Tables']['remitos']['Insert']['items'];
import { ARS } from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/cn';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import {
  Printer, Plus, Trash2, FileText, User, MapPin,
  MessageCircle, Copy, Download, Save,
  CheckCircle, XCircle, Send, Search,
  Package, Mail,
  Edit3, Archive,
} from 'lucide-react';
import Swal from 'sweetalert2';

interface PedidoItem {
  id: string;
  qtyOrdered: number;
  qtyDelivered: number;
  description: string;
  details: string;
  unitPrice: number;
}

interface Remito {
  id: string;
  number: string;
  date: string;
  customer: string;
  address: string;
  status: 'DRAFT' | 'SENT' | 'DELIVERED' | 'CANCELLED';
  items: PedidoItem[];
  viewType: 'STANDARD' | 'PENDING' | 'VALUED';
  total: number;
  orderId?: string;
  notes?: string;
}

const REMITO_STATUSES = {
  DRAFT: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600', icon: FileText, label: 'Borrador' },
  SENT: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', icon: Send, label: 'Enviado' },
  DELIVERED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600', icon: CheckCircle, label: 'Entregado' },
  CANCELLED: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600', icon: XCircle, label: 'Cancelado' },
};

const OPERACION_OPTIONS = ['ENTREGA PARCIAL', 'ENTREGA TOTAL', 'PRESUPUESTO', 'TRASLADO A TALLER', 'DEVOLUCIÓN', 'CAMBIO'];

interface RemitoRow {
  id: string;
  number: string;
  date: string;
  customer: string | null;
  address: string | null;
  status: Remito['status'];
  items: PedidoItem[];
  view_type: Remito['viewType'];
  total: number | string;
  order_id: string | null;
  notes: string | null;
}

function toDb(remito: Remito) {
  return {
    number: remito.number,
    date: remito.date,
    customer: remito.customer,
    address: remito.address,
    status: remito.status,
    items: remito.items as unknown as RemitoJson,
    view_type: remito.viewType,
    total: remito.total,
    order_id: remito.orderId ?? null,
    notes: remito.notes ?? null,
  };
}

function fromDb(row: RemitoRow): Remito {
  return {
    id: row.id,
    number: row.number,
    date: row.date,
    customer: row.customer || '',
    address: row.address || '',
    status: row.status,
    items: Array.isArray(row.items) ? row.items : [],
    viewType: row.view_type,
    total: Number(row.total) || 0,
    orderId: row.order_id || undefined,
    notes: row.notes || undefined,
  };
}

function generateRemitoNumber(): string {
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `0001-${seq}`;
}

// ========== MAIN COMPONENT ==========
const RemitosContent = memo(() => {
  const { products = [], sizes = [], colors = [], fetchAllCatalogs } = useCatalogStore();
  const { balances = [], fetchBalances } = useCrmStore();
  const { orders, fetchOrders } = useOrderStore();

  const [remitos, setRemitos] = useState<Remito[]>([]);
  const remitosRef = useRef<Remito[]>([]);
  useEffect(() => { remitosRef.current = remitos; }, [remitos]);
  const [activeView, setActiveView] = useState<'editor' | 'history'>('editor');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Editor state
  const [remitoNumber] = useState(() => generateRemitoNumber());
  const [viewType, setViewType] = useState<'STANDARD' | 'PENDING' | 'VALUED'>('STANDARD');
  const [cliente, setCliente] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [estadoOperacion, setEstadoOperacion] = useState('ENTREGA PARCIAL');
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [notes, setNotes] = useState('');
  const [linkedOrderId, setLinkedOrderId] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Quick add state
  const [quickProductId, setQuickProductId] = useState('');
  const [quickSize, setQuickSize] = useState('');
  const [quickColor, setQuickColor] = useState('');
  const [newItem, setNewItem] = useState({ qtyOrdered: 1, qtyDelivered: 1, description: '', details: '', unitPrice: 0 });

  useEffect(() => { fetchAllCatalogs(); fetchBalances(); fetchOrders(); }, [fetchAllCatalogs, fetchBalances, fetchOrders]);

  const fetchRemitos = useCallback(async () => {
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;
    const { data, error } = await supabase
      .from('remitos')
      .select('*')
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    if (!error && data) setRemitos((data as unknown as RemitoRow[]).map(fromDb));
    else if (error) console.error('Error fetching remitos:', error.message);
  }, []);

  useEffect(() => { void fetchRemitos(); }, [fetchRemitos]);

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const totalGeneral = useMemo(() => items.reduce((acc, i) => acc + (i.qtyOrdered * i.unitPrice), 0), [items]);
  const totalPending = useMemo(() => items.reduce((acc, i) => acc + (i.qtyOrdered - i.qtyDelivered), 0), [items]);

  const filteredRemitos = useMemo(() => {
    let result = [...remitos];
    if (statusFilter !== 'ALL') result = result.filter(r => r.status === statusFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(r => r.customer.toLowerCase().includes(s) || r.number.toLowerCase().includes(s));
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [remitos, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: remitos.length,
    draft: remitos.filter(r => r.status === 'DRAFT').length,
    sent: remitos.filter(r => r.status === 'SENT').length,
    delivered: remitos.filter(r => r.status === 'DELIVERED').length,
    totalValue: remitos.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + r.total, 0),
  }), [remitos]);

  // ===== Item Management =====
  const handleQuickProductSelect = useCallback((productId: string) => {
    setQuickProductId(productId);
    const prod = productMap.get(productId);
    if (prod) setNewItem(prev => ({ ...prev, description: prod.name, unitPrice: Number(prod.price) || 0 }));
  }, [productMap]);

  const handleQuickSizeSelect = useCallback((talle: string) => {
    setQuickSize(talle);
    setNewItem(prev => ({ ...prev, details: talle ? `SISA: ${talle}${quickColor ? ` | COLOR: ${quickColor}` : ''}` : (quickColor ? `COLOR: ${quickColor}` : '') }));
  }, [quickColor]);

  const handleQuickColorSelect = useCallback((color: string) => {
    setQuickColor(color);
    setNewItem(prev => ({ ...prev, details: color ? `${quickSize ? `SISA: ${quickSize} | ` : ''}COLOR: ${color}` : (quickSize ? `SISA: ${quickSize}` : '') }));
  }, [quickSize]);

  const handleAddItem = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description.trim()) return;
    const existingIndex = items.findIndex(i => i.description === newItem.description && i.details === newItem.details);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].qtyOrdered += newItem.qtyOrdered;
      updated[existingIndex].qtyDelivered += newItem.qtyDelivered;
      setItems(updated);
    } else {
      setItems([...items, { ...newItem, id: crypto.randomUUID() }]);
    }
    setNewItem({ qtyOrdered: 1, qtyDelivered: 1, description: '', details: '', unitPrice: 0 });
    setQuickProductId(''); setQuickSize(''); setQuickColor('');
  }, [newItem, items]);

  const removeItem = useCallback((id: string) => setItems(prev => prev.filter(i => i.id !== id)), []);
  const updateItemField = useCallback((id: string, field: keyof PedidoItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }, []);

  // ===== Save/Load =====
  const handleSaveRemito = useCallback(async () => {
    if (items.length === 0) return Swal.fire({ title: 'Sin items', text: 'Agregá al menos un artículo', icon: 'warning' });
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return Swal.fire({ title: 'Sin empresa activa', icon: 'warning' });
    const remito: Remito = {
      id: crypto.randomUUID(),
      number: remitoNumber,
      date: new Date().toISOString(),
      customer: cliente || 'Consumidor Final',
      address: domicilio,
      status: 'DRAFT',
      items: [...items],
      viewType,
      total: totalGeneral,
      orderId: linkedOrderId || undefined,
      notes,
    };
    const { data, error } = await supabase
      .from('remitos')
      .insert([{ ...toDb(remito), company_id: companyId }])
      .select();
    if (error || !data || data.length === 0) {
      console.error('Error saving remito:', error?.message);
      return Swal.fire({ title: 'Error', text: 'No se pudo guardar el remito.', icon: 'error' });
    }
    setRemitos((prev) => [fromDb(data[0] as unknown as RemitoRow), ...prev]);
    Swal.fire({ title: 'Remito guardado', icon: 'success', timer: 1500, showConfirmButton: false });
  }, [items, remitoNumber, cliente, domicilio, viewType, totalGeneral, linkedOrderId, notes]);

  const handleUpdateRemitoStatus = useCallback((id: string, status: Remito['status']) => {
    const prev = remitosRef.current;
    setRemitos((rows) => rows.map(r => r.id === id ? { ...r, status } : r));
    void supabase.from('remitos').update({ status }).eq('id', id).then(({ error }) => {
      if (error) {
        console.error('Error updating remito status:', error.message);
        setRemitos(prev);
        void Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo actualizar el remito', showConfirmButton: false, timer: 3000 });
      }
    });
  }, []);

  const handleDeleteRemito = useCallback((id: string) => {
    Swal.fire({ title: '¿Eliminar remito?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then(result => {
      if (result.isConfirmed) {
        const prev = remitosRef.current;
        setRemitos((rows) => rows.filter(r => r.id !== id));
        void supabase.from('remitos').delete().eq('id', id).then(({ error }) => {
          if (error) {
            console.error('Error deleting remito:', error.message);
            setRemitos(prev);
            void Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'No se pudo eliminar el remito', showConfirmButton: false, timer: 3000 });
          }
        });
      }
    });
  }, []);

  const handleLoadRemito = useCallback((remito: Remito) => {
    setCliente(remito.customer);
    setDomicilio(remito.address);
    setViewType(remito.viewType);
    setItems(remito.items);
    setNotes(remito.notes || '');
    setLinkedOrderId(remito.orderId || '');
    setActiveView('editor');
  }, []);

  const handleDuplicateRemito = useCallback(async (remito: Remito) => {
    const duplicate: Remito = {
      ...remito,
      id: crypto.randomUUID(),
      number: generateRemitoNumber(),
      date: new Date().toISOString(),
      status: 'DRAFT',
    };
    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;
    const { data, error } = await supabase
      .from('remitos')
      .insert([{ ...toDb(duplicate), company_id: companyId }])
      .select();
    if (error || !data || data.length === 0) {
      console.error('Error duplicating remito:', error?.message);
      return Swal.fire({ title: 'Error', text: 'No se pudo duplicar el remito.', icon: 'error' });
    }
    setRemitos((prev) => [fromDb(data[0] as unknown as RemitoRow), ...prev]);
    Swal.fire({ title: 'Remito duplicado', icon: 'success', timer: 1500, showConfirmButton: false });
  }, []);

  const handleLinkToOrder = useCallback((orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    setCliente(order.customer_name);
    setLinkedOrderId(orderId);
    const orderItems: PedidoItem[] = [];
    order.items?.forEach(item => {
      item.variations.forEach(v => {
        orderItems.push({
          id: crypto.randomUUID(),
          qtyOrdered: v.quantity,
          qtyDelivered: v.quantityDelivered || 0,
          description: item.productId || '',
          details: `T${v.sizeId}${v.colorId ? ` / ${v.colorId}` : ''}`,
          unitPrice: 0,
        });
      });
    });
    if (orderItems.length > 0) setItems(orderItems);
  }, [orders]);

  // ===== Share/Print =====
  const handlePrint = useCallback(() => window.print(), []);

  const handleWhatsAppShare = useCallback(() => {
    if (items.length === 0) return Swal.fire({ title: 'Sin items', icon: 'warning' });
    let text = `*📋 REMITO ${remitoNumber}*\n`;
    text += `*Fecha:* ${new Date().toLocaleDateString('es-AR')}\n`;
    text += `*Cliente:* ${cliente || 'Consumidor Final'}\n`;
    if (domicilio) text += `*Destino:* ${domicilio}\n`;
    text += `*Estado:* ${estadoOperacion}\n\n`;
    text += `*Detalle:*\n`;
    items.forEach(item => {
      if (viewType === 'PENDING') {
        const falta = item.qtyOrdered - item.qtyDelivered;
        text += `▪ ${item.description} (${item.details}) → Ped: ${item.qtyOrdered} | Ent: ${item.qtyDelivered} | Falta: ${falta > 0 ? falta : 0}\n`;
      } else if (viewType === 'VALUED') {
        text += `▪ ${item.qtyOrdered}x ${item.description} → ${ARS.format(item.unitPrice)} c/u\n`;
      } else {
        text += `▪ ${item.qtyOrdered}x ${item.description} (${item.details})\n`;
      }
    });
    if (viewType === 'VALUED') text += `\n*TOTAL:* ${ARS.format(totalGeneral)}\n`;
    text += `\n🌱 *Soluciones Textiles Integrales*`;
    window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  }, [items, remitoNumber, cliente, domicilio, estadoOperacion, viewType, totalGeneral, customerPhone]);

  const handleExportPDF = useCallback(() => {
    Swal.fire({ title: 'Exportar PDF', text: 'Usá Ctrl+P → Guardar como PDF', icon: 'info', confirmButtonText: 'Entendido' });
  }, []);

  const handleEmailShare = useCallback(() => {
    if (!cliente) return Swal.fire({ title: 'Sin cliente', icon: 'warning' });
    const subject = `Remito ${remitoNumber} - ${cliente}`;
    let body = `Remito ${remitoNumber}\nFecha: ${new Date().toLocaleDateString('es-AR')}\nCliente: ${cliente}\n\nDetalle:\n`;
    items.forEach(i => { body += `- ${i.qtyOrdered}x ${i.description} (${i.details})\n`; });
    if (viewType === 'VALUED') body += `\nTotal: ${ARS.format(totalGeneral)}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  }, [cliente, remitoNumber, items, viewType, totalGeneral]);

  // ===== Clear Editor =====
  const handleClearEditor = useCallback(() => {
    setCliente(''); setDomicilio(''); setItems([]); setNotes(''); setLinkedOrderId(''); setCustomerPhone('');
    setNewItem({ qtyOrdered: 1, qtyDelivered: 1, description: '', details: '', unitPrice: 0 });
    setQuickProductId(''); setQuickSize(''); setQuickColor('');
  }, []);

  return (
    <div className="space-y-4 lg:space-y-5 animate-in fade-in duration-500">

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hide-on-print { display: none !important; }
          .print-expand { height: auto !important; overflow: visible !important; padding: 0 !important; background: white !important; }
          .print-container { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Remitos
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Generador y gestor de remitos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveView(activeView === 'editor' ? 'history' : 'editor')} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all active:scale-95', activeView === 'history' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300')}>
            {activeView === 'editor' ? <><Archive className="w-4 h-4" /> Historial</> : <><Edit3 className="w-4 h-4" /> Editor</>}
          </button>
        </div>
      </div>

      {activeView === 'editor' ? (
        <div className="flex flex-col xl:flex-row gap-4 xl:gap-6">

          {/* ===== LEFT PANEL: EDITOR ===== */}
          <div className="w-full xl:w-[450px] flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hide-on-print shrink-0">

            {/* Quick Actions Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Nº {remitoNumber}</span>
                <span className="text-[8px] font-bold text-slate-400">•</span>
                <span className="text-[8px] font-bold text-slate-400">{new Date().toLocaleDateString('es-AR')}</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleSaveRemito} disabled={items.length === 0} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 disabled:opacity-40">
                  <Save className="w-3 h-3" /> Guardar
                </button>
                <button onClick={handlePrint} disabled={items.length === 0} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 disabled:opacity-40">
                  <Printer className="w-3 h-3" /> Imprimir
                </button>
                <button onClick={handleWhatsAppShare} disabled={items.length === 0} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 disabled:opacity-40">
                  <MessageCircle className="w-3 h-3" /> WPP
                </button>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button onClick={handleEmailShare} disabled={!cliente} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 disabled:opacity-40">
                  <Mail className="w-3 h-3" /> Email
                </button>
                <button onClick={handleExportPDF} disabled={items.length === 0} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 disabled:opacity-40">
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button onClick={handleClearEditor} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95">
                  <Trash2 className="w-3 h-3" /> Limpiar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Link to Order */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block flex items-center gap-1.5">
                  <Package className="w-3 h-3" /> Vincular a Pedido
                </label>
                <select
                  value={linkedOrderId}
                  onChange={(e) => handleLinkToOrder(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all"
                >
                  <option value="">Sin vincular</option>
                  {orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').map(o => (
                    <option key={o.id} value={o.id}>{o.customer_name} - {o.business_unit}</option>
                  ))}
                </select>
              </div>

              {/* Customer */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Cliente
                </label>
                <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Seleccionar de CRM..." list="clientes-list"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
                <datalist id="clientes-list">
                  {balances.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>

              {/* Address & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Destino
                  </label>
                  <input type="text" value={domicilio} onChange={(e) => setDomicilio(e.target.value)} placeholder="Ej. Taller..."
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Teléfono</label>
                  <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Para WhatsApp..."
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
              </div>

              {/* Status & View Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Estado</label>
                  <select value={estadoOperacion} onChange={(e) => setEstadoOperacion(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase">
                    {OPERACION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Vista</label>
                  <div className="flex gap-1">
                    {([
                      { value: 'STANDARD' as const, label: 'Ficha', color: 'blue' },
                      { value: 'PENDING' as const, label: 'Saldos', color: 'rose' },
                      { value: 'VALUED' as const, label: 'Valorado', color: 'emerald' },
                    ]).map(({ value, label, color }) => (
                      <button key={value} onClick={() => setViewType(value)} className={cn(
                        'flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all',
                        viewType === value
                          ? color === 'blue' ? 'bg-blue-600 text-white' : color === 'rose' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-400',
                      )}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Product Add */}
              <div className="bg-brand/5 dark:bg-brand/10 p-3 rounded-xl border border-brand/20">
                <h3 className="text-[9px] font-black uppercase text-brand tracking-widest mb-2">Agregar Prenda</h3>
                <div className="space-y-2">
                  <select value={quickProductId} onChange={(e) => handleQuickProductSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-brand/20 rounded-lg text-xs font-medium dark:text-white outline-none focus:border-brand">
                    <option value="">-- Catálogo --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={quickSize} onChange={(e) => handleQuickSizeSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-brand/20 rounded-lg text-xs font-medium dark:text-white outline-none focus:border-brand">
                      <option value="">-- Sisa --</option>
                      {sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select value={quickColor} onChange={(e) => handleQuickColorSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-brand/20 rounded-lg text-xs font-medium dark:text-white outline-none focus:border-brand">
                      <option value="">-- Color --</option>
                      {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <form onSubmit={handleAddItem} className="flex gap-2">
                    <div className="w-16">
                      <label className="text-[7px] font-black text-slate-400 block uppercase mb-0.5">Ped.</label>
                      <input type="number" min="1" value={newItem.qtyOrdered}
                        onChange={(e) => { const v = parseInt(e.target.value) || 1; setNewItem({ ...newItem, qtyOrdered: v, qtyDelivered: v }); }}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-white text-center" />
                    </div>
                    <div className="w-16">
                      <label className="text-[7px] font-black text-slate-400 block uppercase mb-0.5">Ent.</label>
                      <input type="number" min="0" value={newItem.qtyDelivered}
                        onChange={(e) => setNewItem({ ...newItem, qtyDelivered: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-white text-center" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[7px] font-black text-slate-400 block uppercase mb-0.5">P. Unit.</label>
                      <input type="number" min="0" value={newItem.unitPrice}
                        onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-white text-right" />
                    </div>
                    <button type="submit" disabled={!newItem.description} className="self-end px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-black disabled:opacity-40 transition-all active:scale-95">
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Artículo..." value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold dark:text-white uppercase outline-none focus:border-brand" />
                    <input type="text" placeholder="Detalles..." value={newItem.details}
                      onChange={(e) => setNewItem({ ...newItem, details: e.target.value })}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium dark:text-white uppercase outline-none focus:border-brand" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Notas</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all resize-none" />
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Items ({items.length})</span>
                  {items.length > 0 && (
                    <div className="flex items-center gap-3 text-[9px] font-bold">
                      <span className="text-slate-400">Total: <span className="text-slate-900 dark:text-white">{ARS.format(totalGeneral)}</span></span>
                      {viewType === 'PENDING' && <span className="text-rose-500">Pendiente: {totalPending}</span>}
                    </div>
                  )}
                </div>
                {items.map(item => {
                  const falta = item.qtyOrdered - item.qtyDelivered;
                  return (
                    <div key={item.id} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate">{item.description}</p>
                          <p className="text-[9px] text-slate-400 uppercase">{item.details}</p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[7px] font-black text-slate-400 block uppercase">Ped.</label>
                          <input type="number" value={item.qtyOrdered} onChange={(e) => updateItemField(item.id, 'qtyOrdered', parseInt(e.target.value) || 1)}
                            className="w-full bg-white dark:bg-slate-950 text-center text-[10px] font-bold rounded-lg py-1 border border-slate-200 dark:border-slate-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="text-[7px] font-black text-slate-400 block uppercase">Ent.</label>
                          <input type="number" value={item.qtyDelivered} onChange={(e) => updateItemField(item.id, 'qtyDelivered', parseInt(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-950 text-center text-[10px] font-bold rounded-lg py-1 border border-slate-200 dark:border-slate-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="text-[7px] font-black text-slate-400 block uppercase">Precio</label>
                          <input type="number" value={item.unitPrice} onChange={(e) => updateItemField(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-950 text-right text-[10px] font-bold rounded-lg py-1 border border-slate-200 dark:border-slate-700 dark:text-white" />
                        </div>
                      </div>
                      {viewType === 'PENDING' && falta > 0 && (
                        <div className="mt-1.5 text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded text-center">
                          Falta: {falta}
                        </div>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-[10px] font-bold uppercase">Sin items</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== RIGHT PANEL: A4 PREVIEW ===== */}
          <div className="w-full xl:flex-1 flex flex-col bg-slate-200 dark:bg-slate-900 rounded-2xl overflow-hidden shadow-inner print-container hide-on-print">
            <div className="flex-1 overflow-auto p-4 xl:p-8 flex flex-col items-center">
              <div id="printable-a4" className="bg-white text-black p-8 shadow-2xl print-expand" style={{ minWidth: '210mm', maxWidth: '210mm', minHeight: '297mm' }}>

                {/* Header */}
                <div className="border-2 border-slate-800 rounded-xl mb-6 overflow-hidden">
                  <div className="flex items-start justify-between p-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl font-black text-white leading-none">R</span>
                      </div>
                      <div>
                        <h1 className="text-3xl font-extrabold tracking-widest text-slate-900 leading-none">RAÍCES</h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mt-1.5">Soluciones Textiles Integrales</p>
                        <div className="mt-2 text-[10px] font-medium text-slate-500 space-y-0.5">
                          <p>Berisso, Buenos Aires</p>
                          <p>raices.textil@gmail.com</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="inline-flex flex-col items-center border-2 border-slate-800 rounded-lg px-5 py-2">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tipo</span>
                        <span className="text-xl font-black text-slate-900 leading-none mt-1">
                          {viewType === 'PENDING' ? 'SALDOS' : viewType === 'VALUED' ? 'VALORADO' : 'INTERNO'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800 text-white px-5 py-2.5">
                    <div className="text-xs font-bold">
                      <span className="text-slate-400">Nº:</span> <span className="font-black">{remitoNumber}</span>
                    </div>
                    <div className="text-xs font-bold">
                      <span className="text-slate-400">Fecha:</span> <span className="font-black">{new Date().toLocaleDateString('es-AR')}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
                      Documento interno no válido como factura
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="border border-slate-400 rounded-lg p-4 mb-6 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <p><strong className="text-slate-700 uppercase text-[10px] tracking-wider">Señor(es):</strong> <span className="font-bold uppercase">{cliente || '________________________'}</span></p>
                    <p><strong className="text-slate-700 uppercase text-[10px] tracking-wider">Estado:</strong> <span className="font-bold uppercase text-blue-700">{estadoOperacion}</span></p>
                    <p className="col-span-2"><strong className="text-slate-700 uppercase text-[10px] tracking-wider">Destino:</strong> <span className="font-bold uppercase">{domicilio || '________________________________________'}</span></p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                      {viewType === 'PENDING' ? (
                        <>
                          <th className="py-2.5 px-2 text-center border border-slate-800 w-16 bg-slate-700">Ped.</th>
                          <th className="py-2.5 px-2 text-center border border-slate-800 w-16 bg-blue-700">Ent.</th>
                          <th className="py-2.5 px-2 text-center border border-slate-800 w-16 bg-rose-700">Falta</th>
                        </>
                      ) : (
                        <th className="py-2.5 px-4 text-center w-24 border border-slate-800">CANT.</th>
                      )}
                      <th className="py-2.5 px-4 border border-slate-800">DESCRIPCIÓN</th>
                      <th className="py-2.5 px-4 border border-slate-800 w-1/3">DETALLES</th>
                      {viewType === 'VALUED' && (
                        <>
                          <th className="py-2.5 px-4 text-right border border-slate-800 w-24">P. UNIT.</th>
                          <th className="py-2.5 px-4 text-right border border-slate-800 w-28">SUBTOTAL</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const falta = item.qtyOrdered - item.qtyDelivered;
                      const subtotal = item.qtyOrdered * item.unitPrice;
                      return (
                        <tr key={index} className="border-b border-slate-300 text-sm">
                          {viewType === 'PENDING' ? (
                            <>
                              <td className="py-2.5 px-2 border-x border-slate-300 text-center text-slate-500">{item.qtyOrdered}</td>
                              <td className="py-2.5 px-2 border-x border-slate-300 font-bold text-center text-blue-700">{item.qtyDelivered}</td>
                              <td className="py-2.5 px-2 border-x border-slate-300 font-black text-center text-rose-600">{falta > 0 ? falta : '-'}</td>
                            </>
                          ) : (
                            <td className="py-2.5 px-4 border-x border-slate-300 font-bold text-center">{item.qtyOrdered}</td>
                          )}
                          <td className="py-2.5 px-4 border-x border-slate-300 font-bold uppercase">{item.description}</td>
                          <td className="py-2.5 px-4 border-x border-slate-300 text-xs font-semibold text-slate-600 uppercase">{item.details}</td>
                          {viewType === 'VALUED' && (
                            <>
                              <td className="py-2.5 px-4 border-x border-slate-300 text-right tabular-nums">${item.unitPrice.toLocaleString('es-AR')}</td>
                              <td className="py-2.5 px-4 border-x border-slate-300 text-right font-bold tabular-nums">${subtotal.toLocaleString('es-AR')}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 14 - items.length) }).map((_, i) => (
                      <tr key={`empty-${i}`} className="border-b border-slate-200/50">
                        <td className="py-4 border-x border-slate-300" colSpan={viewType === 'PENDING' ? 3 : 1}></td>
                        <td className="py-4 border-x border-slate-300"></td>
                        <td className="py-4 border-x border-slate-300"></td>
                        {viewType === 'VALUED' && <td className="py-4 border-x border-slate-300" colSpan={2}></td>}
                      </tr>
                    ))}
                    {viewType === 'VALUED' && (
                      <tr className="border-t-2 border-slate-800 bg-slate-50">
                        <td colSpan={3} className="py-4 px-4 text-right text-xs font-black uppercase tracking-widest text-slate-700">Total:</td>
                        <td colSpan={2} className="py-4 px-4 text-right text-xl font-black tabular-nums">{ARS.format(totalGeneral)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Signatures */}
                <div className="mt-8 flex justify-between items-end px-12 pt-12">
                  <div className="w-1/3 text-center border-t-2 border-slate-400 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest">Responsable Raíces</p>
                  </div>
                  <div className="w-1/3 text-center border-t-2 border-slate-400 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest">Conformidad Recibo</p>
                  </div>
                </div>

                {notes && (
                  <div className="mt-6 p-3 border border-slate-300 rounded-lg bg-slate-50">
                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Observaciones:</p>
                    <p className="text-xs text-slate-700">{notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ===== HISTORY VIEW ===== */
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, color: 'brand' },
              { label: 'Borradores', value: stats.draft, color: 'slate' },
              { label: 'Enviados', value: stats.sent, color: 'blue' },
              { label: 'Entregados', value: stats.delivered, color: 'emerald' },
              { label: 'Valor Total', value: ARS.format(stats.totalValue), color: 'brand' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
                <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Buscar por cliente o número..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
              </div>
              <div className="flex gap-1">
                {(['ALL', 'DRAFT', 'SENT', 'DELIVERED', 'CANCELLED'] as const).map((status) => {
                  const cfg = status === 'ALL' ? null : REMITO_STATUSES[status];
                  return (
                    <button key={status} onClick={() => setStatusFilter(status)} className={cn(
                      'px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all',
                      statusFilter === status ? (status === 'ALL' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : cn(cfg?.bg, cfg?.text)) : 'bg-slate-100 dark:bg-slate-900 text-slate-400',
                    )}>
                      {status === 'ALL' ? 'Todos' : cfg?.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Remitos List */}
          <div className="space-y-2">
            {filteredRemitos.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-black text-slate-400 uppercase text-sm">Sin remitos</p>
              </div>
            ) : (
              filteredRemitos.map(remito => {
                const cfg = REMITO_STATUSES[remito.status];
                const Icon = cfg.icon;
                return (
                  <div key={remito.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
                          <Icon className={cn('w-5 h-5', cfg.text)} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-900 dark:text-white">{remito.number}</span>
                            <span className={cn('px-2 py-0.5 text-[8px] font-black rounded-md', cfg.bg, cfg.text)}>{cfg.label}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{remito.customer}</p>
                          <p className="text-[9px] text-slate-400">{new Date(remito.date).toLocaleDateString('es-AR')} · {remito.items.length} items</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(remito.total)}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleLoadRemito(remito)} className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors" title="Cargar en editor">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDuplicateRemito(remito)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Duplicar">
                            <Copy className="w-4 h-4" />
                          </button>
                          <select value={remito.status} onChange={(e) => handleUpdateRemitoStatus(remito.id, e.target.value as Remito['status'])}
                            className="text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1 border-0 outline-none cursor-pointer">
                            {Object.entries(REMITO_STATUSES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                          </select>
                          <button onClick={() => handleDeleteRemito(remito.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

RemitosContent.displayName = 'RemitosContent';

export const RemitosDashboard = memo(() => (
  <ErrorBoundary>
    <RemitosContent />
  </ErrorBoundary>
));
RemitosDashboard.displayName = 'RemitosDashboard';
export default RemitosDashboard;
