import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useLogisticsStore } from '../../logistics/store/useLogisticsStore';
import Swal from 'sweetalert2';

const INITIAL_FORM = {
  customerName: '',
  address: '',
  zone: 'BERISSO',
  phone: '',
  itemsDesc: '',
  notes: ''
};

// 🛡️ Constantes de estilo fuera del componente para evitar re-creaciones
const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400'
} as const;

const STATUS_LABELS = { 
  PENDING: '⏳ PENDIENTE', 
  IN_TRANSIT: '🚚 EN CAMINO', 
  DELIVERED: '✅ ENTREGADO', 
  FAILED: '❌ RECHAZADO' 
} as const;

export const LogisticsDashboard = memo(() => {
  const { deliveries, fetchDeliveries, addDelivery, updateDeliveryStatus, deleteDelivery, isLoading } = useLogisticsStore();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterZone, setFilterZone] = useState('TODAS');
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => { 
    fetchDeliveries(); 
  }, [fetchDeliveries]);

  const zones = useMemo(() => {
    const uniqueZones = new Set(deliveries.map(d => d.zone));
    return ['TODAS', ...Array.from(uniqueZones)];
  }, [deliveries]);

  const filteredDeliveries = useMemo(() => {
    let filtered = deliveries;
    if (filterZone !== 'TODAS') {
      filtered = filtered.filter(d => d.zone === filterZone);
    }
    
    return [...filtered].sort((a, b) => {
      const order: Record<string, number> = { 'IN_TRANSIT': 1, 'PENDING': 2, 'FAILED': 3, 'DELIVERED': 4 };
      return (order[a.status || 'PENDING'] || 99) - (order[b.status || 'PENDING'] || 99);
    });
  }, [deliveries, filterZone]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDelivery({ 
        customer_name: formData.customerName, 
        address: formData.address, 
        zone: formData.zone, 
        phone: formData.phone, 
        items_description: formData.itemsDesc, 
        notes: formData.notes, 
        status: 'PENDING' 
      });
      
      setIsFormOpen(false);
      setFormData(INITIAL_FORM);
      
      Swal.fire({ 
        toast: true, position: 'top-end', icon: 'success', 
        title: 'Envío Agregado', showConfirmButton: false, timer: 2000 
      });
    } catch (error) { 
      console.error("Error al guardar envío:", error);
      Swal.fire('Error', 'No se pudo guardar el envío en la base de datos', 'error'); 
    }
  };

  // 🚀 FIX: URL de Maps corregida para API estándar de Google
  const openMaps = useCallback((address: string, zone: string) => {
    const query = encodeURIComponent(`${address}, ${zone}, Buenos Aires, Argentina`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }, []);

  const openWhatsApp = useCallback((phone: string, customer: string) => {
    if (!phone) {
      return Swal.fire('Sin número', 'No se registró teléfono para este cliente', 'warning');
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`¡Hola ${customer}! 👋 Te escribimos de Raíces. Tu pedido ya está en camino 🚚. Te avisamos cuando estemos en la puerta.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Hoja de Ruta</h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Logística & Distribución Raíces</p>
        </div>
        <button 
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)} 
          className={`w-full md:w-auto px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
            isFormOpen ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white hover:bg-black'
          }`}
        >
          {isFormOpen ? '✕ CERRAR ALTA' : '+ NUEVO ENVÍO'}
        </button>
      </header>

      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 space-y-5 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="customerName" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Cliente</label>
              <input id="customerName" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="Nombre para el repartidor" />
            </div>
            <div>
              <label htmlFor="phone" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">WhatsApp</label>
              <input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="Sin el 15 (Ej: 2215554433)" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="address" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Dirección Exacta</label>
              <input id="address" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="Calle, N°, Timbre/Depto" />
            </div>
            <div>
              <label htmlFor="zone" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Zona de Reparto</label>
              <select id="zone" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-black uppercase text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="BERISSO">Berisso</option>
                <option value="LA_PLATA">La Plata (Casco)</option>
                <option value="ENSENADA">Ensenada</option>
                <option value="LOS_HORNOS">Los Hornos</option>
                <option value="VILLA_ELVIRA">Villa Elvira</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="itemsDesc" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descripción del Paquete</label>
              <input id="itemsDesc" required value={formData.itemsDesc} onChange={e => setFormData({...formData, itemsDesc: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="Ej: 2x Remeras Negras L, 1x Buzo XL" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="notes" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Notas para el Repartidor</label>
              <input id="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" placeholder="Ej: Dejar en el kiosco si no hay nadie" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all">
              Guardar Envío en Ruta
            </button>
          </div>
        </form>
      )}

      <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide">
        {zones.map(z => (
          <button 
            key={z} 
            type="button"
            onClick={() => setFilterZone(z)} 
            className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${
              filterZone === z 
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {z.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <div className="col-span-full py-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Sincronizando ruta en tiempo real...
          </div>
        )}
        
        {filteredDeliveries.map(delivery => {
          const statusKey = (delivery.status || 'PENDING') as keyof typeof STATUS_COLORS;

          return (
            <div 
              key={delivery.id} 
              className={`bg-white dark:bg-slate-800 rounded-[2rem] p-6 border-2 shadow-sm flex flex-col transition-all group ${
                delivery.status === 'DELIVERED' 
                  ? 'border-emerald-100 dark:border-emerald-900/20 opacity-60' 
                  : 'border-slate-100 dark:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border ${STATUS_COLORS[statusKey]}`}>
                  {STATUS_LABELS[statusKey]}
                </span>
                <span className="text-[9px] font-black text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded uppercase tracking-tighter">
                  {delivery.zone.replace('_', ' ')}
                </span>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none mb-1">{delivery.customer_name}</h3>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-4">{delivery.address}</p>
              
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 mb-5 flex-1">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Contenido del Paquete</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{delivery.items_description}</p>
                {delivery.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] italic text-rose-500 font-black tracking-tight">⚠️ {delivery.notes}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button 
                  type="button"
                  onClick={() => openMaps(delivery.address, delivery.zone)} 
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-[10px] font-black uppercase flex justify-center items-center gap-2 transition-colors active:scale-95"
                >
                  📍 VER MAPA
                </button>
                <button 
                  type="button"
                  onClick={() => openWhatsApp(delivery.phone || '', delivery.customer_name)} 
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-3 rounded-xl text-[10px] font-black uppercase flex justify-center items-center gap-2 transition-colors active:scale-95"
                >
                  💬 MENSAJE
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-4 flex gap-2">
                {delivery.status === 'PENDING' && (
                  <button type="button" onClick={() => updateDeliveryStatus(delivery.id, 'IN_TRANSIT')} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Iniciar Reparto</button>
                )}
                {delivery.status === 'IN_TRANSIT' && (
                  <>
                    <button type="button" onClick={() => updateDeliveryStatus(delivery.id, 'DELIVERED')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Entregado</button>
                    <button type="button" onClick={() => updateDeliveryStatus(delivery.id, 'FAILED')} className="flex-1 bg-rose-500 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Falló</button>
                  </>
                )}
                {(delivery.status === 'DELIVERED' || delivery.status === 'FAILED') && (
                  <button type="button" onClick={() => deleteDelivery(delivery.id)} className="w-full bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 hover:text-rose-500 py-3 rounded-xl text-[10px] font-black uppercase transition-colors">Archivar Envío</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredDeliveries.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-700">
           <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">No hay envíos pendientes en esta zona</p>
        </div>
      )}
    </div>
  );
});

LogisticsDashboard.displayName = 'LogisticsDashboard';