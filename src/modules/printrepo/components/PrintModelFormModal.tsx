import { useState, type FormEvent } from 'react';
import { Link2, Image as ImageIcon, Wand2, Loader2 } from 'lucide-react';
import { Modal, FormField } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { useToastStore } from '../../../store/useToastStore';
import { usePrintModelStore } from '../store/usePrintModelStore';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  DEFAULT_CATEGORIES,
  PRINT_STATUS_OPTIONS,
  type PrintModel,
  type PrintModelInput,
} from '../types';

interface PrintModelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingModel?: PrintModel | null;
}

const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const buildInitialForm = (editingModel?: PrintModel | null): PrintModelInput =>
  editingModel
    ? {
        name: editingModel.name,
        category: editingModel.category ?? 'General',
        status: editingModel.status ?? 'Idea',
        link_descarga: editingModel.link_descarga ?? '',
        imagen: editingModel.imagen ?? '',
        material: editingModel.material ?? '',
        layer_height: editingModel.layer_height ?? null,
        infill: editingModel.infill ?? null,
        estimated_time_hours: editingModel.estimated_time_hours ?? null,
        estimated_grams: editingModel.estimated_grams ?? null,
      }
    : {
        name: '',
        category: 'General',
        status: 'Idea',
        link_descarga: '',
        imagen: '',
        material: '',
        layer_height: null,
        infill: null,
        estimated_time_hours: null,
        estimated_grams: null,
      };

export function PrintModelFormModal({
  isOpen,
  onClose,
  editingModel,
}: PrintModelFormModalProps) {
  const toast = useToastStore((s) => s.toast);
  const addModel = usePrintModelStore((s) => s.addModel);
  const updateModel = usePrintModelStore((s) => s.updateModel);
  const session = useAuthStore((s) => s.session);

  const [form, setForm] = useState<PrintModelInput>(() => buildInitialForm(editingModel));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  const set = <K extends keyof PrintModelInput>(key: K, value: PrintModelInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleScrape = async () => {
    const link = form.link_descarga?.trim();
    if (!link) {
      setError('Pegá primero el link de descarga para autocompletar.');
      return;
    }

    setError(null);
    setIsScraping(true);
    try {
      const response = await fetch('/api/scrape-3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ url: link }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error ?? `No se pudo extraer la información (código ${response.status}).`,
        );
      }

      const result = (await response.json()) as {
        name?: string;
        category?: string;
        material?: string;
        layer_height?: number | null;
        infill?: number | null;
        estimated_time_hours?: number | null;
        estimated_grams?: number | null;
        imagen?: string;
      };

      const next: PrintModelInput = { ...form };
      if (result.name) next.name = result.name;
      if (result.category) next.category = result.category;
      if (result.material) next.material = result.material;
      if (result.layer_height != null) next.layer_height = result.layer_height;
      if (result.infill != null) next.infill = result.infill;
      if (result.estimated_time_hours != null)
        next.estimated_time_hours = result.estimated_time_hours;
      if (result.estimated_grams != null) next.estimated_grams = result.estimated_grams;
      if (result.imagen) next.imagen = result.imagen;
      setForm(next);

      toast('Datos extraídos del enlace. Revisá y guardá.', { type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo extraer la información.';
      setError(message);
      toast('Error al extraer datos del enlace', { type: 'error' });
    } finally {
      setIsScraping(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name?.trim()) {
      setError('El nombre del modelo es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingModel) {
        await updateModel(editingModel.id, form);
        toast('Modelo actualizado correctamente', { type: 'success' });
      } else {
        await addModel(form);
        toast('Modelo agregado al repositorio', { type: 'success' });
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el modelo.';
      setError(message);
      toast('Error al guardar el modelo', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingModel ? 'Editar Modelo 3D' : 'Nuevo Modelo 3D'}
      onSubmit={handleSubmit}
      submitLabel={isSaving ? 'Guardando...' : editingModel ? 'Guardar Cambios' : 'Crear Modelo'}
      width="max-w-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FormField label="Nombre del modelo *">
            <Input
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Organizador hexagonal Parametric"
            />
          </FormField>
        </div>

        <FormField label="Categoría">
          <Select
            value={form.category ?? 'General'}
            onChange={(e) => set('category', e.target.value)}
            options={DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </FormField>

        <FormField label="Estado">
          <Select
            value={form.status ?? 'Idea'}
            onChange={(e) => set('status', e.target.value)}
            options={PRINT_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Link de descarga (MakerWorld, Thingiverse, Cults3D...)">
            <div className="flex gap-2 items-stretch">
              <div className="flex-1">
                <Input
                  icon={<Link2 className="w-4 h-4" />}
                  value={form.link_descarga ?? ''}
                  onChange={(e) => set('link_descarga', e.target.value)}
                  placeholder="https://makerworld.com/..."
                />
              </div>
              <button
                type="button"
                onClick={handleScrape}
                disabled={isScraping || isSaving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-600/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isScraping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {isScraping ? 'Extrayendo...' : 'Autocompletar'}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
              Extrae peso, material, tiempo, capa e infill automáticamente.
            </p>
          </FormField>
        </div>

        <div className="md:col-span-2">
          <FormField label="Imagen (URL de previsualización)">
            <Input
              icon={<ImageIcon className="w-4 h-4" />}
              value={form.imagen ?? ''}
              onChange={(e) => set('imagen', e.target.value)}
              placeholder="https://.../preview.png"
            />
          </FormField>
        </div>

        <FormField label="Material / Filamento">
          <Input
            value={form.material ?? ''}
            onChange={(e) => set('material', e.target.value)}
            placeholder="Ej: PLA, PETG, ABS, TPU"
          />
        </FormField>

        <FormField label="Altura de capa (mm)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.layer_height ?? ''}
            onChange={(e) => set('layer_height', toNumber(e.target.value))}
            placeholder="0.20"
          />
        </FormField>

        <FormField label="Relleno / Infill (%)">
          <Input
            type="number"
            step="1"
            min="0"
            max="100"
            value={form.infill ?? ''}
            onChange={(e) => set('infill', toNumber(e.target.value))}
            placeholder="20"
          />
        </FormField>

        <FormField label="Tiempo estimado (horas)">
          <Input
            type="number"
            step="0.5"
            min="0"
            value={form.estimated_time_hours ?? ''}
            onChange={(e) => set('estimated_time_hours', toNumber(e.target.value))}
            placeholder="4.5"
          />
        </FormField>

        <FormField label="Gramos estimados (g)">
          <Input
            type="number"
            step="1"
            min="0"
            value={form.estimated_grams ?? ''}
            onChange={(e) => set('estimated_grams', toNumber(e.target.value))}
            placeholder="35"
          />
        </FormField>
      </div>

      {form.imagen && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <img
            src={form.imagen}
            alt="Previsualización"
            className="w-full max-h-40 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {error && (
        <p className="text-[10px] text-danger-600 font-bold uppercase tracking-wider">
          {error}
        </p>
      )}
    </Modal>
  );
}