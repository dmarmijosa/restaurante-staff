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
