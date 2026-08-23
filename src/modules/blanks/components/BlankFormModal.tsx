import { useState, type FormEvent } from 'react';
import { Modal, FormField } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { useToastStore } from '../../../store/useToastStore';
import { useBlankStore } from '../store/useBlankStore';
import { BLANK_TYPES, type TextileBlank, type TextileBlankInput } from '../types';

interface BlankFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBlank?: TextileBlank | null;
}

const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const buildInitialForm = (editing?: TextileBlank | null): TextileBlankInput =>
  editing
    ? {
        name: editing.name,
        type: editing.type ?? 'Otro',
        size: editing.size ?? '',
        color: editing.color ?? '',
        provider: editing.provider ?? '',
        cost_price: editing.cost_price ?? 0,
        stock_qty: editing.stock_qty ?? 0,
        min_stock: editing.min_stock ?? 0,
        imagen: editing.imagen ?? '',
        notes: editing.notes ?? '',
      }
    : {
        name: '',
        type: 'Taza',
        size: '',
        color: '',
        provider: '',
        cost_price: 0,
        stock_qty: 0,
        min_stock: 0,
        imagen: '',
        notes: '',
      };

export function BlankFormModal({ isOpen, onClose, editingBlank }: BlankFormModalProps) {
  const toast = useToastStore((s) => s.toast);
  const addBlank = useBlankStore((s) => s.addBlank);
  const updateBlank = useBlankStore((s) => s.updateBlank);

  const [form, setForm] = useState<TextileBlankInput>(() => buildInitialForm(editingBlank));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof TextileBlankInput>(key: K, value: TextileBlankInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name?.trim()) {
      setError('El nombre del blank es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBlank) {
        await updateBlank(editingBlank.id, form);
        toast('Blank actualizado correctamente', { type: 'success' });
      } else {
        await addBlank(form);
        toast('Blank agregado al inventario', { type: 'success' });
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el blank.';
      setError(message);
      toast('Error al guardar el blank', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBlank ? 'Editar Blank' : 'Nuevo Blank'}
      onSubmit={handleSubmit}
      submitLabel={isSaving ? 'Guardando...' : editingBlank ? 'Guardar Cambios' : 'Crear Blank'}
      width="max-w-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FormField label="Nombre del blank *">
            <Input
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Taza polímera blanca AAA"
            />
          </FormField>
        </div>

        <FormField label="Tipo">
          <Select
            value={form.type ?? 'Taza'}
            onChange={(e) => set('type', e.target.value)}
            options={BLANK_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </FormField>

        <FormField label="Talle / Medida">
          <Input
            value={form.size ?? ''}
            onChange={(e) => set('size', e.target.value)}
            placeholder="Ej: 11oz, M, 20oz, 40×40cm"
          />
        </FormField>

        <FormField label="Color">
          <Input
            value={form.color ?? ''}
            onChange={(e) => set('color', e.target.value)}
            placeholder="Ej: Blanco, Negro"
          />
        </FormField>

        <FormField label="Proveedor">
          <Input
            value={form.provider ?? ''}
            onChange={(e) => set('provider', e.target.value)}
            placeholder="Ej: Distribuidora local"
          />
        </FormField>

        <FormField label="Costo unitario ($)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.cost_price ?? 0}
            onChange={(e) => set('cost_price', toNumber(e.target.value) ?? 0)}
            placeholder="850"
          />
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
            Se usa como costo real en presupuestos y pedidos.
          </p>
        </FormField>

        <FormField label="Stock actual (unidades)">
          <Input
            type="number"
            step="1"
            min="0"
            value={form.stock_qty ?? 0}
            onChange={(e) => set('stock_qty', toNumber(e.target.value) ?? 0)}
            placeholder="24"
          />
        </FormField>

        <FormField label="Stock mínimo — aviso de reposición">
          <Input
            type="number"
            step="1"
            min="0"
            value={form.min_stock ?? 0}
            onChange={(e) => set('min_stock', toNumber(e.target.value) ?? 0)}
            placeholder="6"
          />
        </FormField>

        <FormField label="Imagen (URL opcional)">
          <Input
            value={form.imagen ?? ''}
            onChange={(e) => set('imagen', e.target.value)}
            placeholder="https://.../taza.png"
          />
        </FormField>

        <FormField label="Notas">
          <Input
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Observaciones..."
          />
        </FormField>
      </div>

      {error && (
        <p className="text-[10px] text-danger-600 font-bold uppercase tracking-wider">{error}</p>
      )}
    </Modal>
  );
}
