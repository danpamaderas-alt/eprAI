import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Swal from 'sweetalert2';

// --- INTERFACES ---
interface Client {
  id: string;
  name: string;
  type: string;
  document_id?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface Deal {
  id: string;
  client_id: string;
  title: string;
  status: string;
  expected_revenue: number;
  notes?: string;
  clients?: Client; // Para traer el nombre del cliente relacionado
}

const DEAL_STATUSES = [
  { id: 'NUEVO', label: 'Nuevos Contactos', color: 'bg-blue-500' },
  { id: 'PRESUPUESTANDO', label: 'Presupuestando', color: 'bg-purple-500' },
  { id: 'ESPERANDO_SEÑA', label: 'Esperando Aprobación / Seña', color: 'bg-amber-500' },
  { id: 'TALLER', label: 'En Taller / Producción', color: 'bg-rose-500' },
  { id: 'LISTO', label: 'Listo / Entregado', color: 'bg-emerald-500' }
];

export const CrmDashboard = () => {
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'CLIENTS'>('KANBAN');
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Modales
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  
  // Formularios
  const [clientForm, setClientForm] = useState<Partial<Client>>({ type: 'B2C' });
  const [dealForm, setDealForm] = useState<Partial<Deal>>({ status: 'NUEVO', expected_revenue: 0 });

  useEffect(() => {
    fetchCrmData();
  }, []);

  const fetchCrmData = async () => {
    setIsLoading(true);
    try {
      // Traemos Clientes
      const { data: clientsData } = await supabase.from('clients').select('*').order('name');
      if (clientsData) setClients(clientsData);

      // Traemos Tratos/Ventas con los datos del cliente cruzados
      const { data: dealsData } = await supabase.from('deals').select('*, clients(*)').order('created_at', { ascending: false });
      if (dealsData) setDeals(dealsData);
    } catch (error) {
      console.error('Error fetching CRM data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LÓGICA DE GUARDADO ---
  const handleSaveClient = async () => {
    if (!clientForm.name) return Swal.fire('Error', 'El nombre es obligatorio', 'warning');
    try {
      await supabase.from('clients').insert([clientForm]);
      Swal.fire({ toast: true, icon: 'success', title: 'Cliente guardado', position: 'top-end', showConfirmButton: false, timer: 1500 });
      setIsClientModalOpen(false);
      setClientForm({ type: 'B2C' });
      fetchCrmData();
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar el cliente', 'error');
    }
  };

  const handleSaveDeal = async () => {
    if (!dealForm.title || !dealForm.client_id) return Swal.fire('Error', 'Título y Cliente son obligatorios', 'warning');
    try {
      await supabase.from('deals').insert([dealForm]);
      Swal.fire({ toast: true, icon: 'success', title: 'Oportunidad creada', position: 'top-end', showConfirmButton: false, timer: 1500 });
      setIsDealModalOpen(false);
      setDealForm({ status: 'NUEVO', expected_revenue: 0 });
      fetchCrmData();
    } catch (error) {
      Swal.fire('Error', 'No se pudo crear la oportunidad', 'error');
    }
  };

  // --- LÓGICA DRAG AND DROP (ARRASTRAR Y SOLTAR) ---
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('dealId', dealId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    
    // Actualizamos el estado visual al instante (Optimistic UI)
    setDeals(deals.map(d => d.id === dealId ? { ...d, status: newStatus } : d));

    // Guardamos en Supabase
    try {
      await supabase.from('deals').update({ status: newStatus }).eq('id', dealId);
    } catch (error) {
      Swal.fire('Error', 'No se pudo mover la tarjeta', 'error');
      fetchCrmData(); // Revertimos si falla
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necesario para permitir el "Drop"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER Y PESTAÑAS */}
      <header className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">CRM Comercial</h1>
          <p className="text-sm font-bold text-slate-500 uppercase">Gestión de Clientes y Oportunidades</p>
        </div>
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
          <button 
            onClick={() => setActiveTab('KANBAN')} 
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'KANBAN' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            📊 Embudo
          </button>
          <button 
            onClick={() => setActiveTab('CLIENTS')} 
            className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'CLIENTS' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            👥 Clientes
          </button>
        </div>
      </header>

      {/* VISTA 1: TABLERO KANBAN */}
      {activeTab === 'KANBAN' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsDealModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
              + Nueva Oportunidad
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-250px)]">
            {DEAL_STATUSES.map(col => (
              <div 
                key={col.id} 
                onDrop={(e) => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
                className="min-w-[300px] w-[300px] flex-shrink-0 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-3 flex flex-col gap-3 h-full overflow-y-auto border border-transparent dark:border-slate-700/50"
              >
                <div className="flex items-center gap-2 mb-2 px-2">
                  <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                  <h3 className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase">{col.label}</h3>
                  <span className="ml-auto bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {deals.filter(d => d.status === col.id).length}
                  </span>
                </div>

                {deals.filter(d => d.status === col.id).map(deal => (
                  <div 
                    key={deal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal.id)}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                        {deal.clients?.name || 'Cliente sin asignar'}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight mb-3">
                      {deal.title}
                    </h4>
                    <div className="flex justify-between items-end mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[120px]">{deal.clients?.type || 'B2C'}</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ${deal.expected_revenue?.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 2: DIRECTORIO DE CLIENTES */}
      {activeTab === 'CLIENTS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setIsClientModalOpen(true)} className="bg-slate-900 dark:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
              + Nuevo Cliente / Institución
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-500 border-b dark:border-slate-700">
                  <th className="p-5">Nombre / Razón Social</th>
                  <th className="p-5">Contacto</th>
                  <th className="p-5">Tipo</th>
                  <th className="p-5">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {clients.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-400">No hay clientes registrados aún.</td></tr>
                ) : (
                  clients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="p-5 align-top">
                        <span className="font-black text-sm dark:text-white uppercase block leading-none mb-1">{c.name}</span>
                        <span className="text-[10px] font-bold text-slate-400">{c.document_id || 'Sin CUIT/DNI'}</span>
                      </td>
                      <td className="p-5 align-top space-y-1">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">📱 {c.phone || '-'}</div>
                        <div className="text-xs font-bold text-blue-500">📧 {c.email || '-'}</div>
                      </td>
                      <td className="p-5 align-top">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg">
                          {c.type}
                        </span>
                      </td>
                      <td className="p-5 align-top text-xs font-medium text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {c.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO CLIENTE */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg border dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700 flex justify-between">
              <h2 className="font-black dark:text-white uppercase">👥 Alta de Cliente</h2>
              <button onClick={() => setIsClientModalOpen(false)} className="dark:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Razón Social / Nombre *</label><input value={clientForm.name || ''} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Tipo</label><select value={clientForm.type} onChange={e => setClientForm({...clientForm, type: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold"><option value="B2C">Minorista (B2C)</option><option value="CLUB">Club / Institución</option><option value="B2B">Empresa (B2B)</option><option value="GOBIERNO">Gobierno / Licitación</option></select></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">CUIT / DNI</label><input value={clientForm.document_id || ''} onChange={e => setClientForm({...clientForm, document_id: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Teléfono / WhatsApp</label><input value={clientForm.phone || ''} onChange={e => setClientForm({...clientForm, phone: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold" /></div>
                <div><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Email</label><input type="email" value={clientForm.email || ''} onChange={e => setClientForm({...clientForm, email: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold" /></div>
                <div className="col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Notas / Acuerdos</label><textarea value={clientForm.notes || ''} onChange={e => setClientForm({...clientForm, notes: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-medium resize-none" rows={2} /></div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setIsClientModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 px-4">Cancelar</button>
              <button onClick={handleSaveClient} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg">Guardar Cliente 💾</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA OPORTUNIDAD */}
      {isDealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg border dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b dark:border-slate-700 flex justify-between">
              <h2 className="font-black dark:text-white uppercase">📊 Nueva Oportunidad</h2>
              <button onClick={() => setIsDealModalOpen(false)} className="dark:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Título del Proyecto / Pedido *</label>
                  <input placeholder="Ej: 50 Camperas Egresados Cat 2026" value={dealForm.title || ''} onChange={e => setDealForm({...dealForm, title: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Cliente Asociado *</label>
                  <select value={dealForm.client_id || ''} onChange={e => setDealForm({...dealForm, client_id: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold">
                    <option value="">-- Seleccionar Cliente --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Estado Inicial</label>
                    <select value={dealForm.status} onChange={e => setDealForm({...dealForm, status: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-bold">
                      {DEAL_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-emerald-500 mb-1 block">Ingreso Estimado ($)</label>
                    <input type="number" value={dealForm.expected_revenue || ''} onChange={e => setDealForm({...dealForm, expected_revenue: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-emerald-500 font-black" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Notas Rápidas</label>
                  <textarea placeholder="Ej: Necesitan el presupuesto para el jueves." value={dealForm.notes || ''} onChange={e => setDealForm({...dealForm, notes: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded-xl dark:text-white font-medium resize-none" rows={2} />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setIsDealModalOpen(false)} className="uppercase text-[10px] font-black text-slate-400 px-4">Cancelar</button>
              <button onClick={handleSaveDeal} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg">Crear Oportunidad 🚀</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};