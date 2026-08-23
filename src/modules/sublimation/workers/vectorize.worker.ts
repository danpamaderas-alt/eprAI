import ImageTracer from 'imagetracerjs';

interface VectorizeRequest {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  options: Record<string, unknown>;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<VectorizeRequest>) => {
  const { buffer, width, height, options } = e.data;
  try {
    const imgd = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const svg = ImageTracer.imagedataToSVG(
      imgd,
      options as Parameters<typeof ImageTracer.imagedataToSVG>[1],
    );
    ctx.postMessage({ ok: true, svg });
  } catch (err) {
    ctx.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : 'Fallo la vectorización.',
    });
  }
};
