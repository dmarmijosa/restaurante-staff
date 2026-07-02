/**
 * Geometría del plano del salón, portada 1:1 del diseño original.
 *
 * ¿Por qué funciones puras separadas del componente? El tamaño de una mesa y
 * la posición de sus sillas son reglas de presentación deterministas; aisladas
 * aquí se prueban con unit tests sin montar el componente de drag & drop.
 */
import type { RestaurantTable } from '../../../core/domain/entities/entities';

export interface TableDims {
  /** Tamaño visible de la mesa. */
  w: number;
  h: number;
  /** Tamaño del contenedor (mesa + margen para sillas). */
  W: number;
  H: number;
  radius: string;
}

/** Dimensiones según asientos y forma (valores exactos del diseño). */
export function tableDims(table: Pick<RestaurantTable, 'seats' | 'shape'>): TableDims {
  const s = table.seats;
  if (table.shape === 'rd') {
    const d = s <= 2 ? 72 : s <= 4 ? 94 : s <= 6 ? 118 : 142;
    return { w: d, h: d, W: d + 28, H: d + 28, radius: '50%' };
  }
  const w = s <= 2 ? 66 : s <= 4 ? 94 : s <= 6 ? 134 : 176;
  const h = 78;
  return { w, h, W: w + 28, H: h + 28, radius: '16px' };
}

/**
 * Posición de cada silla alrededor de la mesa: en círculo para mesas redondas
 * y repartidas arriba/abajo para las cuadradas, igual que el mockup.
 */
export function chairsFor(
  table: Pick<RestaurantTable, 'seats' | 'shape'>,
  dims: TableDims,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  if (table.shape === 'rd') {
    for (let i = 0; i < table.seats; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / table.seats;
      out.push({
        x: Math.round(dims.W / 2 + (dims.w / 2 + 8) * Math.cos(angle) - 5),
        y: Math.round(dims.H / 2 + (dims.h / 2 + 8) * Math.sin(angle) - 5),
      });
    }
    return out;
  }
  const top = Math.ceil(table.seats / 2);
  const bottom = table.seats - top;
  for (let i = 0; i < top; i++) {
    out.push({ x: Math.round(14 + ((i + 1) * dims.w) / (top + 1) - 5), y: 2 });
  }
  for (let i = 0; i < bottom; i++) {
    out.push({ x: Math.round(14 + ((i + 1) * dims.w) / (bottom + 1) - 5), y: dims.H - 12 });
  }
  return out;
}

/** Limita una posición al lienzo para que la mesa no se salga del plano. */
export function clampPosition(
  x: number,
  y: number,
  dims: TableDims,
  canvas: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.round(Math.min(Math.max(0, x), canvas.width - dims.W)),
    y: Math.round(Math.min(Math.max(0, y), canvas.height - dims.H)),
  };
}
