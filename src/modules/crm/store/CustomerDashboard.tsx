import { useState, useEffect, useMemo } from 'react';
import { useCrmStore, type Customer } from '../store/useCrmStore';
import Swal from 'sweetalert2';

export const CustomerDashboard = () => {
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, isLoading } = useCrmStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Estados del Formulario
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', notes: '' });

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      notes: customer.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        // ACTUALIZAR
        await updateCustomer(editingCustomer.id, formData);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente actualizado', showConfirmButton: false, timer: 1500 });
      } else {
        // CREAR
        await addCustomer(formData);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente guardado', showConfirmButton: false, timer: 1500 });
      }
      closeForm();
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar los cambios', 'error');
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', company: '', notes: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic">Clientes (CRM)</h1>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Base de datos de contactos</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg">+ NUEVO CLIENTE</button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 space-y-4">
          <h2 className="font-black uppercase text-xs tracking-widest text-blue-600">{editingCustomer ? 'Editar Cliente' : 'Datos del Cliente'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Nombre Completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" />
            <input placeholder="Empresa (Opcional)" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" />
            <input placeholder="WhatsApp (Ej: 221...)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" />
            <input placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500" />
            <textarea placeholder="Notas internas..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="md:col-span-2 p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-blue-500 h-24" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeForm} className="px-6 py-2 font-black text-slate-400 uppercase text-xs">Cancelar</button>
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/30">Guardar Cambios</button>
          </div>
        </form>
      )}

      {/* LISTADO DE CLIENTES */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-72 p-2 px-4 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Contacto</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-black text-sm text-slate-800 uppercase">{c.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{c.company || 'Particular'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs font-bold text-slate-600">{c.phone || '---'}</p>
                    <p className="text-[10px] text-slate-400">{c.email || ''}</p>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-blue-500 font-bold text-xs uppercase">Editar</button>
                      <button onClick={() => {
                        Swal.fire({ title: '¿Borrar cliente?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' })
                        .then(r => r.isConfirmed && deleteCustomer(c.id))
                      }} className="text-slate-300 hover:text-rose-500 font-bold text-xs uppercase">Borrar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};