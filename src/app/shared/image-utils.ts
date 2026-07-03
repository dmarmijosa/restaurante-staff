/**
 * Redimensiona y recomprime una imagen en el navegador antes de subirla a
 * Storage. Motivo: las fotos de móvil pesan varios MB; subirlas tal cual gasta
 * ancho de banda y almacenamiento y ralentiza el menú del cliente. Se limita
 * el lado mayor a `maxDim` px y se recomprime a JPEG con la calidad dada.
 *
 * Si algo falla (formato raro, sin canvas), devuelve el archivo original: la
 * compresión es una optimización, nunca debe impedir subir la imagen.
 */
export async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<File> {
  // Los SVG no se rasterizan (perderían nitidez); se suben tal cual.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    // Ya es pequeña: no reprocesar.
    if (scale === 1 && file.size < 300_000) return file;

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export interface CropImageOptions {
  zoom: number;
  offsetX: number;
  offsetY: number;
  outputSize?: number;
  quality?: number;
}

/**
 * Recorta manualmente una imagen en formato cuadrado. Se usa antes de subir
 * fotos de productos/logo para que el usuario controle el encuadre final.
 */
export async function cropImageSquare(file: File, options: CropImageOptions): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const outputSize = options.outputSize ?? 900;
    const quality = options.quality ?? 0.86;

    const baseScale = Math.max(outputSize / bitmap.width, outputSize / bitmap.height);
    const zoom = Math.max(1, options.zoom || 1);
    const renderScale = baseScale * zoom;

    const sourceSide = Math.min(bitmap.width, bitmap.height, outputSize / renderScale);
    const maxOffsetX = (bitmap.width - sourceSide) / 2;
    const maxOffsetY = (bitmap.height - sourceSide) / 2;

    const centerX = bitmap.width / 2 + (Math.max(-100, Math.min(100, options.offsetX)) / 100) * maxOffsetX;
    const centerY = bitmap.height / 2 + (Math.max(-100, Math.min(100, options.offsetY)) / 100) * maxOffsetY;

    const sx = Math.max(0, Math.min(bitmap.width - sourceSide, centerX - sourceSide / 2));
    const sy = Math.max(0, Math.min(bitmap.height - sourceSide, centerY - sourceSide / 2));

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, sx, sy, sourceSide, sourceSide, 0, 0, outputSize, outputSize);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
