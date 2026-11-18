import type { GiftForOwner, GiftResponse } from '@vibru/shared';
import type { GiftRow } from './gift.entity';

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
 * Toda resposta de presente passa por aqui. Quando quem pede é o dono, os
 * campos de reserva nem existem no objeto: esconder só no front não mantém
 * a surpresa (ADR 0003, 3.10).
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
