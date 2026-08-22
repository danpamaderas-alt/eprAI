import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import {
  useOrderStore,
  type Order,
  type OrderPriority,
  type ProductionStage,
  type ActivityLogEntry,
  type OrderNote,
  type OrderPayment,
} from '../store/useOrderStore';
import { useCrmStore } from '../../crm/store/useCrmStore';
import { ARS } from '../../../shared/utils/format';
import { cn } from '../../../shared/utils/cn';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import { OrderForm } from '../components/OrderForm';
import { RemitoModal } from '../components/RemitoModal';
import { OrderLabel } from '../../orders/components/OrderLabel/OrderLabel';
import { useReactToPrint } from 'react-to-print';
import Swal from 'sweetalert2';
import {
  Search, Package, Calendar, Clock, CheckCircle, XCircle,
  AlertTriangle, Plus, Filter, ArrowUpDown, Phone, MessageSquare,
  FileText, Printer, ChevronDown, ChevronUp, TrendingUp,
  DollarSign, Users, PackageX, Edit3, Copy, Trash2,
  Pin, StickyNote, Camera, Upload, Play, Pause,
  LayoutGrid, List, CalendarDays, CheckSquare, Square,
  BarChart3, Bell, Send, MoreVertical, X, Save,
  Eye, EyeOff, Zap, Target, Truck, Scissors, Shirt,
  Box, ClipboardCheck, PackageCheck, ArrowRight,
} from 'lucide-react';

type StatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED';
type SortField = 'date' | 'amount' | 'status' | 'customer' | 'priority';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'kanban' | 'calendar';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  PENDING: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', icon: Clock, label: 'Pendiente' },
  PARTIAL: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: Package, label: 'Parcial' },
  DELIVERED: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle, label: 'Completado' },
  CANCELLED: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', icon: XCircle, label: 'Cancelado' },
};

const PRIORITY_CONFIG: Record<OrderPriority, { bg: string; text: string; icon: any; label: string }> = {
  LOW: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500', icon: ChevronDown, label: 'Baja' },
  NORMAL: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600', icon: ArrowUpDown, label: 'Normal' },
  URGENT: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600', icon: Zap, label: 'Urgente' },
};

const PRODUCTION_STAGES: { key: ProductionStage; label: string; icon: any; color: string }[] = [
  { key: 'CUTTING', label: 'Corte', icon: Scissors, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
  { key: 'SEWING', label: 'Costura', icon: Shirt, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  { key: 'FINISHING', label: 'Terminación', icon: Target, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
  { key: 'QC', label: 'Control', icon: ClipboardCheck, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' },
  { key: 'PACKING', label: 'Empaque', icon: Box, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
  { key: 'DELIVERING', label: 'Entrega', icon: Truck, color: 'text-brand bg-brand/10' },
];

const BUSINESS_UNITS = ['TODOS', 'GENERAL', 'RAICES', 'RJ_CO', 'BITA_IT', 'ROJO_SHOWROOM', 'UNIFORMES'] as const;

function exportToCSV(orders: Order[]) {
  const headers = ['Cliente', 'Estado', 'Prioridad', 'Total', 'Seña', 'Deuda', 'Fecha Vencimiento', 'Unidad'];
  const rows = orders.map((o) => [
    o.customer_name,
    o.status,
    o.priority || 'NORMAL',
    o.total_amount,
    o.advance_payment,
    (o.total_amount || 0) - (o.advance_payment || 0),
    o.due_date,
    o.business_unit,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(d: string | null | undefined) {
  if (!d) return 'S/F';
  return new Date(d).toLocaleDateString('es-AR');
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ========== MAIN COMPONENT ==========
const OrdersContent = memo(() => {
  const {
    orders = [], fetchOrders, registerPartialDelivery, updateOrder,
    addNote, addPayment, addActivityLog, setPriority, setProductionStage,
    viewMode, setViewMode, selectedOrders, toggleOrderSelection,
    selectAllOrders, clearSelection, bulkChangeStatus, duplicateOrder,
    saveTemplate, templates, deleteTemplate,
  } = useOrderStore();

  const { balances, fetchBalances } = useCrmStore();

  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [businessFilter, setBusinessFilter] = useState<string>('TODOS');
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isRemitoOpen, setIsRemitoOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [orderForLabel, setOrderForLabel] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'activity' | 'notes' | 'payments' | 'photos'>('info');

  useEffect(() => { fetchOrders(); fetchBalances(); }, [fetchOrders, fetchBalances]);

  const handlePrintLabelAction = useReactToPrint({ content: () => labelRef.current });
  const triggerLabelPrint = useCallback((order: Order) => {
    setOrderForLabel(order);
    setTimeout(() => { handlePrintLabelAction(); }, 300);
  }, [handlePrintLabelAction]);

  const handleDeliverVariation = useCallback(async (orderId: string, itemId: string, variationId: string, pendingQty: number, desc: string) => {
    const { value: qty } = await Swal.fire({
      title: `Entregar ${desc}`,
      input: 'number',
      inputLabel: `Pendiente: ${pendingQty}`,
      inputAttributes: { min: '1', max: pendingQty.toString() },
      showCancelButton: true,
      confirmButtonColor: '#10b981',
    });
    if (!qty) return;
    try {
      await registerPartialDelivery(orderId, { date: new Date().toISOString(), itemsDelivered: [{ itemId, variationId, quantity: Number(qty) }] });
      await addActivityLog(orderId, 'DELIVERY', `Entrega parcial: ${qty} unidades de ${desc}`);
      fetchOrders();
      Swal.fire({ title: 'Entrega Registrada', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ title: 'Error', text: 'No se pudo registrar la entrega', icon: 'error' });
    }
  }, [registerPartialDelivery, addActivityLog, fetchOrders]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: Order['status']) => {
    const confirm = await Swal.fire({
      title: 'Cambiar estado',
      text: `¿Cambiar a ${STATUS_CONFIG[newStatus]?.label || newStatus}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
    });
    if (!confirm.isConfirmed) return;
    try {
      await updateOrder(orderId, { status: newStatus });
      await addActivityLog(orderId, 'STATUS_CHANGE', `Estado cambiado a ${STATUS_CONFIG[newStatus]?.label}`);
      fetchOrders();
      Swal.fire({ title: 'Estado actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ title: 'Error', icon: 'error' });
    }
  }, [updateOrder, addActivityLog, fetchOrders]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    const confirm = await Swal.fire({ title: '¿Cancelar pedido?', text: 'Esta acción no se puede deshacer', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (!confirm.isConfirmed) return;
    try {
      await updateOrder(orderId, { status: 'CANCELLED' });
      await addActivityLog(orderId, 'CANCELLED', 'Pedido cancelado');
      fetchOrders();
    } catch {
      Swal.fire({ title: 'Error', icon: 'error' });
    }
  }, [updateOrder, addActivityLog, fetchOrders]);

  const handleAddNote = useCallback(async (orderId: string) => {
    const { value: text } = await Swal.fire({ title: 'Agregar nota', input: 'textarea', inputPlaceholder: 'Escribí tu nota...', showCancelButton: true, confirmButtonColor: '#2563eb' });
    if (!text) return;
    addNote(orderId, text);
    addActivityLog(orderId, 'NOTE', 'Nota agregada');
  }, [addNote, addActivityLog]);

  const handleAddPayment = useCallback(async (orderId: string) => {
    const { value: formValues } = await Swal.fire({
      title: 'Registrar pago',
      html: `
        <input id="swal-amount" type="number" placeholder="Monto" class="swal2-input" style="width:100%">
        <select id="swal-method" class="swal2-input" style="width:100%">
          <option value="EFECTIVO">Efectivo</option>
          <option value="TRANSFERENCIA">Transferencia</option>
          <option value="TARJETA">Tarjeta</option>
          <option value="OTRO">Otro</option>
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const amount = Number((document.getElementById('swal-amount') as HTMLInputElement)?.value);
        const method = (document.getElementById('swal-method') as HTMLSelectElement)?.value;
        if (!amount || amount <= 0) { Swal.showValidationMessage('Ingresá un monto válido'); return false; }
        return { amount, method };
      },
    });
    if (!formValues) return;
    addPayment(orderId, formValues.amount, formValues.method);
    addActivityLog(orderId, 'PAYMENT', `Pago de ${ARS.format(formValues.amount)} vía ${formValues.method}`);
    Swal.fire({ title: 'Pago registrado', icon: 'success', timer: 1500, showConfirmButton: false });
  }, [addPayment, addActivityLog]);

  const handleDuplicate = useCallback((orderId: string) => {
    duplicateOrder(orderId);
    Swal.fire({ title: 'Pedido duplicado', icon: 'success', timer: 1500, showConfirmButton: false });
  }, [duplicateOrder]);

  const handleSaveTemplate = useCallback((orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    Swal.fire({ title: 'Nombre de plantilla', input: 'text', inputValue: `Plantilla - ${order.customer_name}`, showCancelButton: true, confirmButtonColor: '#2563eb' }).then((result) => {
      if (result.isConfirmed && result.value) {
        saveTemplate(result.value, order);
        Swal.fire({ title: 'Plantilla guardada', icon: 'success', timer: 1500, showConfirmButton: false });
      }
    });
  }, [orders, saveTemplate]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const partial = orders.filter((o) => o.status === 'PARTIAL').length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
    const urgent = orders.filter((o) => o.priority === 'URGENT' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
    const overdue = orders.filter((o) => {
      if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return false;
      return o.due_date && new Date(o.due_date) < new Date();
    }).length;
    const totalRevenue = orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + (o.total_amount || 0), 0);
    const totalAdvance = orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + (o.advance_payment || 0), 0);
    return { total, pending, partial, delivered, cancelled, urgent, overdue, totalRevenue, totalAdvance, totalDebt: totalRevenue - totalAdvance };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    if (filter !== 'ALL') result = result.filter((o) => o.status === filter);
    if (businessFilter !== 'TODOS') result = result.filter((o) => o.business_unit === businessFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter((o) => o.customer_name?.toLowerCase().includes(s) || o.business_unit?.toLowerCase().includes(s));
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime(); break;
        case 'amount': cmp = (a.total_amount || 0) - (b.total_amount || 0); break;
        case 'status': { const o = { PENDING: 0, PARTIAL: 1, DELIVERED: 2, CANCELLED: 3 }; cmp = (o[a.status] ?? 0) - (o[b.status] ?? 0); break; }
        case 'customer': cmp = (a.customer_name || '').localeCompare(b.customer_name || ''); break;
        case 'priority': { const p = { LOW: 0, NORMAL: 1, URGENT: 2 }; cmp = (p[a.priority || 'NORMAL'] ?? 1) - (p[b.priority || 'NORMAL'] ?? 1); break; }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [orders, filter, businessFilter, searchTerm, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }, [sortField]);

  const selectedCount = selectedOrders.size;

  return (
    <div className="space-y-4 lg:space-y-5 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            Hoja de Ruta
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Gestión de Producción y Entregas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToCSV(filteredOrders)} className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand rounded-xl text-[10px] font-black uppercase transition-all active:scale-95">
            Exportar
          </button>
          <button onClick={() => { setEditingOrder(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand/20 transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Package, color: 'brand' },
          { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'amber' },
          { label: 'Completados', value: stats.delivered, icon: CheckCircle, color: 'emerald' },
          { label: 'Urgentes', value: stats.urgent, icon: Zap, color: 'rose' },
          { label: 'Vencidos', value: stats.overdue, icon: AlertTriangle, color: stats.overdue > 0 ? 'rose' : 'slate' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
              <Icon className={cn('w-4 h-4', color === 'brand' ? 'text-brand' : color === 'amber' ? 'text-amber-500' : color === 'emerald' ? 'text-emerald-500' : color === 'rose' ? 'text-rose-500' : 'text-slate-400')} />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {([
            { mode: 'list' as ViewMode, icon: List, label: 'Lista' },
            { mode: 'kanban' as ViewMode, icon: LayoutGrid, label: 'Kanban' },
            { mode: 'calendar' as ViewMode, icon: CalendarDays, label: 'Calendario' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => setViewMode(mode)} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all', viewMode === mode ? 'bg-white dark:bg-slate-800 text-brand shadow-md' : 'text-slate-400 hover:text-slate-600')}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 bg-brand/10 border border-brand/20 px-4 py-2 rounded-xl animate-in fade-in">
            <span className="text-[10px] font-black text-brand">{selectedCount} seleccionados</span>
            <button onClick={() => bulkChangeStatus('DELIVERED')} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase">Completar</button>
            <button onClick={() => bulkChangeStatus('CANCELLED')} className="px-3 py-1 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase">Cancelar</button>
            <button onClick={clearSelection} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar por cliente o unidad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all" />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
            {BUSINESS_UNITS.map((bu) => (
              <button key={bu} onClick={() => setBusinessFilter(bu)} className={cn('px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95', businessFilter === bu ? 'bg-brand text-white shadow-md shadow-brand/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700')}>
                {bu === 'TODOS' ? 'Todos' : bu.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
          {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED', 'CANCELLED'] as StatusFilter[]).map((status) => {
            const config = status === 'ALL' ? null : STATUS_CONFIG[status];
            const Icon = config?.icon || Package;
            const count = status === 'ALL' ? orders.length : orders.filter((o) => o.status === status).length;
            return (
              <button key={status} onClick={() => setFilter(status)} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95', filter === status ? (status === 'ALL' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : cn(config?.bg, config?.text, 'border', config?.border, 'shadow-md')) : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700')}>
                <Icon className="w-3 h-3" />
                {status === 'ALL' ? 'Todos' : config?.label}
                <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-black', filter === status ? 'bg-white/20 dark:bg-black/20' : 'bg-slate-200 dark:bg-slate-700')}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ordenar:</span>
          {([ { field: 'date' as SortField, label: 'Fecha' }, { field: 'amount' as SortField, label: 'Monto' }, { field: 'status' as SortField, label: 'Estado' }, { field: 'customer' as SortField, label: 'Cliente' }, { field: 'priority' as SortField, label: 'Prioridad' } ]).map(({ field, label }) => (
            <button key={field} onClick={() => toggleSort(field)} className={cn('px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all', sortField === field ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-600')}>
              {label}{sortField === field && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <EmptyState />
          ) : (
            filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} onDeliver={handleDeliverVariation} onEdit={(o) => { setEditingOrder(o); setShowForm(true); }} onOpenRemito={(o) => { setActiveOrder(o); setIsRemitoOpen(true); }} onPrintLabel={triggerLabelPrint} onStatusChange={handleStatusChange} onCancel={handleCancelOrder} onAddNote={handleAddNote} onAddPayment={handleAddPayment} onDuplicate={handleDuplicate} onSaveTemplate={handleSaveTemplate} onSetPriority={setPriority} onSetProductionStage={setProductionStage} onSelect={toggleOrderSelection} isSelected={selectedOrders.has(order.id)} onOpenDetail={(o) => { setDetailOrder(o); setDetailTab('info'); }} />
            ))
          )}
        </div>
      )}

      {viewMode === 'kanban' && <KanbanBoard orders={filteredOrders} onStatusChange={handleStatusChange} onOpenDetail={(o) => { setDetailOrder(o); setDetailTab('info'); }} />}

      {viewMode === 'calendar' && <CalendarView orders={filteredOrders} onOpenDetail={(o) => { setDetailOrder(o); setDetailTab('info'); }} />}

      {/* Modals */}
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"><OrderForm orderToEdit={editingOrder} onClose={() => setShowForm(false)} onSuccess={() => { fetchOrders(); setShowForm(false); }} /></div>}
      <RemitoModal isOpen={isRemitoOpen} onClose={() => setIsRemitoOpen(false)} order={activeOrder} />
      <div style={{ height: 0, overflow: 'hidden', position: 'absolute', left: '-9999px' }}><div ref={labelRef}>{orderForLabel && <OrderLabel order={orderForLabel} />}</div></div>

      {/* Order Detail Drawer */}
      {detailOrder && <OrderDetailDrawer order={detailOrder} tab={detailTab} onTabChange={setDetailTab} onClose={() => setDetailOrder(null)} onAddNote={handleAddNote} onAddPayment={handleAddPayment} onStatusChange={handleStatusChange} onSetPriority={setPriority} onSetProductionStage={setProductionStage} />}
    </div>
  );
});

OrdersContent.displayName = 'OrdersContent';

// ========== EMPTY STATE ==========
const EmptyState = memo(() => (
  <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center">
    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto mb-4"><PackageX className="w-10 h-10 text-slate-300 dark:text-slate-600" /></div>
    <p className="font-black text-slate-400 uppercase tracking-wider text-sm mb-1">Sin pedidos</p>
    <p className="text-xs text-slate-400">No hay pedidos que coincidan con los filtros seleccionados.</p>
  </div>
));
EmptyState.displayName = 'EmptyState';

// ========== ORDER CARD ==========
const OrderCard = memo(({ order, onDeliver, onEdit, onOpenRemito, onPrintLabel, onStatusChange, onCancel, onAddNote, onAddPayment, onDuplicate, onSaveTemplate, onSetPriority, onSetProductionStage, onSelect, isSelected, onOpenDetail }: {
  order: Order; onDeliver: any; onEdit: any; onOpenRemito: any; onPrintLabel: any; onStatusChange: any; onCancel: any; onAddNote: any; onAddPayment: any; onDuplicate: any; onSaveTemplate: any; onSetPriority: any; onSetProductionStage: any; onSelect: any; isSelected: boolean; onOpenDetail: any;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const totalAmount = order.total_amount || 0;
  const advancePayment = order.advance_payment || 0;
  const debt = totalAmount - advancePayment;
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const priorityConfig = PRIORITY_CONFIG[order.priority || 'NORMAL'];
  const PriorityIcon = priorityConfig.icon;
  const dueDate = order.due_date ? new Date(order.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && order.status !== 'DELIVERED' && order.status !== 'CANCELLED';
  const currentStage = PRODUCTION_STAGES.find((s) => s.key === order.production_stage);

  const totalItems = useMemo(() => order.items?.reduce((sum, item) => sum + item.variations.reduce((vSum, v) => vSum + v.quantity, 0), 0) || 0, [order.items]);
  const deliveredItems = useMemo(() => order.items?.reduce((sum, item) => sum + item.variations.reduce((vSum, v) => vSum + (v.quantityDelivered || 0), 0), 0) || 0, [order.items]);
  const progress = totalItems > 0 ? Math.round((deliveredItems / totalItems) * 100) : 0;

  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md', isExpanded ? 'border-brand dark:border-brand shadow-lg ring-1 ring-brand/10' : 'border-slate-200 dark:border-slate-700')}>
      <div className="p-4 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <button onClick={(e) => { e.stopPropagation(); onSelect(order.id); }} className="flex-shrink-0">
            {isSelected ? <CheckSquare className="w-4 h-4 text-brand" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
          </button>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[8px] font-black uppercase bg-brand/10 text-brand px-2 py-0.5 rounded-md">{(order.business_unit || 'GENERAL').replace('_', ' ')}</span>
              <span className={cn('flex items-center gap-1 px-2 py-0.5 text-[8px] font-black rounded-md border', statusConfig.bg, statusConfig.text, statusConfig.border)}>
                <StatusIcon className="w-2.5 h-2.5" /> {statusConfig.label}
              </span>
              <span className={cn('flex items-center gap-1 px-2 py-0.5 text-[8px] font-black rounded-md', priorityConfig.bg, priorityConfig.text)}>
                <PriorityIcon className="w-2.5 h-2.5" /> {priorityConfig.label}
              </span>
              {isOverdue && <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-md"><AlertTriangle className="w-2.5 h-2.5" /> VENCIDO</span>}
              {currentStage && <span className={cn('flex items-center gap-1 px-2 py-0.5 text-[8px] font-black rounded-md', currentStage.color)}><currentStage.icon className="w-2.5 h-2.5" /> {currentStage.label}</span>}
              {order.notes && order.notes.length > 0 && <StickyNote className="w-3 h-3 text-amber-500" />}
              {order.photos && order.photos.length > 0 && <Camera className="w-3 h-3 text-indigo-500" />}
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{order.customer_name || 'Sin nombre'}</h3>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(order.due_date)}</span>
              <span>{totalItems} items</span>
              {order.payments && order.payments.length > 0 && <span className="text-emerald-500">{order.payments.length} pagos</span>}
            </div>
          </div>

          {/* Financials & Progress */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Total</p>
              <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(totalAmount)}</p>
              <p className="text-[9px] font-bold text-emerald-500">Seña: {ARS.format(advancePayment)}</p>
              {debt > 0 && <p className="text-[9px] font-bold text-rose-500">Debe: {ARS.format(debt)}</p>}
            </div>
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-700" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${2 * Math.PI * 16}`} strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`} strokeLinecap="round" className={cn(progress >= 100 ? 'text-emerald-500' : progress > 0 ? 'text-brand' : 'text-slate-200')} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-600 dark:text-slate-300">{progress}%</span>
            </div>
            <button className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {totalItems > 0 && (
          <div className="mt-2 ml-7">
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1"><div className={cn('h-1 rounded-full transition-all', progress >= 100 ? 'bg-emerald-500' : 'bg-brand')} style={{ width: `${progress}%` }} /></div>
          </div>
        )}
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-b-2xl space-y-4 animate-in fade-in duration-200">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn icon={Edit3} label="Editar" onClick={(e) => { e.stopPropagation(); onEdit(order); }} />
            <ActionBtn icon={Printer} label="Etiqueta" onClick={(e) => { e.stopPropagation(); onPrintLabel(order); }} color="indigo" />
            <ActionBtn icon={FileText} label="Remito" onClick={(e) => { e.stopPropagation(); onOpenRemito(order); }} primary />
            <ActionBtn icon={Copy} label="Duplicar" onClick={(e) => { e.stopPropagation(); onDuplicate(order.id); }} />
            <ActionBtn icon={Save} label="Plantilla" onClick={(e) => { e.stopPropagation(); onSaveTemplate(order.id); }} />
            <ActionBtn icon={StickyNote} label="Nota" onClick={(e) => { e.stopPropagation(); onAddNote(order.id); }} color="amber" />
            <ActionBtn icon={DollarSign} label="Pago" onClick={(e) => { e.stopPropagation(); onAddPayment(order.id); }} color="emerald" />
            <ActionBtn icon={Eye} label="Detalle" onClick={(e) => { e.stopPropagation(); onOpenDetail(order); }} color="brand" />
            {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && <ActionBtn icon={XCircle} label="Cancelar" onClick={(e) => { e.stopPropagation(); onCancel(order.id); }} color="rose" />}
          </div>

          {/* Priority */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">Prioridad</p>
            <div className="flex gap-1">
              {(['LOW', 'NORMAL', 'URGENT'] as OrderPriority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const Icon = cfg.icon;
                return (
                  <button key={p} onClick={(e) => { e.stopPropagation(); onSetPriority(order.id, p); }} className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all', (order.priority || 'NORMAL') === p ? cn(cfg.bg, cfg.text) : 'bg-slate-100 dark:bg-slate-900 text-slate-400')}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Production Stages */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">Etapa de Producción</p>
            <div className="flex gap-1 overflow-x-auto">
              {PRODUCTION_STAGES.map((stage) => {
                const StageIcon = stage.icon;
                return (
                  <button key={stage.key} onClick={(e) => { e.stopPropagation(); onSetProductionStage(order.id, stage.key); }} className={cn('flex items-center gap-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase whitespace-nowrap transition-all', order.production_stage === stage.key ? stage.color : 'bg-slate-100 dark:bg-slate-900 text-slate-400')}>
                    <StageIcon className="w-3 h-3" /> {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Quick Change */}
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <div className="flex gap-1.5">
              {(['PENDING', 'PARTIAL', 'DELIVERED'] as const).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <button key={s} onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, s); }} className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all', order.status === s ? cn(cfg.bg, cfg.text, 'border', cfg.border) : 'bg-slate-100 dark:bg-slate-900 text-slate-400')}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {order.items?.map((item) => item.variations?.map((v) => {
              const delivered = v.quantityDelivered || 0;
              const pending = v.quantity - delivered;
              const itemProgress = v.quantity > 0 ? Math.round((delivered / v.quantity) * 100) : 0;
              return (
                <div key={v.variationId || `${item.id}-${v.sizeId}-${v.colorId}`} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black text-slate-900 dark:text-white truncate">{item.productId}</p>
                    <span className="text-[9px] font-black">{delivered}/{v.quantity}</span>
                  </div>
                  <div className="flex gap-1 mb-2">
                    <span className="text-[7px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">T{v.sizeId}</span>
                    {v.colorId && <span className="text-[7px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded">{v.colorId}</span>}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1 mb-2"><div className={cn('h-1 rounded-full', itemProgress >= 100 ? 'bg-emerald-500' : 'bg-brand')} style={{ width: `${itemProgress}%` }} /></div>
                  {pending > 0 ? (
                    <button onClick={(e) => { e.stopPropagation(); onDeliver(order.id, item.id || '', v.variationId || '', pending, `${item.productId} T${v.sizeId}`); }} className="w-full py-1.5 bg-brand hover:bg-brand-700 text-white rounded-lg text-[8px] font-black uppercase transition-all active:scale-[0.97]">Entregar</button>
                  ) : (
                    <div className="w-full py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-center rounded-lg text-[8px] font-black uppercase">Completado ✓</div>
                  )}
                </div>
              );
            }))}
          </div>
        </div>
      )}
    </div>
  );
});
OrderCard.displayName = 'OrderCard';

const ActionBtn = ({ icon: Icon, label, onClick, color, primary }: { icon: any; label: string; onClick: any; color?: string; primary?: boolean }) => (
  <button onClick={onClick} className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all active:scale-95', primary ? 'bg-brand text-white hover:bg-brand-700 shadow-md shadow-brand/20' : color === 'indigo' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 hover:bg-indigo-200' : color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-200' : color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200' : color === 'rose' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 hover:bg-rose-200' : color === 'brand' ? 'bg-brand/10 text-brand hover:bg-brand/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600')}>
    <Icon className="w-3 h-3" /> {label}
  </button>
);

// ========== KANBAN BOARD ==========
const KanbanBoard = memo(({ orders, onStatusChange, onOpenDetail }: { orders: Order[]; onStatusChange: any; onOpenDetail: any }) => {
  const columns = ['PENDING', 'PARTIAL', 'DELIVERED', 'CANCELLED'] as const;
  const [draggedOrder, setDraggedOrder] = useState<string | null>(null);

  const handleDragStart = (orderId: string) => setDraggedOrder(orderId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (status: Order['status'], e: React.DragEvent) => {
    e.preventDefault();
    if (draggedOrder) {
      onStatusChange(draggedOrder, status);
      setDraggedOrder(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
      {columns.map((col) => {
        const cfg = STATUS_CONFIG[col];
        const Icon = cfg.icon;
        const colOrders = orders.filter((o) => o.status === col);
        return (
          <div key={col} onDragOver={handleDragOver} onDrop={(e) => handleDrop(col, e)} className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 min-h-[200px]">
            <div className={cn('flex items-center gap-2 mb-3 pb-2 border-b', cfg.border)}>
              <Icon className={cn('w-4 h-4', cfg.text)} />
              <span className={cn('text-[10px] font-black uppercase', cfg.text)}>{cfg.label}</span>
              <span className="ml-auto text-[9px] font-black text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{colOrders.length}</span>
            </div>
            <div className="space-y-2">
              {colOrders.map((order) => (
                <div key={order.id} draggable onDragStart={() => handleDragStart(order.id)} onClick={() => onOpenDetail(order)} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[7px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded">{(order.business_unit || '').replace('_', ' ')}</span>
                    {order.priority === 'URGENT' && <Zap className="w-3 h-3 text-rose-500" />}
                  </div>
                  <p className="text-[11px] font-black text-slate-900 dark:text-white truncate">{order.customer_name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] text-slate-400">{formatDate(order.due_date)}</span>
                    <span className="text-[10px] font-black text-slate-900 dark:text-white">{ARS.format(order.total_amount || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
KanbanBoard.displayName = 'KanbanBoard';

// ========== CALENDAR VIEW ==========
const CalendarView = memo(({ orders, onOpenDetail }: { orders: Order[]; onOpenDetail: any }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const ordersByDate = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders.forEach((o) => {
      if (o.due_date) {
        const d = o.due_date.substring(0, 10);
        if (!map[d]) map[d] = [];
        map[d].push(o);
      }
    });
    return map;
  }, [orders]);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1));
  const monthName = currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><ChevronDown className="w-4 h-4 rotate-90" /></button>
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">{monthName}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><ChevronUp className="w-4 h-4 -rotate-90" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
          <div key={d} className="text-center text-[8px] font-black uppercase text-slate-400 py-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayOrders = ordersByDate[dateStr] || [];
          const isToday = new Date().toISOString().substring(0, 10) === dateStr;
          return (
            <div key={day} className={cn('min-h-[60px] p-1 rounded-xl border transition-all', isToday ? 'border-brand bg-brand/5' : 'border-slate-100 dark:border-slate-700', dayOrders.length > 0 && 'bg-slate-50 dark:bg-slate-900')}>
              <div className={cn('text-[10px] font-black mb-1', isToday ? 'text-brand' : 'text-slate-600 dark:text-slate-300')}>{day}</div>
              {dayOrders.slice(0, 3).map((o) => (
                <div key={o.id} onClick={() => onOpenDetail(o)} className={cn('text-[7px] font-bold px-1 py-0.5 rounded mb-0.5 cursor-pointer truncate', STATUS_CONFIG[o.status]?.bg, STATUS_CONFIG[o.status]?.text)}>
                  {o.customer_name}
                </div>
              ))}
              {dayOrders.length > 3 && <div className="text-[7px] text-slate-400 font-bold">+{dayOrders.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
});
CalendarView.displayName = 'CalendarView';

// ========== ORDER DETAIL DRAWER ==========
const OrderDetailDrawer = memo(({ order, tab, onTabChange, onClose, onAddNote, onAddPayment, onStatusChange, onSetPriority, onSetProductionStage }: {
  order: Order; tab: string; onTabChange: any; onClose: any; onAddNote: any; onAddPayment: any; onStatusChange: any; onSetPriority: any; onSetProductionStage: any;
}) => {
  const totalAmount = order.total_amount || 0;
  const advancePayment = order.advance_payment || 0;
  const debt = totalAmount - advancePayment;
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">{order.customer_name}</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn('px-2 py-0.5 text-[8px] font-black rounded-md border', statusConfig.bg, statusConfig.text, statusConfig.border)}>{statusConfig.label}</span>
            <span className="text-[9px] font-bold text-slate-400">{formatDate(order.due_date)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {(['info', 'activity', 'notes', 'payments', 'photos'] as const).map((t) => (
            <button key={t} onClick={() => onTabChange(t)} className={cn('px-4 py-2.5 text-[9px] font-black uppercase whitespace-nowrap border-b-2 transition-all', tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-400')}>
              {t === 'info' ? 'Info' : t === 'activity' ? 'Actividad' : t === 'notes' ? `Notas (${order.notes?.length || 0})` : t === 'payments' ? `Pagos (${order.payments?.length || 0})` : `Fotos (${order.photos?.length || 0})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard label="Total" value={ARS.format(totalAmount)} />
                <InfoCard label="Seña" value={ARS.format(advancePayment)} color="emerald" />
                <InfoCard label="Debe" value={ARS.format(debt)} color={debt > 0 ? 'rose' : 'emerald'} />
                <InfoCard label="Unidad" value={(order.business_unit || '').replace('_', ' ')} />
              </div>

              {/* Priority */}
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Prioridad</p>
                <div className="flex gap-1">
                  {(['LOW', 'NORMAL', 'URGENT'] as OrderPriority[]).map((p) => {
                    const cfg = PRIORITY_CONFIG[p];
                    const Icon = cfg.icon;
                    return (
                      <button key={p} onClick={() => onSetPriority(order.id, p)} className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all', (order.priority || 'NORMAL') === p ? cn(cfg.bg, cfg.text) : 'bg-slate-100 dark:bg-slate-900 text-slate-400')}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Production Stage */}
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Etapa</p>
                <div className="flex gap-1 overflow-x-auto">
                  {PRODUCTION_STAGES.map((stage) => {
                    const StageIcon = stage.icon;
                    return (
                      <button key={stage.key} onClick={() => onSetProductionStage(order.id, stage.key)} className={cn('flex items-center gap-1 px-2.5 py-2 rounded-xl text-[8px] font-black uppercase whitespace-nowrap transition-all', order.production_stage === stage.key ? stage.color : 'bg-slate-100 dark:bg-slate-900 text-slate-400')}>
                        <StageIcon className="w-3 h-3" /> {stage.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Estado</p>
                  <div className="flex gap-1">
                    {(['PENDING', 'PARTIAL', 'DELIVERED'] as const).map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      const Icon = cfg.icon;
                      return (
                        <button key={s} onClick={() => onStatusChange(order.id, s)} className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all', order.status === s ? cn(cfg.bg, cfg.text, 'border', cfg.border) : 'bg-slate-100 dark:bg-slate-900 text-slate-400')}>
                          <Icon className="w-3 h-3" /> {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Items</p>
                <div className="space-y-2">
                  {order.items?.map((item) => item.variations?.map((v) => {
                    const delivered = v.quantityDelivered || 0;
                    const pending = v.quantity - delivered;
                    const progress = v.quantity > 0 ? Math.round((delivered / v.quantity) * 100) : 0;
                    return (
                      <div key={v.variationId || `${item.id}-${v.sizeId}`} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black">{item.productId}</span>
                          <span className="text-[9px] font-bold">{delivered}/{v.quantity}</span>
                        </div>
                        <div className="flex gap-1 mb-1.5">
                          <span className="text-[7px] font-black bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">T{v.sizeId}</span>
                          {v.colorId && <span className="text-[7px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded">{v.colorId}</span>}
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1"><div className={cn('h-1 rounded-full', progress >= 100 ? 'bg-emerald-500' : 'bg-brand')} style={{ width: `${progress}%` }} /></div>
                      </div>
                    );
                  }))}
                </div>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-2">
              {(!order.activity_log || order.activity_log.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-8">Sin actividad registrada</p>
              ) : (
                [...order.activity_log].reverse().map((entry: ActivityLogEntry) => (
                  <div key={entry.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 dark:text-white">{entry.action}</p>
                      <p className="text-[9px] text-slate-500">{entry.detail}</p>
                      <p className="text-[8px] text-slate-400 mt-0.5">{formatDateTime(entry.timestamp)} · {entry.user}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-2">
              <button onClick={() => onAddNote(order.id)} className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-brand hover:text-brand transition-all">
                + Agregar nota
              </button>
              {(!order.notes || order.notes.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-8">Sin notas</p>
              ) : (
                [...order.notes].reverse().map((note: OrderNote) => (
                  <div key={note.id} className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-[10px] text-slate-700 dark:text-slate-300">{note.text}</p>
                    <p className="text-[8px] text-slate-400 mt-1">{formatDateTime(note.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-3">
              <button onClick={() => onAddPayment(order.id)} className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                + Registrar pago
              </button>
              <div className="grid grid-cols-2 gap-2">
                <InfoCard label="Total" value={ARS.format(totalAmount)} />
                <InfoCard label="Pagado" value={ARS.format(advancePayment)} color="emerald" />
              </div>
              {(!order.payments || order.payments.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-8">Sin pagos registrados</p>
              ) : (
                <div className="space-y-2">
                  {[...order.payments].reverse().map((payment: OrderPayment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{ARS.format(payment.amount)}</p>
                        <p className="text-[8px] text-slate-400">{payment.method} · {formatDateTime(payment.date)}</p>
                        {payment.note && <p className="text-[8px] text-slate-500 mt-0.5">{payment.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'photos' && (
            <div className="space-y-3">
              <button className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-1">
                <Upload className="w-3 h-3" /> Subir foto
              </button>
              {(!order.photos || order.photos.length === 0) ? (
                <p className="text-xs text-slate-400 text-center py-8">Sin fotos</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {order.photos.map((photo) => (
                    <div key={photo.id} className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={photo.url} alt={photo.name} className="w-full h-32 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-[8px] text-white font-bold">{photo.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
OrderDetailDrawer.displayName = 'OrderDetailDrawer';

const InfoCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
    <p className={cn('text-sm font-black tabular-nums mt-0.5', color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : color === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white')}>{value}</p>
  </div>
);

// ========== EXPORT ==========
export const OrdersDashboard = memo(() => (
  <ErrorBoundary>
    <OrdersContent />
  </ErrorBoundary>
));
OrdersDashboard.displayName = 'OrdersDashboard';
