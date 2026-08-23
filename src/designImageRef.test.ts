import { describe, it, expect } from 'vitest';
import { isStorageRef, isDataUrl, dataUrlToBlob, imageExtensionFor } from './shared/utils/designImageRef';

describe('isStorageRef', () => {
  it('acepta paths de storage con carpeta y extensión', () => {
    expect(isStorageRef('abc123/uuid-1.png')).toBe(true);
    expect(isStorageRef('shared/x.webp')).toBe(true);
  });

  it('rechaza URLs http(s), data URLs, null y strings sueltos', () => {
    expect(isStorageRef('https://ejemplo.com/a.png')).toBe(false);
    expect(isStorageRef('http://ejemplo.com/a.png')).toBe(false);
    expect(isStorageRef('data:image/png;base64,AAAA')).toBe(false);
    expect(isStorageRef(null)).toBe(false);
    expect(isStorageRef(undefined)).toBe(false);
    expect(isStorageRef('imagen-sin-path')).toBe(false);
  });
});

describe('isDataUrl', () => {
  it('detecta data URLs y rechaza el resto', () => {
    expect(isDataUrl('data:image/png;base64,AA')).toBe(true);
    expect(isDataUrl('https://x.com/a.png')).toBe(false);
    expect(isDataUrl(null)).toBe(false);
  });
});

describe('dataUrlToBlob', () => {
  it('decodifica un PNG de 1x1 pixel con su mime type', () => {
    // PNG transparente 1x1
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const blob = dataUrlToBlob(png);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('soporta mime types sin charset y descarta whitespace en el base64', () => {
    const raw = btoa('hola');
    const blob = dataUrlToBlob(`data:image/jpeg;charset=utf-8;base64,${raw.slice(0, 2)} ${raw.slice(2)}`);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(4);
  });
});

describe('imageExtensionFor', () => {
  it('mapea mimes conocidos y cae a png para desconocidos', () => {
    expect(imageExtensionFor('image/webp')).toBe('webp');
    expect(imageExtensionFor('image/svg+xml')).toBe('svg');
    expect(imageExtensionFor('application/octet-stream')).toBe('png');
  });
});
