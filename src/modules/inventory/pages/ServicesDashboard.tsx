import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useCatalogStore, type Service } from '../../../store/useCatalogStore';
import { supabase } from '../../../lib/supabase';
import { ARS } from '../../../shared/utils/format';
import { Breadcrumbs } from '../../../shared/components/ui/Breadcrumbs';
import { ErrorBoundary } from '../../../shared/components/ui/ErrorBoundary';
import { Modal, FormField } from '../../../shared/components/ui/Modal';
import Swal from 'sweetalert2';

const ServicesContent = memo(() => {
  const { services, fetchAllCatalogs, addService } = useCatalogStore();
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    fetchAllCatalogs();
  }, [fetchAllCatalogs]);

  const filteredServices = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return services.filter(s => s.name.toLowerCase().includes(search));
  }, [services, searchTerm]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormPrice('');
    setFormDesc('');
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setIsCreateOpen(true);
  }, [resetForm]);

  const openEdit = useCallback((service: Service) => {
    setEditService(service);
    setFormName(service.name);
    setFormPrice(String(service.price));
    setFormDesc(service.description || '');
    setIsEditOpen(true);
  }, []);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice) return;
    try {
      await addService({
        name: formName.trim().toUpperCase(),
        price: Number.parseFloat(formPrice),
        description: formDesc.trim(),
      });
      setIsCreateOpen(false);
      resetForm();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Servicio Registrado', showConfirmButton: false, timer: 1500 });
    } catch {
      Swal.fire('Error', 'No se pudo crear el servicio.', 'error');
    }
  }, [formName, formPrice, formDesc, addService, resetForm]);

  const handleEdit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editService || !formName.trim() || !formPrice) return;
    try {
      const { error } = await supabase.from('services').update({
        name: formName.trim().toUpperCase(),
        price: Number.parseFloat(formPrice),
        description: formDesc.trim(),
      }).eq('id', editService.id);
      if (error) throw error;
      await fetchAllCatalogs();
      setIsEditOpen(false);
      resetForm();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa Actualizada', showConfirmButton: false, timer: 1500 });
    } catch {
      Swal.fire('Error', 'No se pudo actualizar el servicio.', 'error');
    }
  }, [editService, formName, formPrice, formDesc, fetchAllCatalogs, resetForm]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: '¿ELIMINAR TARIFA?',
      text: 'Esta acción es irreversible y afectará los catálogos de presupuestos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'SÍ, BORRAR',
      customClass: { popup: 'dark:!bg-slate-900 !rounded-[2.5rem] !text-white' }
    });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      await fetchAllCatalogs();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Servicio Borrado', showConfirmButton: false, timer: 1500 });
    } catch {
      Swal.fire('Error', 'No se pudo eliminar el servicio.', 'error');
    }
  }, [fetchAllCatalogs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Breadcrumbs items={[{ label: 'Servicios' }]} />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Servicios <span className="text-blue-600">& Tarifas</span></h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Gestión de activos intangibles del Holding.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-8 py-4 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
        >
          + NUEVO SERVICIO
        </button>
      </header>

      <div className="relative max-w-md">
        <label htmlFor="search-services" className="sr-only">Buscar servicio por nombre</label>
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" aria-hidden="true">🔍</span>
        <input
          id="search-services"
          type="text"
          placeholder="BUSCAR SERVICIO..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-black text-xs uppercase tracking-widest"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredServices.length === 0 ? (
          <div className="col-span-full py-24 text-center opacity-30">
            <span className="text-7xl mb-4 block" aria-hidden="true">⚙️</span>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-900 dark:text-white">Sin servicios registrados en el radar</p>
          </div>
        ) : (
          filteredServices.map(service => (
            <div key={service.id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all group flex flex-col h-full relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-blue-100 dark:border-blue-800">Servicio B2B</span>
                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => openEdit(service)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-blue-500 transition-all" aria-label="Editar">✏️</button>
                  <button type="button" onClick={() => handleDelete(service.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-rose-500 transition-all" aria-label="Eliminar">🗑️</button>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-2">{service.name}</h3>
              <p className="text-3xl font-black tabular-nums tracking-tighter text-blue-600 dark:text-blue-400">
                {ARS.format(Number.parseFloat(String(service.price || 0)))}
              </p>

              <div className="flex-1" />

              {service.description && (
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter leading-relaxed">
                    {service.description}
                  </p>
                </div>
              )}

              <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.02] font-black select-none group-hover:scale-110 transition-transform" aria-hidden="true">
                RAÍCES
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="NUEVO SERVICIO / ITEM"
        onSubmit={handleCreate}
        submitLabel="CREAR SERVICIO"
        submitColor="bg-emerald-600 hover:bg-emerald-500"
      >
        <FormField label="Nombre del Servicio">
          <input
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            placeholder="Ej: LOGÍSTICA CABA"
            required
          />
        </FormField>
        <FormField label="Precio Base ($)">
          <input
            type="number"
            value={formPrice}
            onChange={e => setFormPrice(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-500 font-black outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            placeholder="0"
            required
          />
        </FormField>
        <FormField label="Descripción Operativa">
          <textarea
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            rows={3}
            placeholder="Detalles del alcance..."
          />
        </FormField>
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="EDITAR SERVICIO / TARIFA"
        onSubmit={handleEdit}
        submitLabel="GUARDAR CAMBIOS"
      >
        <FormField label="Nombre del Servicio">
          <input
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            required
          />
        </FormField>
        <FormField label="Precio Base ($)">
          <input
            type="number"
            value={formPrice}
            onChange={e => setFormPrice(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 font-black outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            required
          />
        </FormField>
        <FormField label="Descripción / Notas">
          <textarea
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            rows={3}
          />
        </FormField>
      </Modal>
    </div>
  );
});

ServicesContent.displayName = 'ServicesContent';

export const ServicesDashboard = memo(() => (
  <ErrorBoundary>
    <ServicesContent />
  </ErrorBoundary>
));

ServicesDashboard.displayName = 'ServicesDashboard';
