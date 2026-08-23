import { supabase } from '../../lib/supabase';
import { dataUrlToBlob, imageExtensionFor, isStorageRef } from './designImageRef';

export const DESIGN_BUCKET = 'design-images';

const SIGNED_TTL_S = 3600;
const CACHE_TTL_MS = 45 * 60 * 1000;

const signedCache = new Map<string, { url: string; at: number }>();

/**
 * Convierte cualquier referencia guardada en sublimation_designs.imagen
 * (https URL, data URL o path de storage) en un src mostrable.
 * Los paths se firman on-demand y se cachean ~45 min.
 */
export const resolveImageSrc = async (ref: string | null): Promise<string | null> => {
  if (!ref) return null;
  if (!isStorageRef(ref)) return ref;

  const hit = signedCache.get(ref);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.url;

  const { data, error } = await supabase.storage
    .from(DESIGN_BUCKET)
    .createSignedUrl(ref, SIGNED_TTL_S);
  if (error || !data?.signedUrl) return null;

  signedCache.set(ref, { url: data.signedUrl, at: Date.now() });
  return data.signedUrl;
};

/** Sube un archivo/dataURL al bucket privado y devuelve el path a guardar en DB. */
export const uploadDesignFile = async (
  companyId: string | null | undefined,
  source: Blob | string,
): Promise<string> => {
  const blob = typeof source === 'string' ? dataUrlToBlob(source) : source;
  if (blob.size === 0) throw new Error('El archivo está vacío.');
  const ext = imageExtensionFor(blob.type || 'image/png');
  const path = `${companyId || 'shared'}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(DESIGN_BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/png',
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);
  return path;
};
