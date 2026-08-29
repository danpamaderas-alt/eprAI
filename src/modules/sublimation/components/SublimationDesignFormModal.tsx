import { useState, type FormEvent } from 'react';
import {
  Link2,
  Image as ImageIcon,
  Wand2,
  Loader2,
  Palette,
  FileType2,
  BadgeCheck,
  Coins,
  User,
  Tag,
  StickyNote,
  Upload,
} from 'lucide-react';
import { Modal, FormField } from '../../../shared/components/ui/Modal';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { useImageSrc } from '../../../shared/hooks/useImageSrc';
import { isStorageRef } from '../../../shared/utils/designImageRef';
import { uploadDesignFile } from '../../../shared/utils/designStorage';
import { useToastStore } from '../../../store/useToastStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { useTenantStore } from '../../../store/useTenantStore';
import { useSublimationStore } from '../store/useSublimationStore';
import {
  DEFAULT_CATEGORIES,
  DOWNLOAD_PLATFORMS,
  FILE_FORMATS,
  BACKGROUNDS,
  PROJECT_DESTINATIONS,
  LICENSE_TYPES,
  POD_LEVELS,
  ORIGINS,
  CURRENCIES,
  SUBLIMATION_STATUS_OPTIONS,
  type SublimationDesign,
  type SublimationDesignInput,
} from '../types';

interface SublimationDesignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDesign?: SublimationDesign | null;
}

const toNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const buildInitialForm = (editingDesign?: SublimationDesign | null): SublimationDesignInput =>
  editingDesign
    ? {
        name: editingDesign.name,
        category: editingDesign.category ?? 'General',
        status: editingDesign.status ?? 'Nuevo',
        platform: editingDesign.platform ?? '',
        url_original: editingDesign.url_original ?? '',
        link_descarga: editingDesign.link_descarga ?? '',
        imagen: editingDesign.imagen ?? '',
        file_format: editingDesign.file_format ?? '',
        background: editingDesign.background ?? '',
        dpi: editingDesign.dpi ?? null,
        dimensions: editingDesign.dimensions ?? '',
        file_size_mb: editingDesign.file_size_mb ?? null,
        bundle_count: editingDesign.bundle_count ?? null,
        project_dest: editingDesign.project_dest ?? '',
        license_type: editingDesign.license_type ?? '',
        pod_permitido: editingDesign.pod_permitido ?? false,
        pod_nivel: editingDesign.pod_nivel ?? '',
        ventas_limit: editingDesign.ventas_limit ?? null,
        atribucion_requerida: editingDesign.atribucion_requerida ?? false,
        license_file: editingDesign.license_file ?? '',
        license_date: editingDesign.license_date ?? '',
        price: editingDesign.price ?? null,
        currency: editingDesign.currency ?? '',
        designer: editingDesign.designer ?? '',
        origin: editingDesign.origin ?? '',
        purchase_date: editingDesign.purchase_date ?? '',
        tags: editingDesign.tags ?? '',
        description: editingDesign.description ?? '',
        notes: editingDesign.notes ?? '',
      }
    : {
        name: '',
        category: 'General',
        status: 'Nuevo',
        platform: '',
        url_original: '',
        link_descarga: '',
        imagen: '',
        file_format: '',
        background: '',
        dpi: null,
        dimensions: '',
        file_size_mb: null,
        bundle_count: null,
        project_dest: '',
        license_type: '',
        pod_permitido: false,
        pod_nivel: '',
        ventas_limit: null,
        atribucion_requerida: false,
        license_file: '',
        license_date: '',
        price: null,
        currency: '',
        designer: '',
        origin: '',
        purchase_date: '',
        tags: '',
        description: '',
        notes: '',
      };

export function SublimationDesignFormModal({
  isOpen,
  onClose,
  editingDesign,
}: SublimationDesignFormModalProps) {
  const toast = useToastStore((s) => s.toast);
  const addDesign = useSublimationStore((s) => s.addDesign);
  const updateDesign = useSublimationStore((s) => s.updateDesign);
  const session = useAuthStore((s) => s.session);

  const [form, setForm] = useState<SublimationDesignInput>(() =>
    buildInitialForm(editingDesign),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const activeCompanyId = useTenantStore((s) => s.activeCompanyId);
  const previewSrc = useImageSrc(form.imagen ?? null);

  const handleUploadImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('El archivo debe ser una imagen.', { type: 'error' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('La imagen no puede superar los 10 MB.', { type: 'error' });
      return;
    }
    setIsUploading(true);
    try {
      const path = await uploadDesignFile(activeCompanyId, file);
      set('imagen', path);
      toast('Imagen subida a la nube', { type: 'success' });
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'No se pudo subir la imagen.', {
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const set = <K extends keyof SublimationDesignInput>(key: K, value: SublimationDesignInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleScrape = async () => {
    const link = form.url_original?.trim() || form.link_descarga?.trim();
    if (!link) {
      setError('Pegá primero el link del diseño para autocompletar.');
      return;
    }

    setError(null);
    setIsScraping(true);
    try {
      const response = await fetch('/api/scrape-sublimation', {
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
        platform?: string;
        imagen?: string;
        description?: string;
        designer?: string;
        price?: number | null;
        currency?: string;
      };

      const next: SublimationDesignInput = { ...form };
      if (result.name) next.name = result.name;
      if (result.platform) next.platform = result.platform;
      if (result.imagen) next.imagen = result.imagen;
      if (result.description) next.description = result.description;
      if (result.designer) next.designer = result.designer;
      if (result.price != null) next.price = result.price;
      if (result.currency) next.currency = result.currency;
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
      setError('El nombre del diseño es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingDesign) {
        await updateDesign(editingDesign.id, form);
        toast('Diseño actualizado correctamente', { type: 'success' });
      } else {
        await addDesign(form);
        toast('Diseño agregado al repositorio', { type: 'success' });
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el diseño.';
      setError(message);
      toast('Error al guardar el diseño', { type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const setDate = (key: 'license_date' | 'purchase_date', value: string) => {
    if (value.trim() === '') {
      set(key, null);
      return;
    }
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) set(key, d.toISOString());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDesign ? 'Editar Diseño de Sublimación' : 'Nuevo Diseño de Sublimación'}
      onSubmit={handleSubmit}
      submitLabel={isSaving ? 'Guardando...' : editingDesign ? 'Guardar Cambios' : 'Crear Diseño'}
      width="max-w-3xl"
    >
      {/* IDENTIFICACIÓN */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-500">
        <Palette className="w-3.5 h-3.5" aria-hidden="true" />
        Identificación
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FormField label="Nombre del diseño *">
            <Input
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Taza Día de la Madre – Flork rosa"
            />
          </FormField>
        </div>

        <FormField label="Categoría / Tema">
          <Select
            value={form.category ?? 'General'}
            onChange={(e) => set('category', e.target.value)}
            options={DEFAULT_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </FormField>

        <FormField label="Estado">
          <Select
            value={form.status ?? 'Nuevo'}
            onChange={(e) => set('status', e.target.value)}
            options={SUBLIMATION_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
        </FormField>

        <FormField label="Plataforma">
          <Select
            value={form.platform ?? ''}
            onChange={(e) => set('platform', e.target.value)}
            placeholder="Seleccionar plataforma"
            options={DOWNLOAD_PLATFORMS.map((p) => ({ value: p, label: p }))}
          />
        </FormField>

        <FormField label="Proyecto destino">
          <Select
            value={form.project_dest ?? ''}
            onChange={(e) => set('project_dest', e.target.value)}
            placeholder="Taza, tumbler, camiseta..."
            options={PROJECT_DESTINATIONS.map((p) => ({ value: p, label: p }))}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Link del diseño (Creative Fabrica, Etsy, Design Bundles...)">
            <div className="flex gap-2 items-stretch">
              <div className="flex-1">
                <Input
                  icon={<Link2 className="w-4 h-4" />}
                  value={form.url_original ?? ''}
                  onChange={(e) => set('url_original', e.target.value)}
                  placeholder="https://www.etsy.com/listing/..."
                />
              </div>
              <button
                type="button"
                onClick={handleScrape}
                disabled={isScraping || isSaving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-fuchsia-600/25 transition-colors transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
              Extrae nombre, plataforma, imagen, descripción, autor y precio automáticamente.
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
            <div className="flex items-center gap-2 mt-2">
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-600/10 hover:bg-fuchsia-600/20 text-fuchsia-600 dark:text-fuchsia-400 text-[10px] font-black uppercase tracking-widest transition-colors ${isUploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {isUploading ? 'Subiendo...' : 'Subir archivo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void handleUploadImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              {isStorageRef(form.imagen) && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">
                  Imagen en la nube
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
              Pegá una URL o subí el archivo: queda guardado en Supabase Storage.
            </p>
          </FormField>
        </div>

        <FormField label="Descripción">
          <Input
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Breve descripción del diseño"
          />
        </FormField>

        <FormField label="Etiquetas (separadas por coma)">
          <Input
            icon={<Tag className="w-4 h-4" />}
            value={form.tags ?? ''}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="retro, boho, fútbol argentino"
          />
        </FormField>
      </div>

      {/* FORMATO TÉCNICO */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-500 pt-2">
        <FileType2 className="w-3.5 h-3.5" aria-hidden="true" />
        Formato técnico
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Formato de archivo">
          <Select
            value={form.file_format ?? ''}
            onChange={(e) => set('file_format', e.target.value)}
            placeholder="SVG, PNG, PNG en capas..."
            options={FILE_FORMATS.map((f) => ({ value: f, label: f }))}
          />
        </FormField>

        <FormField label="Fondo">
          <Select
            value={form.background ?? ''}
            onChange={(e) => set('background', e.target.value)}
            placeholder="Transparente / con fondo"
            options={BACKGROUNDS.map((b) => ({ value: b, label: b }))}
          />
        </FormField>

        <FormField label="Resolución (DPI)">
          <Input
            type="number"
            step="1"
            min="72"
            value={form.dpi ?? ''}
            onChange={(e) => set('dpi', toNumber(e.target.value))}
            placeholder="300"
          />
        </FormField>

        <FormField label="Dimensiones (px)">
          <Input
            value={form.dimensions ?? ''}
            onChange={(e) => set('dimensions', e.target.value)}
            placeholder="2493x1122"
          />
        </FormField>

        <FormField label="Tamaño del archivo (MB)">
          <Input
            type="number"
            step="0.1"
            min="0"
            value={form.file_size_mb ?? ''}
            onChange={(e) => set('file_size_mb', toNumber(e.target.value))}
            placeholder="2.4"
          />
        </FormField>

        <FormField label="Cantidad de diseños (si es bundle)">
          <Input
            type="number"
            step="1"
            min="1"
            value={form.bundle_count ?? ''}
            onChange={(e) => set('bundle_count', toNumber(e.target.value))}
            placeholder="25"
          />
        </FormField>
      </div>

      {/* LICENCIA */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-500 pt-2">
        <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
        Licencia
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Tipo de licencia">
          <Select
            value={form.license_type ?? ''}
            onChange={(e) => set('license_type', e.target.value)}
            placeholder="Personal / Comercial / POD"
            options={LICENSE_TYPES.map((l) => ({ value: l, label: l }))}
          />
        </FormField>

        <FormField label="Nivel POD">
          <Select
            value={form.pod_nivel ?? ''}
            onChange={(e) => set('pod_nivel', e.target.value)}
            placeholder="Básico / Completo"
            options={POD_LEVELS.map((l) => ({ value: l, label: l }))}
          />
        </FormField>

        <label className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.pod_permitido === true}
            onChange={(e) => set('pod_permitido', e.target.checked)}
            className="w-4 h-4 accent-fuchsia-600"
          />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            POD permitido (print on demand)
          </span>
        </label>

        <label className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.atribucion_requerida === true}
            onChange={(e) => set('atribucion_requerida', e.target.checked)}
            className="w-4 h-4 accent-fuchsia-600"
          />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Requiere atribución
          </span>
        </label>

        <FormField label="Tope de ventas (unidades)">
          <Input
            type="number"
            step="1"
            min="0"
            value={form.ventas_limit ?? ''}
            onChange={(e) => set('ventas_limit', toNumber(e.target.value))}
            placeholder="1000"
          />
        </FormField>

        <FormField label="Fecha de licencia">
          <Input
            type="date"
            value={
              form.license_date
                ? new Date(form.license_date).toISOString().split('T')[0]
                : ''
            }
            onChange={(e) => setDate('license_date', e.target.value)}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Archivo de licencia (URL)">
            <Input
              icon={<BadgeCheck className="w-4 h-4" />}
              value={form.license_file ?? ''}
              onChange={(e) => set('license_file', e.target.value)}
              placeholder="https://drive.google.com/.../licencia.pdf"
            />
          </FormField>
        </div>
      </div>

      {/* COMERCIAL */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-500 pt-2">
        <Coins className="w-3.5 h-3.5" aria-hidden="true" />
        Origen y costo
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Origen">
          <Select
            value={form.origin ?? ''}
            onChange={(e) => set('origin', e.target.value)}
            placeholder="Comprado / Gratis / Suscripción"
            options={ORIGINS.map((o) => ({ value: o, label: o }))}
          />
        </FormField>

        <FormField label="Diseñador / Autor">
          <Input
            icon={<User className="w-4 h-4" />}
            value={form.designer ?? ''}
            onChange={(e) => set('designer', e.target.value)}
            placeholder="Nombre del vendedor/a"
          />
        </FormField>

        <FormField label="Precio">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.price ?? ''}
            onChange={(e) => set('price', toNumber(e.target.value))}
            placeholder="3.50"
          />
        </FormField>

        <FormField label="Moneda">
          <Select
            value={form.currency ?? ''}
            onChange={(e) => set('currency', e.target.value)}
            placeholder="ARS / USD / EUR..."
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
        </FormField>

        <FormField label="Fecha de compra">
          <Input
            type="date"
            value={
              form.purchase_date
                ? new Date(form.purchase_date).toISOString().split('T')[0]
                : ''
            }
            onChange={(e) => setDate('purchase_date', e.target.value)}
          />
        </FormField>
      </div>

      {/* NOTAS */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-500 pt-2">
        <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
        Notas
      </div>
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Notas internas">
          <Input
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Observaciones de uso, color de fondo, etc."
          />
        </FormField>
      </div>

      {previewSrc && (
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <img
            src={previewSrc}
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