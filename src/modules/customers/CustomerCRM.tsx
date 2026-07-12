import { useState, useEffect, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { useCrmStore, type CustomerBalance } from '../crm/store/useCrmStore';
import { useTenantStore } from '../../store/useTenantStore';
import { ClientFormModal } from '../crm/pages/ClientFormModal';
import { Star, Gift, TrendingUp, ArrowDownLeft, ArrowUpRight, Search, Pencil, Trash2 } from 'lucide-react';
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

export const CustomerCRM = memo(() => {
  const { balances: customers, fetchBalances, updateCustomer, deleteCustomer, awardLoyaltyPoints, redeemLoyaltyPoints } = useCrmStore();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerBalance | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyEntry[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', address: '', cuit: '' });
  const [activeTab, setActiveTab] = useState<'movimientos' | 'puntos'>('movimientos');
  const [searchTerm, setSearchTerm] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchBalances(searchTerm); }, [fetchBalances, searchTerm]);

  const loadCustomerData = async (customer: CustomerBalance) => {
    setSelectedCustomer(customer);
    setActiveTab('movimientos');

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
  };

  const handleEdit = (customer: CustomerBalance) => {
    setEditData({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      cuit: customer.cuit ?? '',
    });
    setIsEditModalOpen(true);
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

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 p-4">
      {/* Lista de Clientes */}
      <div className="w-1/3 bg-white dark:bg-slate-800 rounded-4xl border dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
        <div className="p-5 border-b dark:border-slate-700 flex justify-between items-center gap-3">
          <h2 className="font-black uppercase tracking-tighter italic dark:text-white whitespace-nowrap">Clientes</h2>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-700 dark:text-white border-none outline-none"
            />
          </div>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="w-8 h-8 shrink-0 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 transition-colors"
          >
            +
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {customers.map(c => (
            <div
              key={c.id}
              onClick={() => loadCustomerData(c)}
              className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer group ${
                selectedCustomer?.id === c.id
                  ? 'bg-slate-900 text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="font-black text-xs uppercase truncate flex-1">{c.name}</p>
                <div className="flex items-center gap-1.5">
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
              <div className="flex gap-3 mt-0.5">
                <p className="text-[10px] opacity-60">Saldo: ${(c.balance ?? 0).toLocaleString('es-AR')}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                  c.type === 'mayorista' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                }`}>{c.type}</span>
              </div>
              {c.email && (
                <p className="text-[9px] opacity-40 truncate mt-0.5">{c.email}</p>
              )}
            </div>
          ))}
          {customers.length === 0 && (
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
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveTab('movimientos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-all ${activeTab === 'movimientos' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Movimientos
                </button>
                <button
                  onClick={() => setActiveTab('puntos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase transition-all flex items-center gap-1 ${activeTab === 'puntos' ? 'bg-amber-400 text-slate-900' : 'text-slate-500 hover:text-amber-400'}`}
                >
                  <Star className="w-3 h-3" /> Fidelización
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'movimientos' ? (
                <div className="space-y-2">
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
              ) : (
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
                          className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-black block mb-1">Motivo</label>
                        <input
                          type="text"
                          value={pointsReason}
                          onChange={e => setPointsReason(e.target.value)}
                          placeholder="Ej: Compra en tienda"
                          className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400"
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
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Teléfono</label>
                    <input
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white outline-none"
                      value={editData.phone}
                      onChange={e => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CUIT/DNI</label>
                    <input
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white outline-none"
                      value={editData.cuit}
                      onChange={e => setEditData({ ...editData, cuit: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white outline-none"
                    value={editData.email}
                    onChange={e => setEditData({ ...editData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dirección</label>
                  <input
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white outline-none"
                    value={editData.address}
                    onChange={e => setEditData({ ...editData, address: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSubmitting || !editData.name.trim()}
                    className="flex-1 bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
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
