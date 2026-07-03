import { afterEach, describe, expect, it, vi } from 'vitest';
import { cropImageSquare } from './image-utils';

describe('cropImageSquare', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera un jpg cuadrado con el recorte manual seleccionado', async () => {
    const source = new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });
    const drawImage = vi.fn();
    const toBlob = vi.fn((callback: BlobCallback) => callback(new Blob(['ok'], { type: 'image/jpeg' })));
    const originalCreate = document.createElement.bind(document);

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1600, height: 900 }));
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage }),
          toBlob,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreate(tagName);
    }) as typeof document.createElement);

    const result = await cropImageSquare(source, {
      zoom: 1.4,
      offsetX: 25,
      offsetY: -10,
      outputSize: 900,
    });

    expect(result.name).toBe('foto.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(drawImage).toHaveBeenCalledOnce();
    expect(toBlob).toHaveBeenCalledOnce();
  });

  it('devuelve el archivo original para formatos no rasterizables', async () => {
    const source = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
    const result = await cropImageSquare(source, { zoom: 1, offsetX: 0, offsetY: 0 });
    expect(result).toBe(source);
  });

  it('devuelve el original cuando canvas no esta disponible', async () => {
    const source = new File([new Uint8Array([5])], 'foto.png', { type: 'image/png' });
    const originalCreate = document.createElement.bind(document);

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1000, height: 1000 }));
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => null,
          toBlob: vi.fn(),
        } as unknown as HTMLCanvasElement;
      }
      return originalCreate(tagName);
    }) as typeof document.createElement);

    const result = await cropImageSquare(source, { zoom: 1.2, offsetX: 5, offsetY: 5 });
    expect(result).toBe(source);
  });
});
