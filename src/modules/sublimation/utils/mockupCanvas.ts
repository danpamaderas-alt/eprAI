export interface MockupZone {
  path: Path2D;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface MockupProduct {
  id: string;
  label: string;
  draw: (ctx: CanvasRenderingContext2D, color: string) => MockupZone;
}

export const MOCKUP_COLORS: { name: string; value: string }[] = [
  { name: 'Blanco', value: '#ffffff' },
  { name: 'Negro', value: '#1e293b' },
  { name: 'Gris', value: '#94a3b8' },
  { name: 'Rojo', value: '#dc2626' },
  { name: 'Azul', value: '#2563eb' },
  { name: 'Verde', value: '#059669' },
  { name: 'Amarillo', value: '#f59e0b' },
  { name: 'Rosa', value: '#ec4899' },
];

const S = 1080;

const rectZone = (
  x: number,
  y: number,
  w: number,
  h: number,
  r = 12,
): MockupZone => {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return { path: p, cx: x + w / 2, cy: y + h / 2, w, h };
};

const ellipsePath = (cx: number, cy: number, rx: number, ry: number): Path2D => {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  return p;
};

const shadeHorizontal = (
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  strength = 0.18,
) => {
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, `rgba(15,23,42,${strength})`);
  g.addColorStop(0.35, 'rgba(15,23,42,0)');
  g.addColorStop(0.65, 'rgba(15,23,42,0)');
  g.addColorStop(1, `rgba(15,23,42,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();
};

const mixWithBlack = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r},${g},${b})`;
};

const TAZA: MockupProduct = {
  id: 'taza',
  label: 'Taza',
  draw: (ctx, color) => {
    const handle = new Path2D();
    handle.ellipse(830, 545, 90, 130, 0, 0, Math.PI * 2);
    ctx.lineWidth = 46;
    ctx.strokeStyle = color;
    ctx.stroke(handle);

    const body = new Path2D();
    body.roundRect(290, 330, 500, 470, [42, 42, 64, 64]);
    ctx.fillStyle = color;
    ctx.fill(body);

    ctx.fillStyle = mixWithBlack(color, 0.08);
    ctx.fill(ellipsePath(540, 334, 248, 36));
    ctx.fillStyle = mixWithBlack(color, 0.28);
    ctx.fill(ellipsePath(540, 334, 208, 26));

    shadeHorizontal(ctx, body);
    return rectZone(340, 400, 400, 310);
  },
};

const REMERA: MockupProduct = {
  id: 'remera',
  label: 'Remera',
  draw: (ctx, color) => {
    const p = new Path2D();
    p.moveTo(395, 292);
    p.bezierCurveTo(450, 262, 630, 262, 685, 292);
    p.lineTo(852, 372);
    p.lineTo(920, 505);
    p.lineTo(775, 583);
    p.lineTo(748, 492);
    p.lineTo(762, 862);
    p.quadraticCurveTo(540, 895, 318, 862);
    p.lineTo(332, 492);
    p.lineTo(305, 583);
    p.lineTo(160, 505);
    p.lineTo(228, 372);
    p.closePath();
    ctx.fillStyle = color;
    ctx.fill(p);

    ctx.fillStyle = mixWithBlack(color, 0.22);
    ctx.beginPath();
    ctx.moveTo(430, 278);
    ctx.quadraticCurveTo(540, 360, 650, 278);
    ctx.quadraticCurveTo(540, 320, 430, 278);
    ctx.fill();

    const g = ctx.createLinearGradient(0, 260, 0, 900);
    g.addColorStop(0, 'rgba(255,255,255,0.14)');
    g.addColorStop(0.4, 'rgba(15,23,42,0)');
    g.addColorStop(1, 'rgba(15,23,42,0.16)');
    ctx.save();
    ctx.clip(p);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
    return rectZone(400, 385, 280, 340, 10);
  },
};

const BOTELLA: MockupProduct = {
  id: 'botella',
  label: 'Botella',
  draw: (ctx, color) => {
    ctx.fillStyle = '#64748b';
    ctx.fill(new Path2D('M489 148 h102 v84 h-102 Z'));
    ctx.fillStyle = mixWithBlack('#64748b', 0.25);
    ctx.fillRect(489, 214, 102, 12);

    const body = new Path2D();
    body.moveTo(500, 226);
    body.lineTo(500, 300);
    body.quadraticCurveTo(500, 330, 452, 356);
    body.quadraticCurveTo(420, 380, 420, 450);
    body.lineTo(420, 800);
    body.quadraticCurveTo(420, 892, 540, 892);
    body.quadraticCurveTo(660, 892, 660, 800);
    body.lineTo(660, 450);
    body.quadraticCurveTo(660, 380, 628, 356);
    body.quadraticCurveTo(580, 330, 580, 300);
    body.lineTo(580, 226);
    body.closePath();
    ctx.fillStyle = color;
    ctx.fill(body);

    shadeHorizontal(ctx, body, 0.24);
    return rectZone(442, 430, 196, 350, 10);
  },
};

const MOUSEPAD: MockupProduct = {
  id: 'mousepad',
  label: 'Mousepad',
  draw: (ctx, color) => {
    const side = new Path2D();
    side.moveTo(240, 560);
    side.lineTo(820, 560);
    side.lineTo(900, 720);
    side.lineTo(160, 720);
    side.closePath();
    ctx.fillStyle = mixWithBlack(color, 0.35);
    ctx.fill(side);

    const face = new Path2D();
    face.moveTo(240, 520);
    face.lineTo(820, 520);
    face.lineTo(900, 700);
    face.lineTo(160, 700);
    face.closePath();
    ctx.fillStyle = color;
    ctx.fill(face);

    shadeHorizontal(ctx, face, 0.14);
    const zone = new Path2D();
    zone.moveTo(275, 540);
    zone.lineTo(790, 540);
    zone.lineTo(855, 682);
    zone.lineTo(210, 682);
    zone.closePath();
    return { path: zone, cx: 532, cy: 611, w: 645, h: 142 };
  },
};

const LLAVERO: MockupProduct = {
  id: 'llavero',
  label: 'Llavero',
  draw: (ctx) => {
    const ringGrad = ctx.createLinearGradient(430, 180, 560, 320);
    ringGrad.addColorStop(0, '#cbd5e1');
    ringGrad.addColorStop(0.5, '#64748b');
    ringGrad.addColorStop(1, '#e2e8f0');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(500, 260, 78, 0, Math.PI * 2);
    ctx.stroke();

    const tag = ellipsePath(540, 600, 190, 200);
    const wood = ctx.createLinearGradient(350, 420, 730, 800);
    wood.addColorStop(0, '#e6c793');
    wood.addColorStop(0.5, '#d4ad6d');
    wood.addColorStop(1, '#c19a58');
    ctx.fillStyle = wood;
    ctx.fill(tag);

    ctx.fillStyle = '#8a6b3a';
    ctx.fill(ellipsePath(540, 432, 22, 22));

    shadeHorizontal(ctx, tag, 0.16);
    const zone = ellipsePath(540, 610, 132, 142);
    return { path: zone, cx: 540, cy: 610, w: 264, h: 284 };
  },
};

export const MOCKUP_PRODUCTS: MockupProduct[] = [
  TAZA,
  REMERA,
  BOTELLA,
  MOUSEPAD,
  LLAVERO,
];

const imgCache = new Map<string, Promise<HTMLImageElement>>();

export const loadImageCached = (src: string): Promise<HTMLImageElement> => {
  const hit = imgCache.get(src);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del diseño.'));
    img.src = src;
  });
  imgCache.set(src, p);
  return p;
};

export interface MockupRenderOptions {
  product: MockupProduct;
  productColor: string;
  designSrc: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

let bgCanvas: HTMLCanvasElement | null = null;

const paintBackground = (ctx: CanvasRenderingContext2D) => {
  if (!bgCanvas) {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = S;
    bgCanvas.height = S;
    const b = bgCanvas.getContext('2d')!;
    const g = b.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#f1f5f9');
    g.addColorStop(1, '#dbe3ec');
    b.fillStyle = g;
    b.fillRect(0, 0, S, S);
    const r = b.createRadialGradient(S / 2, 220, 60, S / 2, 220, 700);
    r.addColorStop(0, 'rgba(255,255,255,0.75)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    b.fillStyle = r;
    b.fillRect(0, 0, S, S);
  }
  ctx.drawImage(bgCanvas, 0, 0);
};

export const renderMockup = async (
  canvas: HTMLCanvasElement,
  opts: MockupRenderOptions,
): Promise<void> => {
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible.');

  paintBackground(ctx);

  ctx.save();
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(15,23,42,0.13)';
  ctx.beginPath();
  ctx.ellipse(540, 906, 300, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const zone = opts.product.draw(ctx, opts.productColor);
  const img = await loadImageCached(opts.designSrc);

  ctx.save();
  ctx.clip(zone.path);
  const base =
    Math.min(zone.w / img.naturalWidth, zone.h / img.naturalHeight) * opts.scale;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  ctx.translate(
    zone.cx + opts.offsetX * zone.w * 0.5,
    zone.cy + opts.offsetY * zone.h * 0.5,
  );
  ctx.rotate((opts.rotation * Math.PI) / 180);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
};

export const canvasToPngBlob = (
  canvas: HTMLCanvasElement,
): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));

export const blobToShareFile = (blob: Blob, filename: string): File =>
  new File([blob], filename, { type: 'image/png' });
