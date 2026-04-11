import { useState, useEffect, useMemo } from 'react';
import { useLogisticsStore } from '../../logistics/store/useLogisticsStore';
import Swal from 'sweetalert2';

export const LogisticsDashboard = () => {
  const { deliveries, fetchDeliveries, addDelivery, updateDeliveryStatus, deleteDelivery, isLoading } = useLogisticsStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterZone, setFilterZone] = useState('TODAS');

  // Estados del Formulario (Para cargas manuales)
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState('BERISSO');
  const [phone, setPhone] = useState('');
  const [itemsDesc, setItemsDesc] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const zones = useMemo(() => {
    const uniqueZones = new Set(deliveries.map(d => d.zone));
    return ['TODAS', ...Array.from(uniqueZones)];
  }, [deliveries]);

  const filteredDeliveries = useMemo(() => {
    let filtered = deliveries;
    if (filterZone !== 'TODAS') filtered = filtered.filter(d => d.zone === filterZone);
    // Ordenamos: PENDIENTES arriba, EN CAMINO al medio, ENTREGADOS al fondo
    return filtered.sort((a, b) => {
      const order = { 'IN_TRANSIT': 1, 'PENDING': 2, 'FAILED': 3, 'DELIVERED': 4 };
      return order[a.status] - order[b.status];
    });
  }, [deliveries, filterZone]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDelivery({ customer_name: customerName, address, zone, phone, items_description: itemsDesc, notes, status: 'PENDING' });
      setIsFormOpen(false);
      setCustomerName(''); setAddress(''); setPhone(''); setItemsDesc(''); setNotes('');
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Envío Agregado', showConfirmButton: false, timer: 2000 });
    } catch (err) { Swal.fire('Error', 'No se pudo guardar', 'error'); }
  };

  const openMaps = (address: string, zone: string) => {
    const query = encodeURIComponent(`${address}, ${zone}, Buenos Aires`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const openWhatsApp = (phone: string, customer: string) => {
    if (!phone) return Swal.fire('Sin número', 'No se registró teléfono', 'warning');
    const msg = encodeURIComponent(`¡Hola ${customer}! Te escribimos de Raíces. Tu pedido ya está en camino 🚚. Te avisamos cuando estemos en la puerta.`);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  const statusColors = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    IN_TRANSIT: 'bg-blue-100 text-blue-800 border-blue-200',
    DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    FAILED: 'bg-rose-100 text-rose-800 border-rose-200'
  };

  const statusLabels = { PENDING: '⏳ PENDIENTE', IN_TRANSIT: '🚚 EN CAMINO', DELIVERED: '✅ ENTREGADO', FAILED: '❌ RECHAZADO' };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic">Hoja de Ruta</h1>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Logística y Reparto</p>
        </div>
        <button onClick={() => setIsFormOpen(!isFormOpen)} className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg active:scale-95">
          {isFormOpen ? 'CERRAR FORMULARIO' : '+ NUEVO ENVÍO'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Cliente</label><input required value={customerName} onChange={e=>setCustomerName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" placeholder="Nombre completo" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Teléfono (WhatsApp)</label><input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" placeholder="Ej: 2215554433" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Dirección Exacta</label><input required value={address} onChange={e=>setAddress(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" placeholder="Calle 12 N° 345, timbre 2" /></div>
            <div><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Zona</label><select value={zone} onChange={e=>setZone(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 font-bold outline-none"><option value="BERISSO">Berisso</option><option value="LA_PLATA">La Plata (Casco)</option><option value="ENSENADA">Ensenada</option><option value="LOS_HORNOS">Los Hornos</option></select></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">¿Qué lleva?</label><input required value={itemsDesc} onChange={e=>setItemsDesc(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" placeholder="2x Remeras Negras L" /></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-slate-500 ml-1">Notas / Observaciones</label><input value={notes} onChange={e=>setNotes(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" placeholder="Dejar en el kiosco de al lado si no hay nadie" /></div>
          </div>
          <div className="flex justify-end pt-2"><button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-500/30">Guardar Envío</button></div>
        </form>
      )}

      {/* FILTRO DE ZONAS */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {zones.map(z => (
          <button key={z} onClick={() => setFilterZone(z)} className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${filterZone === z ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {z.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* TARJETAS DE ENVÍO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <p className="text-slate-400 font-bold p-4">Cargando ruta...</p>}
        {filteredDeliveries.map(delivery => (
          <div key={delivery.id} className={`bg-white rounded-3xl p-5 border-2 shadow-sm flex flex-col ${delivery.status === 'DELIVERED' ? 'border-emerald-100 opacity-60' : 'border-slate-100'}`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border ${statusColors[delivery.status]}`}>
                {statusLabels[delivery.status]}
              </span>
              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase">{delivery.zone.replace('_', ' ')}</span>
            </div>
            
            <h3 className="text-lg font-black text-slate-900 uppercase leading-none mb-1">{delivery.customer_name}</h3>
            <p className="text-xs font-bold text-blue-600 mb-3">{delivery.address}</p>
            
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 flex-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Paquete</p>
              <p className="text-xs font-bold text-slate-700">{delivery.items_description}</p>
              {delivery.notes && <p className="text-[10px] italic text-rose-500 font-bold mt-2 border-t border-slate-200 pt-2">⚠️ {delivery.notes}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => openMaps(delivery.address, delivery.zone)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-[10px] font-black uppercase flex justify-center items-center gap-1 transition-colors">📍 GPS</button>
              <button onClick={() => openWhatsApp(delivery.phone || '', delivery.customer_name)} className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] py-2 rounded-xl text-[10px] font-black uppercase flex justify-center items-center gap-1 transition-colors">💬 Avisar</button>
            </div>

            {/* BOTONERA DE ESTADOS (CAMBIA SEGÚN EL ESTADO ACTUAL) */}
            <div className="border-t border-slate-100 pt-3 flex gap-2">
              {delivery.status === 'PENDING' && (
                <button onClick={() => updateDeliveryStatus(delivery.id, 'IN_TRANSIT')} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/30 active:scale-95">Salí a entregar</button>
              )}
              {delivery.status === 'IN_TRANSIT' && (
                <>
                  <button onClick={() => updateDeliveryStatus(delivery.id, 'DELIVERED')} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/30 active:scale-95">Entregado</button>
                  <button onClick={() => updateDeliveryStatus(delivery.id, 'FAILED')} className="flex-1 bg-rose-500 text-white py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-rose-500/30 active:scale-95">No estaba</button>
                </>
              )}
              {(delivery.status === 'DELIVERED' || delivery.status === 'FAILED') && (
                <button onClick={() => deleteDelivery(delivery.id)} className="w-full bg-slate-100 text-slate-400 hover:text-rose-500 py-2 rounded-xl text-[10px] font-black uppercase transition-colors">Eliminar de la ruta</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};