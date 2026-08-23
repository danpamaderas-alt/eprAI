import { useState, type FormEvent } from 'react';
import { Modal, FormField } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { useToastStore } from '../../../store/useToastStore';
import { useMockupTemplateStore } from '../store/useMockupTemplateStore';
import { TEMPLATE_PRODUCT_TYPES, type MockupTemplate, type MockupTemplateInput } from '../types';

interface MockupTemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate?: MockupTemplate | null;
}

const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const buildInitialForm = (editing?: MockupTemplate | null): MockupTemplateInput =>
  editing
    ? {
        name: editing.name,
        product_type: editing.product_type ?? 'Otro',
        print_area_width_mm: editing.print_area_width_mm ?? null,
        print_area_height_mm: editing.print_area_height_mm ?? null,
        template_image: editing.template_image ?? '',
        notes: editing.notes ?? '',
      }
    : {
        name: '',
        product_type: 'Taza',
        print_area_width_mm: null,
        print_area_height_mm: null,
        template_image: '',
        notes: '',
      };

export function MockupTemplateFormModal({
  isOpen,
  onClose,
  editingTemplate,
}: MockupTemplateFormModalProps) {
  const toast = useToastStore((s) => s.toast);
  const addTemplate = useMockupTemplateStore((s) => s.addTemplate);
  const updateTemplate = useMockupTemplateStore((s) => s.updateTemplate);

  const [form, setForm] = useState<MockupTemplateInput>(() => buildInitialForm(editingTemplate));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof MockupTemplateInput>(key: K, value: MockupTemplateInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name?.trim()) {
      setError('El nombre de la plantilla es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, form);
        toast('Plantilla actualizada correctamente', { type: 'success' });
      } else {
        await addTemplate(form);
        toast('Plantilla agregada', { type: 'success' });
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la plantilla.';
      setError(message);
      toast('Error al guardar la plantilla', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla de Mockup'}
      onSubmit={handleSubmit}
      submitLabel={isSaving ? 'Guardando...' : editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
      width="max-w-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FormField label="Nombre de la plantilla *">
            <Input
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Taza 11oz — vista frontal"
            />
          </FormField>
        </div>

        <FormField label="Tipo de producto">
          <Select
            value={form.product_type ?? 'Taza'}
            onChange={(e) => set('product_type', e.target.value)}
            options={TEMPLATE_PRODUCT_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </FormField>

        <FormField label="Imagen base (URL)">
          <Input
            value={form.template_image ?? ''}
            onChange={(e) => set('template_image', e.target.value)}
            placeholder="https://.../base-taza.png"
          />
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
            Foto del producto virgen sin diseño, idealmente con fondo parejo.
          </p>
        </FormField>

        <FormField label="Ancho del área imprimible (mm)">
          <Input
            type="number"
            step="0.1"
            min="0"
            value={form.print_area_width_mm ?? ''}
            onChange={(e) => set('print_area_width_mm', toNumber(e.target.value))}
            placeholder="205"
          />
        </FormField>

        <FormField label="Alto del área imprimible (mm)">
          <Input
            type="number"
            step="0.1"
            min="0"
            value={form.print_area_height_mm ?? ''}
            onChange={(e) => set('print_area_height_mm', toNumber(e.target.value))}
            placeholder="90"
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Notas">
            <Input
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Márgenes de seguridad, posición de la asa, etc."
            />
          </FormField>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-danger-600 font-bold uppercase tracking-wider">{error}</p>
      )}
    </Modal>
  );
}
