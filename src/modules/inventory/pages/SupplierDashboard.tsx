import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Search, Building2, Plus, Truck, Phone, Mail, MapPin,
  Edit3, Trash2, Save, X, DollarSign, AlertTriangle,
  CheckCircle, Clock, FileText, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useSupplierStore, type Supplier, type SupplierDebt } from '../store/useSupplierStore';
import { ARS } from '../../../shared/utils/format';

type Tab = 'all' | 'debts';

interface SupplierForm {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  category: string;
  address: string;
  notes: string;
}

interface DebtForm {
  supplier_id: string;
  description: string;
  amount: string;
  paid_amount: string;
  due_date: string;
  status: string;
}

const EMPTY_SUPPLIER_FORM: SupplierForm = {
  name: '', contact_person: '', phone: '', email: '', category: '', address: '', notes: '',
};

const EMPTY_DEBT_FORM: DebtForm = {
  supplier_id: '', description: '', amount: '', paid_amount: '0', due_date: '', status: 'PENDIENTE',
};

const SUPPLIER_CATEGORIES = ['TEXTIL', 'HILOS', 'ACCESORIOS', 'EMPATE', 'OTROS'];
const DEBT_STATUSES = ['PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA'];

function debtStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'PAGADA': return 'bg-emerald-500/10 text-emerald-600';
    case 'PARCIAL': return 'bg-amber-500/10 text-amber-600';
    case 'VENCIDA': return 'bg-red-500/10 text-red-600';
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500';
  }
}

export const SupplierDashboard = memo(() => {
  const {
    suppliers, debts, isLoading,
    fetchSuppliers, fetchDebts, addSupplier, updateSupplier, deleteSupplier,
    addDebt, updateDebt, deleteDebt,
  } = useSupplierStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [showNewDebt, setShowNewDebt] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [viewDebtsFor, setViewDebtsFor] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [supplierForm, setSupplierForm] = useState<SupplierForm>(EMPTY_SUPPLIER_FORM);
  const [debtForm, setDebtForm] = useState<DebtForm>(EMPTY_DEBT_FORM);

  useEffect(() => { fetchSuppliers(); fetchDebts(); }, [fetchSuppliers, fetchDebts]);

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(term) ||
      (s.contact_person || '').toLowerCase().includes(term) ||
      (s.phone || '').toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term) ||
      (s.category || '').toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const stats = useMemo(() => {
    const totalDebt = debts.filter(d => d.status !== 'PAGADA').reduce((sum, d) => sum + ((d.amount || 0) - (d.paid_amount || 0)), 0);
    const pendingDebts = debts.filter(d => d.status === 'PENDIENTE' || d.status === 'VENCIDA').length;
    const overdueDebts = debts.filter(d => d.status === 'VENCIDA').length;
    const categories = new Set(suppliers.map(s => s.category).filter(Boolean));
    return { totalDebt, pendingDebts, overdueDebts, totalSuppliers: suppliers.length, categories: categories.size };
  }, [suppliers, debts]);

  const toggleCard = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ===== Supplier CRUD =====
  const handleCreateSupplier = useCallback(async () => {
    if (!supplierForm.name.trim()) return Swal.fire('Error', 'Ingresá la razón social', 'warning');
    try {
      await addSupplier({
        name: supplierForm.name.trim().toUpperCase(),
        contact_person: supplierForm.contact_person.trim() || null,
        phone: supplierForm.phone.trim() || null,
        email: supplierForm.email.trim() || null,
        category: supplierForm.category || null,
        address: supplierForm.address.trim() || null,
        notes: supplierForm.notes.trim() || null,
      });
      setShowNewSupplier(false);
      setSupplierForm(EMPTY_SUPPLIER_FORM);
      Swal.fire({ title: 'Proveedor registrado', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo registrar', 'error');
    }
  }, [supplierForm, addSupplier]);

  const handleEditSupplier = useCallback(async () => {
    if (!editSupplier) return;
    try {
      await updateSupplier(editSupplier.id, {
        name: supplierForm.name.trim().toUpperCase() || editSupplier.name,
        contact_person: supplierForm.contact_person.trim() || null,
        phone: supplierForm.phone.trim() || null,
        email: supplierForm.email.trim() || null,
        category: supplierForm.category || null,
        address: supplierForm.address.trim() || null,
        notes: supplierForm.notes.trim() || null,
      });
      setEditSupplier(null);
      setSupplierForm(EMPTY_SUPPLIER_FORM);
      Swal.fire({ title: 'Proveedor actualizado', icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo actualizar', 'error');
    }
  }, [editSupplier, supplierForm, updateSupplier]);

  const handleDeleteSupplier = useCallback(async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Eliminar proveedor',
      text: `¿Eliminar "${name}"? Se perderán todos sus datos.`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444',
    });
    if (result.isConfirmed) {
      try {
        await deleteSupplier(id);
        Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1000, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire('Error', err?.message || 'No se pudo eliminar', 'error');
      }
    }
  }, [deleteSupplier]);

  const openEditSupplier = useCallback((s: Supplier) => {
    setSupplierForm({
      name: s.name, contact_person: s.contact_person || '', phone: s.phone || '',
      email: (s as any).email || '', category: s.category || '', address: (s as any).address || '', notes: (s as any).notes || '',
    });
    setEditSupplier(s);
  }, []);

  // ===== Debt CRUD =====
  const handleCreateDebt = useCallback(async () => {
    if (!debtForm.description.trim() || !debtForm.amount || !debtForm.due_date) {
      return Swal.fire('Error', 'Completá descripción, monto y fecha', 'warning');
    }
    try {
      await addDebt({
        supplier_id: debtForm.supplier_id || null,
        description: debtForm.description.trim(),
        amount: Number(debtForm.amount),
        paid_amount: Number(debtForm.paid_amount) || 0,
        due_date: debtForm.due_date,
        status: Number(debtForm.paid_amount) >= Number(debtForm.amount) ? 'PAGADA' :
                Number(debtForm.paid_amount) > 0 ? 'PARCIAL' : debtForm.status,
      });
      setShowNewDebt(false);
      setDebtForm(EMPTY_DEBT_FORM);
      Swal.fire({ title: 'Deuda registrada', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo registrar', 'error');
    }
  }, [debtForm, addDebt]);

  const handlePayDebt = useCallback(async (debt: SupplierDebt) => {
    const { value: amount } = await Swal.fire({
      title: 'Registrar pago',
      text: `Saldo: ${ARS.format((debt.amount || 0) - (debt.paid_amount || 0))}`,
      input: 'number', inputPlaceholder: 'Monto a pagar',
      showCancelButton: true, confirmButtonText: 'Registrar',
    });
    if (amount && Number(amount) > 0) {
      const newPaid = (debt.paid_amount || 0) + Number(amount);
      const newStatus = newPaid >= debt.amount ? 'PAGADA' : 'PARCIAL';
      try {
        await updateDebt(debt.id, { paid_amount: newPaid, status: newStatus });
        Swal.fire({ title: 'Pago registrado', icon: 'success', timer: 1000, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire('Error', err?.message || 'No se pudo registrar', 'error');
      }
    }
  }, [updateDebt]);

  const handleDeleteDebt = useCallback(async (id: string) => {
    const result = await Swal.fire({ title: 'Eliminar deuda', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if (result.isConfirmed) {
      try {
        await deleteDebt(id);
        Swal.fire({ title: 'Eliminada', icon: 'success', timer: 1000, showConfirmButton: false });
      } catch (err: any) {
        Swal.fire('Error', err?.message || 'No se pudo eliminar', 'error');
      }
    }
  }, [deleteDebt]);

  const debtsBySupplier = useMemo(() => {
    const map = new Map<string, SupplierDebt[]>();
    debts.forEach(d => {
      if (!d.supplier_id) return;
      if (!map.has(d.supplier_id)) map.set(d.supplier_id, []);
      map.get(d.supplier_id)!.push(d);
    });
    return map;
  }, [debts]);

  return (
    <div className="space-y-5 p-4 lg:p-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            Proveedores
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 ml-13">Directorio B2B y cuentas por pagar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setDebtForm(EMPTY_DEBT_FORM); setShowNewDebt(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 text-amber-600 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all active:scale-95">
            <DollarSign className="w-3 h-3" /> Nueva Deuda
          </button>
          <button onClick={() => { setSupplierForm(EMPTY_SUPPLIER_FORM); setShowNewSupplier(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-brand/20 hover:shadow-brand/40 transition-all active:scale-95">
            <Plus className="w-3 h-3" /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Proveedores', value: stats.totalSuppliers, color: 'text-slate-900 dark:text-white', bg: 'bg-white dark:bg-slate-800', icon: Truck },
          { label: 'Categorías', value: stats.categories, color: 'text-brand', bg: 'bg-brand/5 dark:bg-brand/10', icon: FileText },
          { label: 'Deudas Pendientes', value: stats.pendingDebts, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Clock },
          { label: 'Deuda Total', value: ARS.format(stats.totalDebt), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: DollarSign },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-3 h-3 ${color}`} />
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
            </div>
            <p className={`text-xl font-black ${color} tabular-nums`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all' as Tab, label: 'Directorio' },
          { key: 'debts' as Tab, label: `Deudas (${stats.pendingDebts})`, warn: stats.overdueDebts > 0 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
            activeTab === tab.key
              ? tab.warn ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-brand text-white shadow-lg shadow-brand/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}>
            {tab.key === 'debts' && stats.overdueDebts > 0 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {activeTab === 'all' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre, contacto, teléfono, email o categoría..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
        </div>
      )}

      {/* ===== DIRECTORY VIEW ===== */}
      {activeTab === 'all' && (
        isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-black uppercase animate-pulse">Cargando...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xl">
            <Truck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="font-black text-slate-400 uppercase text-sm">Sin proveedores</p>
            <button onClick={() => { setSupplierForm(EMPTY_SUPPLIER_FORM); setShowNewSupplier(true); }} className="mt-3 text-[10px] font-black uppercase text-brand hover:underline">
              + Registrar proveedor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSuppliers.map(supplier => {
              const isExpanded = expandedCards.has(supplier.id);
              const supplierDebts = debtsBySupplier.get(supplier.id) || [];
              const pendingAmount = supplierDebts.filter(d => d.status !== 'PAGADA').reduce((sum, d) => sum + ((d.amount || 0) - (d.paid_amount || 0)), 0);
              return (
                <div key={supplier.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-brand" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{supplier.name}</h3>
                          {supplier.category && (
                            <span className="text-[7px] font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded uppercase">{supplier.category}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => toggleCard(supplier.id)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[10px] font-medium text-slate-500">
                      {supplier.contact_person && (
                        <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {supplier.contact_person}</p>
                      )}
                      {supplier.phone && (
                        <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {supplier.phone}</p>
                      )}
                      {(supplier as any).email && (
                        <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {(supplier as any).email}</p>
                      )}
                      {(supplier as any).address && (
                        <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {(supplier as any).address}</p>
                      )}
                    </div>

                    {pendingAmount > 0 && (
                      <div className="mt-3 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-amber-600">Debe</span>
                        <span className="text-xs font-black text-amber-600 tabular-nums">{ARS.format(pendingAmount)}</span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/30">
                      {(supplier as any).notes && (
                        <p className="text-[10px] text-slate-500 mb-3 italic">"{(supplier as any).notes}"</p>
                      )}
                      {supplierDebts.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Deudas recientes</p>
                          {supplierDebts.slice(0, 3).map(d => (
                            <div key={d.id} className="flex items-center justify-between py-1">
                              <span className="text-[10px] font-medium text-slate-600 truncate">{d.description}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${debtStatusColor(d.status)}`}>{d.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <button onClick={() => { setViewDebtsFor(supplier.id); setActiveTab('debts'); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                          <Eye className="w-3 h-3" /> Deudas
                        </button>
                        <button onClick={() => openEditSupplier(supplier)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-brand/10 text-brand rounded-lg text-[9px] font-black uppercase hover:bg-brand/20 transition-colors">
                          <Edit3 className="w-3 h-3" /> Editar
                        </button>
                        <button onClick={() => handleDeleteSupplier(supplier.id, supplier.name)} className="flex items-center justify-center p-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ===== DEBTS VIEW ===== */}
      {activeTab === 'debts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="p-4">Proveedor</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 text-right">Pagado</th>
                  <th className="p-4 text-right">Saldo</th>
                  <th className="p-4 text-center">Vencimiento</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {debts
                  .filter(d => !viewDebtsFor || d.supplier_id === viewDebtsFor)
                  .map(debt => {
                    const supplier = suppliers.find(s => s.id === debt.supplier_id);
                    const balance = (debt.amount || 0) - (debt.paid_amount || 0);
                    const isOverdue = debt.status === 'VENCIDA' || (debt.status !== 'PAGADA' && new Date(debt.due_date) < new Date());
                    return (
                      <tr key={debt.id} className={`dark:text-white text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
                        <td className="p-4 font-bold uppercase">{supplier?.name || '—'}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{debt.description}</td>
                        <td className="p-4 text-right font-bold tabular-nums">{ARS.format(debt.amount || 0)}</td>
                        <td className="p-4 text-right text-emerald-600 font-bold tabular-nums">{ARS.format(debt.paid_amount || 0)}</td>
                        <td className={`p-4 text-right font-black tabular-nums ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{ARS.format(balance)}</td>
                        <td className="p-4 text-center text-slate-500">{new Date(debt.due_date).toLocaleDateString('es-AR')}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${debtStatusColor(debt.status)}`}>{debt.status}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            {debt.status !== 'PAGADA' && (
                              <button onClick={() => handlePayDebt(debt)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Registrar pago">
                                <DollarSign className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleDeleteDebt(debt.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {debts.length === 0 && (
                  <tr><td colSpan={8} className="p-12 text-center text-slate-400 text-xs font-black uppercase">Sin deudas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {viewDebtsFor && (
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <button onClick={() => setViewDebtsFor(null)} className="text-[10px] font-black uppercase text-brand hover:underline">
                ← Ver todas las deudas
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* New/Edit Supplier Modal */}
      {(showNewSupplier || editSupplier) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowNewSupplier(false); setEditSupplier(null); }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">{editSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => { setShowNewSupplier(false); setEditSupplier(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Razón Social *</label>
                <input type="text" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Ej: Textil San Juan S.A."
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Contacto</label>
                  <input type="text" value={supplierForm.contact_person} onChange={e => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    placeholder="Ej: Carlos López"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Categoría</label>
                  <select value={supplierForm.category} onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                    <option value="">Sin categoría</option>
                    {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Teléfono</label>
                  <input type="text" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="+54 9 11 1234-5678"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Email</label>
                  <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="contacto@proveedor.com"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Dirección</label>
                <input type="text" value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="Opcional"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Notas</label>
                <textarea value={supplierForm.notes} onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  placeholder="Observaciones..." rows={2}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowNewSupplier(false); setEditSupplier(null); }} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl text-xs font-black uppercase text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
              <button onClick={editSupplier ? handleEditSupplier : handleCreateSupplier} disabled={!supplierForm.name.trim()}
                className="flex-1 bg-brand text-white py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-brand/20">
                <Save className="w-3 h-3 inline mr-1" /> {editSupplier ? 'Guardar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Debt Modal */}
      {showNewDebt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewDebt(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Nueva Deuda</h3>
              <button onClick={() => setShowNewDebt(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Proveedor</label>
                <select value={debtForm.supplier_id} onChange={e => setDebtForm({ ...debtForm, supplier_id: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                  <option value="">Sin proveedor</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Descripción *</label>
                <input type="text" value={debtForm.description} onChange={e => setDebtForm({ ...debtForm, description: e.target.value })}
                  placeholder="Ej: Compra de telgado lote #45"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Monto Total *</label>
                  <input type="number" min="0" value={debtForm.amount} onChange={e => setDebtForm({ ...debtForm, amount: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Ya Pagado</label>
                  <input type="number" min="0" value={debtForm.paid_amount} onChange={e => setDebtForm({ ...debtForm, paid_amount: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Vencimiento *</label>
                  <input type="date" value={debtForm.due_date} onChange={e => setDebtForm({ ...debtForm, due_date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 block">Estado</label>
                  <select value={debtForm.status} onChange={e => setDebtForm({ ...debtForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-white outline-none focus:border-brand transition-all">
                    {DEBT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNewDebt(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button onClick={handleCreateDebt} disabled={!debtForm.description.trim() || !debtForm.amount || !debtForm.due_date}
                className="flex-1 bg-brand text-white py-2.5 rounded-xl text-xs font-black uppercase disabled:opacity-40 transition-all active:scale-95 shadow-lg shadow-brand/20">
                <DollarSign className="w-3 h-3 inline mr-1" /> Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SupplierDashboard.displayName = 'SupplierDashboard';
export default SupplierDashboard;
