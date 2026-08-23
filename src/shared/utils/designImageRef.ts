export const isDataUrl = (ref: string | null | undefined): boolean =>
  !!ref && ref.startsWith('data:');

/**
 * Un path de Supabase Storage tiene forma "{company_id}/{uuid}.{ext}".
 * Los valores legacy (http(s):// o data:) no se consideran refs de storage.
 */
export const isStorageRef = (ref: string | null | undefined): ref is string =>
  !!ref && !ref.startsWith('data:') && !/^https?:\/\//i.test(ref) && ref.includes('/');

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const commaIdx = dataUrl.indexOf(',');
  const meta = dataUrl.slice(5, commaIdx);
  const mime = meta.split(';')[0] || 'image/png';
  const b64 = dataUrl.slice(commaIdx + 1).replace(/\s/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export const imageExtensionFor = (mime: string): string => EXT_BY_MIME[mime] ?? 'png';
