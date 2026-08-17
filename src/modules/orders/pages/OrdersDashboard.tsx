import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useOrderStore, type Order } from '../store/useOrderStore';
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
  DollarSign, Users, PackageX, MoreVertical, Edit3,
} from 'lucide-react';

type StatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'DELIVERED' | 'CANCELLED';
type SortField = 'date' | 'amount' | 'status' | 'customer';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  PENDING: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
    label: 'Pendiente',
  },
  PARTIAL: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Package,
    label: 'Parcial',
  },
  DELIVERED: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle,
    label: 'Completado',
  },
  CANCELLED: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    icon: XCircle,
    label: 'Cancelado',
  },
};

const BUSINESS_UNITS = ['TODOS', 'GENERAL', 'RAICES', 'RJ_CO', 'BITA_IT', 'ROJO_SHOWROOM', 'UNIFORMES'] as const;

const OrdersContent = memo(() => {
  const { orders = [], fetchOrders, registerPartialDelivery } = useOrderStore();
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

  useEffect(() => {
    fetchOrders();
    fetchBalances();
  }, [fetchOrders, fetchBalances]);

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
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'swal2-popup-custom' },
    });

    if (!qty) return;

    try {
      await registerPartialDelivery(orderId, {
        date: new Date().toISOString(),
        itemsDelivered: [{ itemId, variationId, quantity: Number(qty) }],
      });
      fetchOrders();
      Swal.fire({ title: 'Entrega Registrada', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ title: 'Error', text: 'No se pudo registrar la entrega', icon: 'error' });
    }
  }, [registerPartialDelivery, fetchOrders]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: Order['status']) => {
    const confirm = await Swal.fire({
      title: 'Cambiar estado',
      text: `¿Estás seguro de cambiar el estado a ${STATUS_CONFIG[newStatus]?.label || newStatus}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: 'Sí, cambiar',
    });

    if (!confirm.isConfirmed) return;

    try {
      const { supabase } = await import('../../../lib/supabase');
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
      Swal.fire({ title: 'Estado actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ title: 'Error', text: 'No se pudo cambiar el estado', icon: 'error' });
    }
  }, [fetchOrders]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    const confirm = await Swal.fire({
      title: '¿Cancelar pedido?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, volver',
    });

    if (!confirm.isConfirmed) return;

    try {
      const { supabase } = await import('../../../lib/supabase');
      const { error } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED' })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
      Swal.fire({ title: 'Pedido cancelado', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ title: 'Error', text: 'No se pudo cancelar el pedido', icon: 'error' });
    }
  }, [fetchOrders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'PENDING').length;
    const partial = orders.filter((o) => o.status === 'PARTIAL').length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
    const totalRevenue = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalAdvance = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.advance_payment || 0), 0);
    const totalDebt = totalRevenue - totalAdvance;
    return { total, pending, partial, delivered, cancelled, totalRevenue, totalAdvance, totalDebt };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (filter !== 'ALL') {
      result = result.filter((o) => o.status === filter);
    }

    if (businessFilter !== 'TODOS') {
      result = result.filter((o) => o.business_unit === businessFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((o) =>
        o.customer_name?.toLowerCase().includes(search) ||
        o.business_unit?.toLowerCase().includes(search)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
          break;
        case 'amount':
          cmp = (a.total_amount || 0) - (b.total_amount || 0);
          break;
        case 'status': {
          const order = { PENDING: 0, PARTIAL: 1, DELIVERED: 2, CANCELLED: 3 };
          cmp = (order[a.status] ?? 0) - (order[b.status] ?? 0);
          break;
        }
        case 'customer':
          cmp = (a.customer_name || '').localeCompare(b.customer_name || '');
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [orders, filter, businessFilter, searchTerm, sortField, sortDir]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-500">

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
        <button
          onClick={() => { setEditingOrder(null); setShowForm(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Pedido
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Pedidos', value: stats.total, icon: Package, color: 'brand' },
          { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'amber' },
          { label: 'Completados', value: stats.delivered, icon: CheckCircle, color: 'emerald' },
          { label: 'Deuda Total', value: ARS.format(stats.totalDebt), icon: DollarSign, color: stats.totalDebt > 0 ? 'rose' : 'emerald' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center',
                color === 'brand' ? 'bg-brand/10 text-brand' :
                color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' :
                color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' :
                'bg-rose-100 dark:bg-rose-900/20 text-rose-600',
              )}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o unidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          {/* Business Unit Filter */}
          <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
            {BUSINESS_UNITS.map((bu) => (
              <button
                key={bu}
                onClick={() => setBusinessFilter(bu)}
                className={cn(
                  'px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95',
                  businessFilter === bu
                    ? 'bg-brand text-white shadow-md shadow-brand/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                {bu === 'TODOS' ? 'Todos' : bu.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
          {(['ALL', 'PENDING', 'PARTIAL', 'DELIVERED', 'CANCELLED'] as StatusFilter[]).map((status) => {
            const config = status === 'ALL' ? null : STATUS_CONFIG[status];
            const Icon = config?.icon || Package;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95',
                  filter === status
                    ? status === 'ALL'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                      : cn(config?.bg, config?.text, 'border', config?.border, 'shadow-md')
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                <Icon className="w-3 h-3" />
                {status === 'ALL' ? 'Todos' : config?.label}
                {status !== 'ALL' && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[8px] font-black',
                    filter === status ? 'bg-white/20 dark:bg-black/20' : 'bg-slate-200 dark:bg-slate-700',
                  )}>
                    {orders.filter((o) => o.status === status).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ordenar:</span>
          {([
            { field: 'date' as SortField, label: 'Fecha' },
            { field: 'amount' as SortField, label: 'Monto' },
            { field: 'status' as SortField, label: 'Estado' },
            { field: 'customer' as SortField, label: 'Cliente' },
          ]).map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all',
                sortField === field
                  ? 'bg-brand/10 text-brand border border-brand/20'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-600',
              )}
            >
              {label}
              {sortField === field && (
                <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto mb-4">
              <PackageX className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="font-black text-slate-400 uppercase tracking-wider text-sm mb-1">Sin pedidos</p>
            <p className="text-xs text-slate-400">No hay pedidos que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onDeliver={handleDeliverVariation}
              onEdit={(o) => { setEditingOrder(o); setShowForm(true); }}
              onOpenRemito={(o) => { setActiveOrder(o); setIsRemitoOpen(true); }}
              onPrintLabel={triggerLabelPrint}
              onStatusChange={handleStatusChange}
              onCancel={handleCancelOrder}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <OrderForm
            orderToEdit={editingOrder}
            onClose={() => setShowForm(false)}
            onSuccess={() => { fetchOrders(); setShowForm(false); }}
          />
        </div>
      )}

      <RemitoModal
        isOpen={isRemitoOpen}
        onClose={() => setIsRemitoOpen(false)}
        order={activeOrder}
      />

      <div style={{ height: 0, overflow: 'hidden', position: 'absolute', left: '-9999px' }}>
        <div ref={labelRef}>
          {orderForLabel && <OrderLabel order={orderForLabel} />}
        </div>
      </div>
    </div>
  );
});

OrdersContent.displayName = 'OrdersContent';

const OrderCard = memo(({
  order,
  onDeliver,
  onEdit,
  onOpenRemito,
  onPrintLabel,
  onStatusChange,
  onCancel,
}: {
  order: Order;
  onDeliver: (orderId: string, itemId: string, variationId: string, pendingQty: number, desc: string) => void;
  onEdit: (order: Order) => void;
  onOpenRemito: (order: Order) => void;
  onPrintLabel: (order: Order) => void;
  onStatusChange: (orderId: string, status: Order['status']) => void;
  onCancel: (orderId: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const totalAmount = order.total_amount || 0;
  const advancePayment = order.advance_payment || 0;
  const debt = totalAmount - advancePayment;
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const dueDate = order.due_date ? new Date(order.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && order.status !== 'DELIVERED' && order.status !== 'CANCELLED';

  const totalItems = useMemo(() => {
    return order.items?.reduce((sum, item) => {
      return sum + item.variations.reduce((vSum, v) => vSum + v.quantity, 0);
    }, 0) || 0;
  }, [order.items]);

  const deliveredItems = useMemo(() => {
    return order.items?.reduce((sum, item) => {
      return sum + item.variations.reduce((vSum, v) => vSum + (v.quantityDelivered || 0), 0);
    }, 0) || 0;
  }, [order.items]);

  const progress = totalItems > 0 ? Math.round((deliveredItems / totalItems) * 100) : 0;

  return (
    <div className={cn(
      'bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md',
      isExpanded
        ? 'border-brand dark:border-brand shadow-lg ring-2 ring-brand/10'
        : 'border-slate-200 dark:border-slate-700',
    )}>
      {/* Main Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 lg:p-5 cursor-pointer select-none"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Customer & Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[8px] font-black uppercase bg-brand/10 text-brand px-2 py-0.5 rounded-md">
                {(order.business_unit || 'GENERAL').replace('_', ' ')}
              </span>
              <span className={cn(
                'flex items-center gap-1 px-2 py-0.5 text-[8px] font-black rounded-md border',
                statusConfig.bg, statusConfig.text, statusConfig.border,
              )}>
                <StatusIcon className="w-2.5 h-2.5" />
                {statusConfig.label}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-md border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  VENCIDO
                </span>
              )}
            </div>
            <h3 className="text-base lg:text-lg font-black text-slate-900 dark:text-white truncate">
              {order.customer_name || 'Sin nombre'}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {dueDate ? dueDate.toLocaleDateString('es-AR') : 'Sin fecha'}
              </span>
              <span>{totalItems} items</span>
            </div>
          </div>

          {/* Right: Financials */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Total</p>
              <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{ARS.format(totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-emerald-500 uppercase">Seña</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{ARS.format(advancePayment)}</p>
            </div>
            {debt > 0 && (
              <div className="text-right">
                <p className="text-[9px] font-bold text-rose-500 uppercase">Debe</p>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">{ARS.format(debt)}</p>
              </div>
            )}

            {/* Progress Ring */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-700" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke="currentColor" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className={cn(
                    progress >= 100 ? 'text-emerald-500' : progress > 0 ? 'text-brand' : 'text-slate-200 dark:text-slate-700',
                  )}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-600 dark:text-slate-300">
                {progress}%
              </span>
            </div>

            <button className="text-slate-400 dark:text-slate-500 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {totalItems > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-1">
              <span>Progreso de entrega</span>
              <span>{deliveredItems} / {totalItems} unidades</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  progress >= 100 ? 'bg-emerald-500' : 'bg-brand',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 lg:p-6 rounded-b-3xl space-y-4 animate-in fade-in duration-200">

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(order); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand rounded-xl text-[9px] font-black uppercase transition-all active:scale-95"
            >
              <Edit3 className="w-3 h-3" />
              Editar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPrintLabel(order); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95"
            >
              <Printer className="w-3 h-3" />
              Etiqueta
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenRemito(order); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand text-white hover:bg-brand-700 rounded-xl text-[9px] font-black uppercase shadow-md shadow-brand/20 transition-all active:scale-95"
            >
              <FileText className="w-3 h-3" />
              Remito
            </button>
            {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-500 hover:text-rose-600 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95"
              >
                <XCircle className="w-3 h-3" />
                Cancelar
              </button>
            )}
          </div>

          {/* Status Quick Change */}
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Cambiar estado</p>
              <div className="flex gap-1.5">
                {(['PENDING', 'PARTIAL', 'DELIVERED'] as const).map((status) => {
                  const config = STATUS_CONFIG[status];
                  const Icon = config.icon;
                  return (
                    <button
                      key={status}
                      onClick={(e) => { e.stopPropagation(); onStatusChange(order.id, status); }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95',
                        order.status === status
                          ? cn(config.bg, config.text, 'border', config.border)
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {order.items?.map((item) => item.variations?.map((v) => {
              const delivered = v.quantityDelivered || 0;
              const pending = v.quantity - delivered;
              const itemProgress = v.quantity > 0 ? Math.round((delivered / v.quantity) * 100) : 0;

              return (
                <div key={v.variationId || `${item.id}-${v.sizeId}-${v.colorId}`} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{item.productId}</p>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[8px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase">T{v.sizeId}</span>
                        {v.colorId && (
                          <span className="text-[8px] font-black bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">{v.colorId}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-900 dark:text-white">{delivered}/{v.quantity}</span>
                      <span className={cn(
                        'block text-[8px] font-bold',
                        itemProgress >= 100 ? 'text-emerald-500' : 'text-slate-400',
                      )}>
                        {itemProgress}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-3">
                    <div
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-500',
                        itemProgress >= 100 ? 'bg-emerald-500' : 'bg-brand',
                      )}
                      style={{ width: `${itemProgress}%` }}
                    />
                  </div>

                  {pending > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeliver(order.id, item.id || '', v.variationId || '', pending, `${item.productId} T${v.sizeId}`);
                      }}
                      className="w-full py-2 bg-slate-900 dark:bg-slate-700 hover:bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.97]"
                    >
                      Registrar Entrega
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-center rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Completado
                    </div>
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

export const OrdersDashboard = memo(() => (
  <ErrorBoundary>
    <OrdersContent />
  </ErrorBoundary>
));

OrdersDashboard.displayName = 'OrdersDashboard';
