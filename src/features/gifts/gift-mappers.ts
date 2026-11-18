import type { GiftRow } from '@/db/gifts-schema';
import type { GiftForOwner, GiftResponse } from './gift-schemas';

function toGiftForOwner(row: GiftRow): GiftForOwner {
  return {
    id: row.id,
    ownerMemberId: row.ownerMemberId,
    title: row.title,
    category: row.category,
    url: row.url,
    imageUrl: row.imageUrl,
    priceCents: row.priceCents,
    notes: row.notes,
    receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Toda resposta de presente passa por aqui. Quando quem pede é o dono, os campos de
 * reserva nem existem no objeto: esconder só na tela não mantém a surpresa.
 */
export function toGiftResponse(row: GiftRow, viewerMemberId: string): GiftResponse {
  const gift = toGiftForOwner(row);
  if (row.ownerMemberId === viewerMemberId) return gift;

  return {
    ...gift,
    reservedByMemberId: row.reservedByMemberId,
    reservedAt: row.reservedAt ? row.reservedAt.toISOString() : null,
  };
}
