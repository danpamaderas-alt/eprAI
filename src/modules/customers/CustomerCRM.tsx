import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { useCrmStore, type CustomerBalance } from '../crm/store/useCrmStore';
import { useTenantStore } from '../../store/useTenantStore';
import { ClientFormModal } from '../crm/pages/ClientFormModal';
import { Badge, ExportButton, Avatar } from '../../shared/components/ui';
import { Star, Gift, TrendingUp, ArrowDownLeft, ArrowUpRight, Search, Pencil, Trash2, FileText, ShoppingCart, StickyNote, Users, Store, Building2, Sparkles, Plus, Loader2, Send, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

interface Movement {
  id: string;
  date: string | null;
  description: string | null;
  movement_type: string;
  amount: number;
}

interface LoyaltyEntry {
  id: string;
  created_at: string | null;
  points_change: number;
  reason: string;
}

interface OrderHistory {
  id: string;
  created_at: string | null;
  total_amount: number | null;
  status: string | null;
  customer_name: string;
}

const TYPE_FILTERS = [
  { key: 'all', label: 'Todos', icon: Users },
  { key: 'minorista', label: 'Minorista', icon: Store },
  { key: 'mayorista', label: 'Mayorista', icon: TrendingUp },
  { key: 'revendedor', label: 'Revendedor', icon: Building2 },
  { key: 'institucion', label: 'Institución', icon: Building2 },
] as const;

export const CustomerCRM = memo(() => {
  const { balances: customers, fetchBalances, updateCustomer, deleteCustomer, addMovement, awardLoyaltyPoints, redeemLoyaltyPoints } = useCrmStore();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBalance | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyEntry[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', address: '', cuit: '', notes: '', is_supplier: false });
  const [activeTab, setActiveTab] = useState<'movimientos' | 'puntos' | 'pedidos' | 'notas' | 'ia'>('movimientos');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [pointsInput, setPointsInput] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registrar movimiento de cuenta
  const [movementType, setMovementType] = useState<'CARGO' | 'PAGO'>('CARGO');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDesc, setMovementDesc] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  // Análisis IA del cliente
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => { fetchBalances(searchTerm); }, [fetchBalances, searchTerm]);

  const filteredCustomers = useMemo(() => {
    if (typeFilter === 'all') return customers;
    return customers.filter(c => c.type?.toLowerCase() === typeFilter);
  }, [customers, typeFilter]);

  const stats = useMemo(() => ({
    total: customers.length,
    minorista: customers.filter(c => c.type?.toLowerCase() === 'minorista').length,
    mayorista: customers.filter(c => c.type?.toLowerCase() === 'mayorista').length,
    revendedor: customers.filter(c => c.type?.toLowerCase() === 'revendedor').length,
    institucion: customers.filter(c => c.type?.toLowerCase() === 'institucion').length,
  }), [customers]);

  const exportCSV = useCallback(() => {
    const header = 'Nombre,Email,Teléfono,Tipo,Ciudad';
    const rows = filteredCustomers.map(c =>
      [c.name, c.email ?? '', c.phone ?? '', c.type, c.address ?? ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredCustomers]);

  const loadCustomerData = async (customer: CustomerBalance) => {
    setSelectedCustomer(customer);
    setActiveTab('movimientos');
    setNotesValue(customer.notes ?? '');

    const companyId = useTenantStore.getState().activeCompanyId;
    if (!companyId) return;

    const { data } = await supabase
      .from('account_movements')
      .select('id, date, description, movement_type, amount')
      .eq('customer_id', customer.id)
      .eq('company_id', companyId)
      .order('date', { ascending: false });
    setHistory((data as Movement[]) || []);

    const { data: loyaltyData } = await supabase
      .from('loyalty_points_history')
      .select('id, created_at, points_change, reason')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    setLoyaltyHistory((loyaltyData as LoyaltyEntry[]) || []);

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, created_at, total_amount, status, customer_name')
      .eq('customer_id', customer.id)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);
    setOrderHistory((ordersData as OrderHistory[]) || []);
  };

  const handleEdit = (customer: CustomerBalance) => {
    setEditData({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      cuit: customer.cuit ?? '',
      notes: customer.notes ?? '',
      is_supplier: customer.is_supplier ?? false,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    setIsSavingNotes(true);
    try {
      await updateCustomer(selectedCustomer.id, { notes: notesValue || null });
      const updated = useCrmStore.getState().balances.find(c => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
      Swal.fire({ icon: 'success', title: 'Notas guardadas', timer: 1200, showConfirmButton: false, background: '#0f172a', color: '#fff' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'No se pudieron guardar las notas', background: '#0f172a', color: '#fff' });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      await updateCustomer(selectedCustomer.id, {
        name: editData.name.toUpperCase(),
        phone: editData.phone || null,
        email: editData.email || null,
        address: editData.address || null,
        cuit: editData.cuit || null,
        notes: editData.notes || null,
        is_supplier: editData.is_supplier,
      });
      const updated = useCrmStore.getState().balances.find(c => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
      setIsEditModalOpen(false);
      Swal.fire({ icon: 'success', title: 'Cliente actualizado', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#fff' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'No se pudo actualizar', background: '#0f172a', color: '#fff' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer: CustomerBalance) => {
    const result = await Swal.fire({
      title: `¿Eliminar "${customer.name}"?`,
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#0f172a',
      color: '#fff',
    });
    if (!result.isConfirmed) return;

    try {
      await deleteCustomer(customer.id);
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
      Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#fff' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'No se pudo eliminar', background: '#0f172a', color: '#fff' });
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedCustomer || !pointsInput || !pointsReason) return;
    setIsSubmitting(true);
    try {
      await awardLoyaltyPoints(selectedCustomer.id, parseInt(pointsInput), pointsReason);
      const updated = useCrmStore.getState().balances.find(c => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
      const { data: loyaltyData } = await (supabase.from('loyalty_points_history') as any)
        .select('id, created_at, points_change, reason')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false });
      setLoyaltyHistory((loyaltyData as LoyaltyEntry[]) || []);
      setPointsInput('');
      setPointsReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedeemPoints = async () => {
    if (!selectedCustomer || !pointsInput || !pointsReason) return;
    setIsSubmitting(true);
    try {
      await redeemLoyaltyPoints(selectedCustomer.id, parseInt(pointsInput), pointsReason);
      const updated = useCrmStore.getState().balances.find(c => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
      const { data: loyaltyData } = await (supabase.from('loyalty_points_history') as any)
        .select('id, created_at, points_change, reason')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false });
      setLoyaltyHistory((loyaltyData as LoyaltyEntry[]) || []);
      setPointsInput('');
      setPointsReason('');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'Error al canjear puntos', background: '#0f172a', color: '#fff' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pointsToDiscount = (points: number) => `$${points.toLocaleString('es-AR')}`;

  const handleAddMovement = async () => {
    if (!selectedCustomer || !movementAmount) return;
    const amount = parseFloat(movementAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Swal.fire({ icon: 'warning', title: 'Monto inválido', text: 'Ingresá un importe mayor a 0', background: '#0f172a', color: '#fff' });
      return;
    }
    setIsSavingMovement(true);
    try {
      await addMovement({
        customer_id: selectedCustomer.id,
        movement_type: movementType,
        amount,
        description: movementDesc.trim() || (movementType === 'PAGO' ? 'Pago de cliente' : 'Cargo a cliente'),
        date: movementDate,
      });
      setMovementAmount('');
      setMovementDesc('');
      setMovementDate(new Date().toISOString().slice(0, 10));
      await loadCustomerData(selectedCustomer);
      Swal.fire({ icon: 'success', title: 'Movimiento registrado', timer: 1200, showConfirmButton: false, background: '#0f172a', color: '#fff' });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err instanceof Error ? err.message : 'No se pudo registrar', background: '#0f172a', color: '#fff' });
    } finally {
      setIsSavingMovement(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCustomer) return;
    setIsAnalyzing(true);
    setAiError('');
    setAiAnalysis('');
    try {
      const session = await supabase.auth.getSession();
      const recentMoves = history.slice(0, 8).map(h => `- ${h.date ? new Date(h.date).toLocaleDateString('es-AR') : '?'} ${h.movement_type} $${h.amount} ${h.description ?? ''}`).join('\n');
      const recentOrders = orderHistory.slice(0, 8).map(o => `- ${o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '?'} $${o.total_amount ?? 0} (${o.status ?? 'pendiente'})`).join('\n');
      const prompt = `
Eres el asesor comercial de "Raíces", un emprendimiento de indumentaria y sublimación.
Analizá este cliente y dame 3 recomendaciones accionables y concretas para aumentar la venta o retenerlo.
Datos del cliente:
- Nombre: ${selectedCustomer.name}
- Tipo: ${selectedCustomer.type}
- Saldo de cuenta: $${selectedCustomer.balance ?? 0} (positivo = nos debe)
- Puntos de fidelización: ${selectedCustomer.loyalty_points ?? 0}
Últimos movimientos:
${recentMoves || 'Sin movimientos'}
Últimos pedidos:
${recentOrders || 'Sin pedidos'}
Reglas:
- Tono comercial, en español argentino, directo al grano.
- Máximo 6 líneas. Usá viñetas.
`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session.data.session?.access_token && { Authorization: `Bearer ${session.data.session.access_token}` }),
        },
        signal: controller.signal,
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Error del servicio de IA (código ${response.status}).`);
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiText) throw new Error('La respuesta de la IA estaba vacía.');
      setAiAnalysis(aiText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo generar el análisis.';
      setAiError(msg + ' (Si es por límite de la capa gratuita de Gemini, activá billing para usar esta función.)');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-120px)] gap-4 md:gap-6 p-4">
      {/* Lista de Clientes */}
      <div className="w-full md:w-1/3 min-h-[300px] md:min-h-0 bg-white dark:bg-slate-800 rounded-4xl border dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b dark:border-slate-700 space-y-3">
          <div className="flex justify-between items-center gap-3">
            <h2 className="font-black uppercase tracking-tighter italic dark:text-white whitespace-nowrap">Clientes</h2>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="w-8 h-8 shrink-0 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 transition-colors"
            >
              +
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar nombre, teléfono, CUIT o email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white border-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>
          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">
            <span>{stats.total} total</span>
            <span className="text-purple-400">{stats.mayorista} may.</span>
            <span className="text-blue-400">{stats.minorista} min.</span>
            <span className="text-emerald-400">{stats.revendedor} rev.</span>
          </div>
          {/* Type Filter Tabs */}
          <div className="flex gap-1 flex-wrap">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${
                  typeFilter === f.key
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ExportButton onExportCSV={exportCSV} label="Exportar CSV" />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredCustomers.map(c => (
            <div
              key={c.id}
              onClick={() => loadCustomerData(c)}
              className={`w-full text-left p-3.5 rounded-2xl transition-colors cursor-pointer group ${
                selectedCustomer?.id === c.id
                  ? 'bg-slate-900 text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-xs uppercase truncate">{c.name}</p>
                    {c.phone && <p className="text-[9px] opacity-40 truncate">{c.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(c.loyalty_points ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-400 whitespace-nowrap">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {c.loyalty_points}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleEdit(c); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity"
                    title="Editar"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(c); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-200 dark:hover:bg-red-900/50 text-red-400 transition-opacity"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-0.5 ml-10">
                <p className="text-[10px] opacity-60">Saldo: ${(c.balance ?? 0).toLocaleString('es-AR')}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant={c.type === 'mayorista' ? 'info' : c.type === 'revendedor' ? 'warning' : 'default'} size="sm">{c.type}</Badge>
                  {c.is_supplier && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-500/15 text-orange-500 border border-orange-500/30">
                      Proveedor
                    </span>
                  )}
                </div>
              </div>
              {c.email && (
                <p className="text-[9px] opacity-40 truncate mt-0.5 ml-10">{c.email}</p>
              )}
            </div>
          ))}
          {filteredCustomers.length === 0 && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-10 italic">Sin resultados</p>
          )}
        </div>
      </div>

      {/* Panel de Detalle */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-4xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {selectedCustomer ? (
          <>
            {/* Header del cliente */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">{selectedCustomer.name}</h3>
                    <button
                      onClick={() => handleEdit(selectedCustomer)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      title="Editar cliente"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedCustomer)}
                      className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs uppercase font-bold mt-0.5">{selectedCustomer.type} — {selectedCustomer.phone ?? 'Sin teléfono'}</p>
                  {selectedCustomer.is_supplier && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-orange-500/15 text-orange-500 border border-orange-500/30">
                      Proveedor
                    </span>
                  )}
                  {selectedCustomer.email && (
                    <p className="text-slate-400 text-[10px] uppercase font-bold mt-0.5">{selectedCustomer.email}</p>
                  )}
                  {selectedCustomer.address && (
                    <p className="text-slate-400 text-[10px] uppercase font-bold mt-0.5">{selectedCustomer.address}</p>
                  )}
                </div>
                <div className="flex gap-4">
                  {/* Card Saldo */}
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-black">Saldo cuenta</p>
                    <p className={`text-lg font-black ${(selectedCustomer.balance ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${(selectedCustomer.balance ?? 0).toLocaleString('es-AR')}
                    </p>
                  </div>
                  {/* Card Puntos */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 text-right">
                    <p className="text-[10px] text-amber-400/70 uppercase font-black flex items-center justify-end gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Puntos
                    </p>
                    <p className="text-lg font-black text-amber-400">
                      {(selectedCustomer.loyalty_points ?? 0).toLocaleString('es-AR')}
                    </p>
                    <p className="text-[9px] text-amber-400/50">$ {pointsToDiscount(selectedCustomer.loyalty_points ?? 0)} de desc.</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => setActiveTab('movimientos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-colors ${activeTab === 'movimientos' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Movimientos
                </button>
                <button
                  onClick={() => setActiveTab('pedidos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-colors flex items-center gap-1 ${activeTab === 'pedidos' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600'}`}
                >
                  <ShoppingCart className="w-3 h-3" /> Pedidos
                </button>
                <button
                  onClick={() => setActiveTab('puntos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-colors flex items-center gap-1 ${activeTab === 'puntos' ? 'bg-amber-400 text-slate-900' : 'text-slate-500 hover:text-amber-400'}`}
                >
                  <Star className="w-3 h-3" /> Fidelización
                </button>
                <button
                  onClick={() => setActiveTab('notas')}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-colors flex items-center gap-1 ${activeTab === 'notas' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-emerald-500'}`}
                >
                  <StickyNote className="w-3 h-3" /> Notas
                </button>
                <button
                  onClick={() => { setActiveTab('ia'); if (!aiAnalysis && !isAnalyzing) handleAnalyze(); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-colors flex items-center gap-1 ${activeTab === 'ia' ? 'bg-fuchsia-500 text-white' : 'text-slate-500 hover:text-fuchsia-400'}`}
                >
                  <Sparkles className="w-3 h-3" /> IA
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'movimientos' && (
                <div className="space-y-4">
                  {/* Registrar movimiento */}
                  <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-5 text-white border border-blue-500/20 space-y-3">
                    <h4 className="font-black uppercase text-xs flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Registrar Movimiento de Cuenta
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <select
                        value={movementType}
                        onChange={e => setMovementType(e.target.value as 'CARGO' | 'PAGO')}
                        className="bg-white/10 rounded-xl px-2 py-2 text-xs font-bold focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <option value="CARGO" className="text-slate-900">Cargo (debe)</option>
                        <option value="PAGO" className="text-slate-900">Pago (abona)</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={movementAmount}
                        onChange={e => setMovementAmount(e.target.value)}
                        placeholder="Monto"
                        className="bg-white/10 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400"
                      />
                      <input
                        type="date"
                        value={movementDate}
                        onChange={e => setMovementDate(e.target.value)}
                        className="bg-white/10 rounded-xl px-2 py-2 text-xs focus-visible:ring-2 focus-visible:ring-blue-500"
                      />
                      <button
                        onClick={handleAddMovement}
                        disabled={isSavingMovement || !movementAmount}
                        className="flex items-center justify-center gap-1 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-black text-xs uppercase py-2 rounded-xl transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> {isSavingMovement ? '...' : 'Registrar'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={movementDesc}
                      onChange={e => setMovementDesc(e.target.value)}
                      placeholder="Concepto (opcional): ej. Seña, adelanto, ajuste..."
                      className="w-full bg-white/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  {history.length === 0 && (
                    <p className="text-slate-600 text-center text-xs uppercase font-black italic mt-10">Sin movimientos registrados</p>
                  )}
                  {history.map(h => (
                    <div key={h.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${h.movement_type === 'PAGO' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          {h.movement_type === 'PAGO'
                            ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                            : <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          }
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-black">
                            {h.date ? new Date(h.date).toLocaleDateString('es-AR') : '-'}
                          </p>
                          <p className="text-slate-900 dark:text-white font-bold text-sm">{h.description}</p>
                        </div>
                      </div>
                      <p className={`font-black text-base ${h.movement_type === 'PAGO' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {h.movement_type === 'PAGO' ? '+' : '-'}${h.amount.toLocaleString('es-AR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'pedidos' && (
                <div className="space-y-2">
                  {orderHistory.length === 0 && (
                    <p className="text-slate-600 text-center text-xs uppercase font-black italic mt-10">Sin pedidos registrados</p>
                  )}
                  {orderHistory.map(o => (
                    <div key={o.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-500/10">
                          <ShoppingCart className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-black">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString('es-AR') : '-'}
                          </p>
                          <p className="text-slate-900 dark:text-white font-bold text-sm">{o.customer_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-base text-blue-400">${(o.total_amount ?? 0).toLocaleString('es-AR')}</p>
                        <Badge variant={o.status === 'entregado' ? 'success' : o.status === 'cancelado' ? 'danger' : 'warning'} size="sm">{o.status ?? 'pendiente'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'puntos' && (
                <div className="space-y-5">
                  {/* Panel de gestión de puntos */}
                  <div className="bg-amber-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-amber-200 dark:border-amber-500/10 space-y-4">
                    <h4 className="text-amber-400 font-black uppercase text-sm flex items-center gap-2">
                      <Gift className="w-4 h-4" /> Gestionar Puntos
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-black block mb-1">Cantidad de puntos</label>
                        <input
                          type="number"
                          min="1"
                          value={pointsInput}
                          onChange={e => setPointsInput(e.target.value)}
                          placeholder="Ej: 50"
                          className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-black block mb-1">Motivo</label>
                        <input
                          type="text"
                          value={pointsReason}
                          onChange={e => setPointsReason(e.target.value)}
                          placeholder="Ej: Compra en tienda"
                          className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAwardPoints}
                        disabled={isSubmitting || !pointsInput || !pointsReason}
                        className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-black text-xs uppercase py-2.5 rounded-xl transition-colors"
                      >
                        <TrendingUp className="w-4 h-4" /> Otorgar Puntos
                      </button>
                      <button
                        onClick={handleRedeemPoints}
                        disabled={isSubmitting || !pointsInput || !pointsReason || parseInt(pointsInput || '0') > (selectedCustomer.loyalty_points ?? 0)}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-white font-black text-xs uppercase py-2.5 rounded-xl transition-colors"
                      >
                        <Gift className="w-4 h-4" /> Canjear Puntos
                      </button>
                    </div>
                    {pointsInput && (
                      <p className="text-[10px] text-amber-400/60 text-center">
                        {parseInt(pointsInput) || 0} puntos = {pointsToDiscount(parseInt(pointsInput) || 0)} de descuento
                      </p>
                    )}
                  </div>

                  {/* Historial de puntos */}
                  <div>
                    <h4 className="text-slate-400 font-black uppercase text-xs mb-3">Historial de Puntos</h4>
                    {loyaltyHistory.length === 0 && (
                      <p className="text-slate-600 text-center text-xs uppercase font-black italic mt-4">Sin historial de puntos</p>
                    )}
                    <div className="space-y-2">
                      {loyaltyHistory.map(entry => (
                        <div key={entry.id} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/40 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-black">
                              {entry.created_at ? new Date(entry.created_at).toLocaleDateString('es-AR') : '-'}
                            </p>
                            <p className="text-slate-300 text-xs font-bold">{entry.reason}</p>
                          </div>
                          <span className={`font-black text-sm ${entry.points_change > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {entry.points_change > 0 ? '+' : ''}{entry.points_change} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notas' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-500/10 space-y-3">
                    <h4 className="text-emerald-500 font-black uppercase text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Notas del Cliente
                    </h4>
                    <textarea
                      value={notesValue}
                      onChange={e => setNotesValue(e.target.value)}
                      placeholder="Agregar notas sobre este cliente..."
                      rows={8}
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-400 border border-slate-200 dark:border-slate-700 resize-none"
                    />
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black text-xs uppercase py-2.5 px-6 rounded-xl transition-colors"
                    >
                      {isSavingNotes ? 'Guardando...' : 'Guardar Notas'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'ia' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-fuchsia-600 to-purple-700 rounded-2xl p-5 text-white border border-fuchsia-400/20 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-black uppercase text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Análisis Inteligente del Cliente
                      </h4>
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-xl transition-colors"
                      >
                        {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {isAnalyzing ? 'Analizando...' : 'Generar'}
                      </button>
                    </div>
                    {isAnalyzing && (
                      <p className="text-xs opacity-80 italic">Consultando al asesor comercial IA...</p>
                    )}
                    {aiError && (
                      <div className="bg-white/10 rounded-xl p-3 flex items-start gap-2 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{aiError}</span>
                      </div>
                    )}
                    {aiAnalysis && !isAnalyzing && (
                      <div className="bg-white/10 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
                        {aiAnalysis}
                      </div>
                    )}
                    {!aiAnalysis && !isAnalyzing && !aiError && (
                      <p className="text-xs opacity-80 italic">
                        Generá recomendaciones accionables basadas en el historial de movimientos y pedidos de {selectedCustomer?.name}.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-600 font-black uppercase text-center tracking-widest italic text-sm">
              Seleccione un cliente para ver su perfil
            </p>
          </div>
        )}
      </div>

      <ClientFormModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-8">
              <h2 className="text-2xl font-black uppercase italic mb-6 dark:text-white">Editar Cliente</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre</label>
                  <input
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Teléfono</label>
                    <input
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500"
                      value={editData.phone}
                      onChange={e => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CUIT/DNI</label>
                    <input
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500"
                      value={editData.cuit}
                      onChange={e => setEditData({ ...editData, cuit: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={editData.email}
                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dirección</label>
                  <input
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={editData.address}
                    onChange={e => setEditData({ ...editData, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notas</label>
                  <textarea
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white resize-none"
                    rows={3}
                    value={editData.notes}
                    onChange={e => setEditData({ ...editData, notes: e.target.value })}
                    placeholder="Notas sobre el cliente..."
                  />
                </div>
                <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.is_supplier}
                    onChange={e => setEditData({ ...editData, is_supplier: e.target.checked })}
                    className="w-5 h-5 rounded accent-blue-600"
                  />
                  <span className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    Es proveedor
                  </span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting || !editData.name.trim()}
                    className="flex-1 bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-colors transition-transform disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CustomerCRM.displayName = 'CustomerCRM';
