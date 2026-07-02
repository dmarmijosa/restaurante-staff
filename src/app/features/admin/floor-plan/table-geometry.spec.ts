/**
 * Pruebas de la geometría del plano: son las reglas visuales portadas del
 * diseño original, así que se fijan con valores exactos para detectar
 * regresiones de la réplica.
 */
import { describe, expect, it } from 'vitest';
import { chairsFor, clampPosition, tableDims } from './table-geometry';

describe('tableDims', () => {
  it('calcula mesas cuadradas por número de sillas (valores del diseño)', () => {
    expect(tableDims({ seats: 2, shape: 'sq' })).toEqual({ w: 66, h: 78, W: 94, H: 106, radius: '16px' });
    expect(tableDims({ seats: 4, shape: 'sq' }).w).toBe(94);
    expect(tableDims({ seats: 6, shape: 'sq' }).w).toBe(134);
    expect(tableDims({ seats: 8, shape: 'sq' }).w).toBe(176);
  });

  it('calcula mesas redondas con diámetro según sillas', () => {
    expect(tableDims({ seats: 2, shape: 'rd' })).toEqual({ w: 72, h: 72, W: 100, H: 100, radius: '50%' });
    expect(tableDims({ seats: 4, shape: 'rd' }).w).toBe(94);
    expect(tableDims({ seats: 6, shape: 'rd' }).w).toBe(118);
    expect(tableDims({ seats: 10, shape: 'rd' }).w).toBe(142);
  });
});

describe('chairsFor', () => {
  it('coloca una silla por asiento', () => {
    const sq = { seats: 5, shape: 'sq' as const };
    expect(chairsFor(sq, tableDims(sq))).toHaveLength(5);
    const rd = { seats: 6, shape: 'rd' as const };
    expect(chairsFor(rd, tableDims(rd))).toHaveLength(6);
  });

  it('reparte sillas de mesas cuadradas entre arriba y abajo', () => {
    const table = { seats: 4, shape: 'sq' as const };
    const chairs = chairsFor(table, tableDims(table));
    const top = chairs.filter((c) => c.y === 2);
    const bottom = chairs.filter((c) => c.y > 2);
    expect(top).toHaveLength(2);
    expect(bottom).toHaveLength(2);
  });
});

describe('clampPosition', () => {
  const dims = tableDims({ seats: 4, shape: 'sq' });
  const canvas = { width: 780, height: 560 };

  it('no permite salir del lienzo por la izquierda/arriba', () => {
    expect(clampPosition(-50, -20, dims, canvas)).toEqual({ x: 0, y: 0 });
  });

  it('no permite salir del lienzo por la derecha/abajo', () => {
    const pos = clampPosition(5000, 5000, dims, canvas);
    expect(pos.x).toBe(canvas.width - dims.W);
    expect(pos.y).toBe(canvas.height - dims.H);
  });
});
