import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { getDatabase, type DatabaseExecutor } from '@/db/client';
import {
  listItems,
  lists,
  type ListItemRow,
  type ListRow,
  type NewListItemRow,
  type NewListRow,
} from '@/db/lists-schema';
import type { ListSummaryRow } from './list-mappers';

// Todo método recebe `coupleId`: um membro nunca lê nem grava lista de outro casal.
// A exclusão é lógica nas duas tabelas.

export async function listSummaries(coupleId: string): Promise<ListSummaryRow[]> {
  const totalItems = sql<number>`count(${listItems.id}) filter (where ${listItems.isActive})::int`;
  const checkedItems = sql<number>`count(${listItems.id}) filter (where ${listItems.isActive} and ${listItems.checkedAt} is not null)::int`;

  return getDatabase()
    .select({
      id: lists.id,
      title: lists.title,
      totalItems,
      checkedItems,
      updatedAt: lists.updatedAt,
    })
    .from(lists)
    .leftJoin(
      listItems,
      and(eq(listItems.listId, lists.id), eq(listItems.coupleId, lists.coupleId)),
    )
    .where(and(eq(lists.coupleId, coupleId), eq(lists.isActive, true)))
    .groupBy(lists.id)
    .orderBy(desc(lists.updatedAt), desc(lists.createdAt));
}

export async function findActiveList(
  coupleId: string,
  listId: string,
  executor: DatabaseExecutor = getDatabase(),
): Promise<ListRow | null> {
  const [row] = await executor
    .select()
    .from(lists)
    .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function insertList(data: NewListRow): Promise<ListRow> {
  const [row] = await getDatabase().insert(lists).values(data).returning();
  if (!row) throw new Error('Falha ao criar lista');
  return row;
}

export async function updateListTitle(
  coupleId: string,
  listId: string,
  title: string,
  updatedAt: Date,
): Promise<ListRow> {
  const [row] = await getDatabase()
    .update(lists)
    .set({ title, updatedAt })
    .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)))
    .returning();
  if (!row) throw new Error('Lista não encontrada para renomear');
  return row;
}

/** Sobe a lista na ordenação de atividade sem alterar nenhum outro campo. */
export async function touchList(
  coupleId: string,
  listId: string,
  updatedAt: Date,
  executor: DatabaseExecutor = getDatabase(),
): Promise<void> {
  await executor
    .update(lists)
    .set({ updatedAt })
    .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)));
}

export async function softDeleteList(
  coupleId: string,
  listId: string,
  updatedAt: Date,
): Promise<ListRow | null> {
  const [row] = await getDatabase()
    .update(lists)
    .set({ isActive: false, updatedAt })
    .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)))
    .returning();
  return row ?? null;
}

/** Abertos por ordem de criação; marcados no fim, do mais recente para o mais antigo. */
export async function listItemsOfList(
  coupleId: string,
  listId: string,
  executor: DatabaseExecutor = getDatabase(),
): Promise<ListItemRow[]> {
  return executor
    .select()
    .from(listItems)
    .where(
      and(
        eq(listItems.coupleId, coupleId),
        eq(listItems.listId, listId),
        eq(listItems.isActive, true),
      ),
    )
    .orderBy(
      sql`${listItems.checkedAt} is not null`,
      sql`case when ${listItems.checkedAt} is null then ${listItems.createdAt} end asc`,
      desc(listItems.checkedAt),
    );
}

export async function findActiveListItem(
  coupleId: string,
  listId: string,
  itemId: string,
  executor: DatabaseExecutor = getDatabase(),
): Promise<ListItemRow | null> {
  const [row] = await executor
    .select()
    .from(listItems)
    .where(
      and(
        eq(listItems.coupleId, coupleId),
        eq(listItems.listId, listId),
        eq(listItems.id, itemId),
        eq(listItems.isActive, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertListItem(data: NewListItemRow): Promise<ListItemRow> {
  const [row] = await getDatabase().insert(listItems).values(data).returning();
  if (!row) throw new Error('Falha ao criar item');
  return row;
}

export async function updateListItemTitle(
  coupleId: string,
  listId: string,
  itemId: string,
  title: string,
): Promise<ListItemRow> {
  const [row] = await getDatabase()
    .update(listItems)
    .set({ title })
    .where(
      and(
        eq(listItems.coupleId, coupleId),
        eq(listItems.listId, listId),
        eq(listItems.id, itemId),
        eq(listItems.isActive, true),
      ),
    )
    .returning();
  if (!row) throw new Error('Item não encontrado para editar');
  return row;
}

/**
 * Marca somente se o item ainda estiver aberto. Duas marcações simultâneas serializam
 * no `WHERE`: a segunda não encontra a linha e a action devolve o estado atual.
 */
export async function checkListItemIfOpen(
  coupleId: string,
  listId: string,
  itemId: string,
  memberId: string,
  checkedAt: Date,
  executor: DatabaseExecutor,
): Promise<ListItemRow | null> {
  const [row] = await executor
    .update(listItems)
    .set({ checkedAt, checkedByMemberId: memberId, updatedAt: checkedAt })
    .where(
      and(
        eq(listItems.coupleId, coupleId),
        eq(listItems.listId, listId),
        eq(listItems.id, itemId),
        eq(listItems.isActive, true),
        isNull(listItems.checkedAt),
      ),
    )
    .returning();
  return row ?? null;
}

/** Desmarca somente se o item estiver marcado. Mesma garantia de `checkListItemIfOpen`. */
export async function uncheckListItemIfChecked(
  coupleId: string,
  listId: string,
  itemId: string,
  updatedAt: Date,
  executor: DatabaseExecutor,
): Promise<ListItemRow | null> {
  const [row] = await executor
    .update(listItems)
    .set({ checkedAt: null, checkedByMemberId: null, updatedAt })
    .where(
      and(
        eq(listItems.coupleId, coupleId),
        eq(listItems.listId, listId),
        eq(listItems.id, itemId),
        eq(listItems.isActive, true),
        isNotNull(listItems.checkedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function softDeleteListItem(
  coupleId: string,
  listId: string,
  itemId: string,
  updatedAt: Date,
): Promise<ListItemRow | null> {
  const [row] = await getDatabase()
    .update(listItems)
    .set({ isActive: false, updatedAt })
    .where(
      and(
        eq(listItems.coupleId, coupleId),
        eq(listItems.listId, listId),
        eq(listItems.id, itemId),
        eq(listItems.isActive, true),
      ),
    )
    .returning();
  return row ?? null;
}

export async function clearCheckedListItems(
  coupleId: string,
  listId: string,
  updatedAt: Date,
): Promise<ListItemRow[]> {
  return getDatabase()
    .update(listItems)
    .set({ isActive: false, updatedAt })
    .where(
      and(
        eq(listItems.coupleId, coupleId),
        eq(listItems.listId, listId),
        eq(listItems.isActive, true),
        isNotNull(listItems.checkedAt),
      ),
    )
    .returning();
}
