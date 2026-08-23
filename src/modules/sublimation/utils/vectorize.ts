import ImageTracer from 'imagetracerjs';

export interface VectorizeOptions {
  colors: number;
}

const MAX_SIDE = 1200;

export const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    img.src = src;
  });

/**
 * Convierte una imagen rasterizada a SVG trazando sus colores.
 * El trazado pesado corre en un Web Worker para no congelar la UI;
 * si el worker no está disponible, cae al hilo principal.
 * La imagen se procesa localmente en el navegador (no sale al servidor).
 * Lanza error de CORS si la imagen remota no permite lectura de píxeles:
 * en ese caso conviene descargar la imagen y subirla como archivo local.
 */
export const vectorizeImage = async (
  src: string,
  options?: Partial<VectorizeOptions>,
): Promise<string> => {
  const img = await loadImageElement(src);

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('El navegador no permite procesar el lienzo.');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let imgd: ImageData;
  try {
    imgd = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    throw new Error(
      'La imagen no permite procesamiento directo por su origen (CORS). Descargala y volvé a subirla como archivo.',
    );
  }

  const traceOptions = {
    numberofcolors: options?.colors ?? 16,
    colorsampling: 2,
    mincolorratio: 0,
    colorquantcycles: 3,
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    scale: scale > 0 ? 1 / scale : 1,
  };

  return new Promise<string>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL('../workers/vectorize.worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch {
      resolve(ImageTracer.imagedataToSVG(imgd, traceOptions));
      return;
    }

    worker.onmessage = (e: MessageEvent<{ ok: boolean; svg?: string; error?: string }>) => {
      worker.terminate();
      if (e.data?.ok && e.data.svg) resolve(e.data.svg);
      else reject(new Error(e.data?.error || 'Fallo la vectorización.'));
    };
    worker.onerror = () => {
      worker.terminate();
      resolve(ImageTracer.imagedataToSVG(imgd, traceOptions));
    };
    const transferBuffer = imgd.data.buffer.slice(0) as ArrayBuffer;
    worker.postMessage(
      {
        buffer: transferBuffer,
        width: imgd.width,
        height: imgd.height,
        options: traceOptions,
      },
      [transferBuffer],
    );
  });
};

const triggerDownload = (blobUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export const downloadSVG = (svg: string, filename: string) => {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename.endsWith('.svg') ? filename : `${filename}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const downloadDataUrl = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
