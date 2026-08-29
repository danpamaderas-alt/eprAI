import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { Building2, MapPin, Phone, Globe, FileText, Hash, Save, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../shared/types/database.types';

type CompanyRow = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (company: { id: string; name: string }) => void;
  editCompany?: CompanyRow | null;
}

const FISCAL_OPTIONS = [
  { value: 'RI', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CF', label: 'Consumidor Final' },
];

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

const initialState = {
  name: '',
  commercial_name: '',
  tax_id: '',
  fiscal_condition: 'RI',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: '',
  province: 'Buenos Aires',
  postal_code: '',
  notes: '',
};

export const CompanyFormModal = memo(({ isOpen, onClose, onSaved, editCompany }: CompanyFormModalProps) => {
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'fiscal' | 'location' | 'contact'>('general');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editCompany) {
        setForm({
          name: editCompany.name || '',
          commercial_name: editCompany.commercial_name || '',
          tax_id: editCompany.tax_id || '',
          fiscal_condition: editCompany.fiscal_condition || 'RI',
          phone: editCompany.phone || '',
          email: editCompany.email || '',
          website: editCompany.website || '',
          address: editCompany.address || '',
          city: editCompany.city || '',
          province: editCompany.province || 'Buenos Aires',
          postal_code: editCompany.postal_code || '',
          notes: editCompany.notes || '',
        });
      } else {
        setForm(initialState);
      }
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [isOpen, editCompany]);

  const update = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editCompany) {
        const payload: CompanyUpdate = {
          name: form.name.trim().toUpperCase(),
          commercial_name: form.commercial_name.trim() || null,
          tax_id: form.tax_id.trim() || null,
          fiscal_condition: form.fiscal_condition,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          website: form.website.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          province: form.province || null,
          postal_code: form.postal_code.trim() || null,
          notes: form.notes.trim() || null,
        };
        const { error } = await supabase.from('companies').update(payload).eq('id', editCompany.id);
        if (error) throw error;
        onSaved({ id: editCompany.id, name: form.name.trim().toUpperCase() });
      } else {
        const payload: CompanyInsert = {
          name: form.name.trim().toUpperCase(),
          commercial_name: form.commercial_name.trim() || null,
          tax_id: form.tax_id.trim() || null,
          fiscal_condition: form.fiscal_condition,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          website: form.website.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          province: form.province || null,
          postal_code: form.postal_code.trim() || null,
          notes: form.notes.trim() || null,
        };
        const { data, error } = await supabase.from('companies').insert([payload]).select('id, name').single();
        if (error) throw error;
        onSaved(data!);
      }
      Swal.fire({
        icon: 'success',
        title: editCompany ? 'Empresa actualizada' : 'Empresa creada',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#fff',
      });
      onClose();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err instanceof Error ? err.message : 'No se pudo guardar la empresa',
        background: '#0f172a',
        color: '#fff',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, editCompany, onSaved, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building2 },
    { id: 'fiscal' as const, label: 'Fiscal', icon: FileText },
    { id: 'location' as const, label: 'Ubicación', icon: MapPin },
    { id: 'contact' as const, label: 'Contacto', icon: Phone },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black uppercase italic dark:text-white">
                {editCompany ? 'Editar Empresa' : 'Nueva Empresa'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {editCompany ? 'Modifica los datos de la empresa' : 'Configura los datos legales y fiscales'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-5">
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Razón Social *
                </label>
                <input
                  ref={nameRef}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="EJ: RAICES DISEÑOS S.R.L."
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Nombre Comercial
                </label>
                <input
                  value={form.commercial_name}
                  onChange={(e) => update('commercial_name', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="EJ: Raíces Brand"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Notas Internas
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Información adicional sobre la empresa..."
                />
              </div>
            </>
          )}

          {/* Fiscal Tab */}
          {activeTab === 'fiscal' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    CUIT / ID Tributario
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={form.tax_id}
                      onChange={(e) => update('tax_id', e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                      placeholder="30-12345678-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Condición ante IVA
                  </label>
                  <select
                    value={form.fiscal_condition}
                    onChange={(e) => update('fiscal_condition', e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white font-bold"
                  >
                    {FISCAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  Condición fiscal: {FISCAL_OPTIONS.find((o) => o.value === form.fiscal_condition)?.label}
                </p>
                <p className="text-[9px] text-blue-500/70 mt-1">
                  {form.fiscal_condition === 'RI' && 'Responsable Inscripto: IVA débito fiscal y crédito fiscal.'}
                  {form.fiscal_condition === 'MONOTRIBUTO' && 'Monotributo: cuota fija mensual, sin IVA.'}
                  {form.fiscal_condition === 'EXENTO' && 'Exento: no genera ni admite IVA.'}
                  {form.fiscal_condition === 'CF' && 'Consumidor Final: sin facturación fiscal.'}
                </p>
              </div>
            </>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Dirección
                </label>
                <input
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Av. Corrientes 1234, Piso 5"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Ciudad
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="CABA"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Provincia
                  </label>
                  <select
                    value={form.province}
                    onChange={(e) => update('province', e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white font-bold text-sm"
                  >
                    {PROVINCIAS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Cód. Postal
                  </label>
                  <input
                    value={form.postal_code}
                    onChange={(e) => update('postal_code', e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="C1043"
                  />
                </div>
              </div>
            </>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="+54 11 1234-5678"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="info@raices.com.ar"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Sitio Web
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.raices.com.ar"
                  />
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="p-8 pt-0 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !form.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-colors transition-transform disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : editCompany ? 'Actualizar Empresa' : 'Crear Empresa'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
});

CompanyFormModal.displayName = 'CompanyFormModal';
