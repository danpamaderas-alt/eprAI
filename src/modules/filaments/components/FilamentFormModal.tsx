import { useState, type FormEvent } from 'react';
import { Modal, FormField } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { useToastStore } from '../../../store/useToastStore';
import { useFilamentStore } from '../store/useFilamentStore';
import {
  COLOR_PRESETS,
  FILAMENT_MATERIALS,
  type PrintFilament,
  type PrintFilamentInput,
} from '../types';

interface FilamentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingFilament?: PrintFilament | null;
}

const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const buildInitialForm = (editing?: PrintFilament | null): PrintFilamentInput =>
  editing
    ? {
        brand: editing.brand,
        material: editing.material ?? 'PLA',
        color_name: editing.color_name ?? '',
        color_hex: editing.color_hex ?? '#64748b',
        spool_weight_g: editing.spool_weight_g ?? 1000,
        remaining_g: editing.remaining_g ?? 1000,
        cost_per_kg: editing.cost_per_kg ?? null,
        min_stock_g: editing.min_stock_g ?? 200,
        provider: editing.provider ?? '',
        notes: editing.notes ?? '',
      }
    : {
        brand: '',
        material: 'PLA',
        color_name: '',
        color_hex: '#64748b',
        spool_weight_g: 1000,
        remaining_g: 1000,
        cost_per_kg: null,
        min_stock_g: 200,
        provider: '',
        notes: '',
      };

export function FilamentFormModal({ isOpen, onClose, editingFilament }: FilamentFormModalProps) {
  const toast = useToastStore((s) => s.toast);
  const addFilament = useFilamentStore((s) => s.addFilament);
  const updateFilament = useFilamentStore((s) => s.updateFilament);

  const [form, setForm] = useState<PrintFilamentInput>(() => buildInitialForm(editingFilament));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof PrintFilamentInput>(key: K, value: PrintFilamentInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.brand?.trim()) {
      setError('La marca del filamento es obligatoria.');
      return;
    }
    if ((form.remaining_g ?? 0) > (form.spool_weight_g || 1000)) {
      setError('El stock restante no puede superar el peso del rollo.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingFilament) {
        await updateFilament(editingFilament.id, form);
        toast('Filamento actualizado correctamente', { type: 'success' });
      } else {
        await addFilament(form);
        toast('Filamento agregado al inventario', { type: 'success' });
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el filamento.';
      setError(message);
      toast('Error al guardar el filamento', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingFilament ? 'Editar Filamento' : 'Nuevo Filamento'}
      onSubmit={handleSubmit}
      submitLabel={isSaving ? 'Guardando...' : editingFilament ? 'Guardar Cambios' : 'Crear Filamento'}
      width="max-w-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Marca *">
          <Input
            value={form.brand ?? ''}
            onChange={(e) => set('brand', e.target.value)}
            placeholder="Ej: Grilon3, Sunlu, Bambu"
          />
        </FormField>

        <FormField label="Material">
          <Select
            value={form.material ?? 'PLA'}
            onChange={(e) => set('material', e.target.value)}
            options={FILAMENT_MATERIALS.map((m) => ({ value: m, label: m }))}
          />
        </FormField>

        <FormField label="Nombre del color">
          <Input
            value={form.color_name ?? ''}
            onChange={(e) => set('color_name', e.target.value)}
            placeholder="Ej: Rojo cereza"
          />
        </FormField>

        <FormField label="Color de referencia">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="color"
              value={form.color_hex || '#64748b'}
              onChange={(e) => set('color_hex', e.target.value)}
              aria-label="Elegir color exacto"
              className="w-12 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer p-1"
            />
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_PRESETS.slice(0, 8).map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    set('color_hex', c.hex);
                    if (!form.color_name) set('color_name', c.name);
                  }}
                  aria-label={`Usar color ${c.name}`}
                  className="w-6 h-6 rounded-lg border-2 border-white dark:border-slate-700 shadow hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </FormField>

        <FormField label="Peso total del rollo (g)">
          <Input
            type="number"
            step="1"
            min="1"
            value={form.spool_weight_g ?? 1000}
            onChange={(e) => set('spool_weight_g', toNumber(e.target.value) ?? 1000)}
            placeholder="1000"
          />
        </FormField>

        <FormField label="Stock restante (g)">
          <Input
            type="number"
            step="1"
            min="0"
            value={form.remaining_g ?? 0}
            onChange={(e) => set('remaining_g', toNumber(e.target.value) ?? 0)}
            placeholder="850"
          />
        </FormField>

        <FormField label="Costo por kg ($)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.cost_per_kg ?? ''}
            onChange={(e) => set('cost_per_kg', toNumber(e.target.value))}
            placeholder="18000"
          />
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
            La calculadora 3D usa este valor como costo real por gramo.
          </p>
        </FormField>

        <FormField label="Stock mínimo (g) — aviso de reposición">
          <Input
            type="number"
            step="1"
            min="0"
            value={form.min_stock_g ?? 200}
            onChange={(e) => set('min_stock_g', toNumber(e.target.value) ?? 0)}
            placeholder="200"
          />
        </FormField>

        <FormField label="Proveedor">
          <Input
            value={form.provider ?? ''}
            onChange={(e) => set('provider', e.target.value)}
            placeholder="Ej: Tienda local, MercadoLibre"
          />
        </FormField>

        <FormField label="Notas">
          <Input
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Temperatura ideal, observaciones..."
          />
        </FormField>
      </div>

      {error && (
        <p className="text-[10px] text-danger-600 font-bold uppercase tracking-wider">{error}</p>
      )}
    </Modal>
  );
}
