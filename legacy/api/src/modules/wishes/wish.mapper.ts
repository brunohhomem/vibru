import type { Wish } from '@vibru/shared';
import type { WishWithPlan } from './wishes.repository';

export function toWish(row: WishWithPlan): Wish {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    url: row.url,
    imageUrl: row.imageUrl,
    priceCents: row.priceCents,
    notes: row.notes,
    doneAt: row.doneAt ? row.doneAt.toISOString() : null,
    plannedOn: row.plannedOn,
    createdAt: row.createdAt.toISOString(),
  };
}
