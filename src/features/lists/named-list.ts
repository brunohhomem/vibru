import type { PharmacyResult } from '@/features/health/health-schemas';
import {
  insertList,
  insertListItem,
  listItemsOfList,
  listSummaries,
  touchList,
} from './lists-repository';

/** Compara títulos sem diferenciar maiúsculas e acentos, para reaproveitar a lista que o casal já criou à mão. */
export function normalizeListTitle(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

export function pickExistingOpenItem(
  items: ReadonlyArray<{ id: string; title: string; checkedAt: Date | null }>,
  itemTitle: string,
): { id: string; title: string } | null {
  const wanted = normalizeListTitle(itemTitle);
  const found = items.find(
    (item) => item.checkedAt === null && normalizeListTitle(item.title) === wanted,
  );
  return found ? { id: found.id, title: found.title } : null;
}

async function findOrCreateList(
  coupleId: string,
  listTitle: string,
): Promise<{ id: string; title: string }> {
  const wanted = normalizeListTitle(listTitle);
  const found = (await listSummaries(coupleId)).find(
    (summary) => normalizeListTitle(summary.title) === wanted,
  );
  if (found) return { id: found.id, title: found.title };

  const created = await insertList({ coupleId, title: listTitle });
  return { id: created.id, title: created.title };
}

/**
 * Atalho para outros módulos (a farmácia, no lote D) adicionarem um item a uma
 * lista conhecida pelo nome, criando a lista na primeira vez. Não duplica item
 * aberto igual.
 */
export async function addItemToNamedList(
  coupleId: string,
  listTitle: string,
  itemTitle: string,
): Promise<PharmacyResult> {
  const list = await findOrCreateList(coupleId, listTitle);
  const existing = pickExistingOpenItem(await listItemsOfList(coupleId, list.id), itemTitle);
  if (existing) return { list, item: existing, alreadyListed: true };

  const created = await insertListItem({ coupleId, listId: list.id, title: itemTitle });
  await touchList(coupleId, list.id, new Date());
  return { list, item: { id: created.id, title: created.title }, alreadyListed: false };
}
