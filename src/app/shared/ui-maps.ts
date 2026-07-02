/**
 * Mapas de presentación compartidos (colores/etiquetas por estado).
 *
 * ¿Por qué aquí y no en cada componente? Admin, mesero, cocina y cliente
 * pintan los mismos estados con los mismos colores del diseño; centralizarlos
 * garantiza consistencia visual y un único punto de cambio.
 */
import type { OrderStatus, Shift, TableStatus } from '../core/domain/entities/entities';

export const TABLE_STATUS_UI: Record<TableStatus, { bg: string; border: string; label: string }> = {
  libre: { bg: '#EEF2E6', border: '#7C905F', label: 'Libre' },
  ocupada: { bg: '#F7E8DC', border: '#B5764C', label: 'Ocupada' },
  reservada: { bg: '#F7EFDB', border: '#C49A3F', label: 'Reservada' },
};

export const ORDER_STATUS_UI: Record<
  OrderStatus,
  { label: string; bg: string; color: string; next: string | null; dot: string }
> = {
  recibido: { label: 'Recibido', bg: '#F7EFDB', color: '#8A6B1F', next: 'Pasar a Preparando', dot: '#C49A3F' },
  preparando: { label: 'Preparando', bg: '#F7E8DC', color: '#8A5230', next: 'Marcar como Listo', dot: '#B5764C' },
  listo: { label: 'Listo', bg: '#EEF2E6', color: '#4E6337', next: 'Marcar Entregado', dot: '#7C905F' },
  entregado: { label: 'Entregado', bg: '#EFE7D9', color: '#8B7A69', next: null, dot: '#9A8A78' },
};

export const SHIFT_LABELS: Record<Shift, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
};

export const SHIFT_HOURS: Record<Shift, string> = {
  manana: '8:00–14:00',
  tarde: '14:00–20:00',
  noche: '20:00–2:00',
};

/** Paleta de avatares del diseño, asignada por índice estable. */
export const AVATAR_PALETTE = ['#A66A4A', '#7C905F', '#C49A3F', '#8A6B85', '#5F7C90'];

export function initialsOf(fullName: string): string {
  return fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
