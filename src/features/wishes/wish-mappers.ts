import type { WishRow } from '@/db/wishes-schema';
import type { Wish } from './wish-schemas';

/** Desejo com o dia mais próximo (de hoje em diante) entre os eventos ativos dele. */
export type WishWithPlan = WishRow & { plannedOn: string | null };

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
