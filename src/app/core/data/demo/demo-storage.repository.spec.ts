/**
 * El repositorio de Storage demo debe devolver un data URL local para poder
 * previsualizar imágenes sin backend.
 */
import { describe, expect, it } from 'vitest';
import { DemoStorageRepository } from './demo-repositories';

describe('DemoStorageRepository', () => {
  it('convierte el archivo en un data URL', async () => {
    const repo = new DemoStorageRepository();
    const file = new File(['contenido'], 'foto.png', { type: 'image/png' });
    const url = await repo.uploadImage(file, 'productos');
    expect(url.startsWith('data:')).toBe(true);
  });
});
