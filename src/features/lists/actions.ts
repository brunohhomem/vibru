'use server';

import { z } from 'zod';
import { getDatabase } from '@/db/client';
import type { ListItemRow, ListRow } from '@/db/lists-schema';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { toList, toListItem, toListSummary } from './list-mappers';
import {
  createListRequestSchema,
  listItemTitleSchema,
  listTitleSchema,
  type List,
  type ListItem,
  type ListsResponse,
} from './list-schemas';
import {
  checkListItemIfOpen,
  clearCheckedListItems,
  findActiveList,
  findActiveListItem,
  insertList,
  insertListItem,
  listItemsOfList,
  listSummaries,
  softDeleteList,
  softDeleteListItem,
  touchList,
  uncheckListItemIfChecked,
  updateListItemTitle,
  updateListTitle,
} from './lists-repository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const listIdSchema = z.object({ id: z.string() });
const renameListSchema = z.object({ id: z.string(), title: listTitleSchema });
const addItemSchema = z.object({ listId: z.string(), title: listItemTitleSchema });
const itemIdSchema = z.object({ listId: z.string(), itemId: z.string() });
const editItemSchema = itemIdSchema.extend({ title: listItemTitleSchema });
const clearCheckedSchema = z.object({ listId: z.string() });

async function findListOrFail(coupleId: string, listId: string): Promise<ListRow> {
  const row = UUID_PATTERN.test(listId) ? await findActiveList(coupleId, listId) : null;
  if (!row) throw new ActionFailure('failed', 'Lista não encontrada');
  return row;
}

async function findItemOrFail(
  coupleId: string,
  listId: string,
  itemId: string,
): Promise<ListItemRow> {
  await findListOrFail(coupleId, listId);
  const row = UUID_PATTERN.test(itemId) ? await findActiveListItem(coupleId, listId, itemId) : null;
  if (!row) throw new ActionFailure('failed', 'Item não encontrado');
  return row;
}

async function loadList(coupleId: string, row: ListRow): Promise<List> {
  return toList(row, await listItemsOfList(coupleId, row.id));
}

export const listListsAction = defineMemberAction({
  schema: z.undefined(),
  handler: async ({ member }): Promise<ListsResponse> => ({
    lists: (await listSummaries(member.coupleId)).map(toListSummary),
  }),
});

export const createListAction = defineMemberAction({
  schema: createListRequestSchema,
  handler: async ({ input, member }): Promise<List> =>
    toList(await insertList({ coupleId: member.coupleId, title: input.title }), []),
});

export const getListAction = defineMemberAction({
  schema: listIdSchema,
  handler: async ({ input, member }): Promise<List> =>
    loadList(member.coupleId, await findListOrFail(member.coupleId, input.id)),
});

export const renameListAction = defineMemberAction({
  schema: renameListSchema,
  handler: async ({ input, member }): Promise<List> => {
    await findListOrFail(member.coupleId, input.id);
    const renamed = await updateListTitle(member.coupleId, input.id, input.title, new Date());
    return loadList(member.coupleId, renamed);
  },
});

export const removeListAction = defineMemberAction({
  schema: listIdSchema,
  handler: async ({ input, member }): Promise<null> => {
    await findListOrFail(member.coupleId, input.id);
    const deleted = await softDeleteList(member.coupleId, input.id, new Date());
    if (!deleted) throw new ActionFailure('failed', 'Lista não encontrada');
    return null;
  },
});

export const addListItemAction = defineMemberAction({
  schema: addItemSchema,
  handler: async ({ input, member }): Promise<ListItem> => {
    await findListOrFail(member.coupleId, input.listId);
    const row = await insertListItem({
      coupleId: member.coupleId,
      listId: input.listId,
      title: input.title,
    });
    await touchList(member.coupleId, input.listId, new Date());
    return toListItem(row);
  },
});

export const editListItemAction = defineMemberAction({
  schema: editItemSchema,
  handler: async ({ input, member }): Promise<ListItem> => {
    await findItemOrFail(member.coupleId, input.listId, input.itemId);
    const row = await updateListItemTitle(member.coupleId, input.listId, input.itemId, input.title);
    await touchList(member.coupleId, input.listId, new Date());
    return toListItem(row);
  },
});

/** Idempotente: se o item já está no estado pedido, devolve o estado atual sem tocar a lista. */
async function currentItemState(
  coupleId: string,
  listId: string,
  itemId: string,
  executor: Parameters<typeof findActiveListItem>[3],
): Promise<ListItem> {
  const row = await findActiveListItem(coupleId, listId, itemId, executor);
  if (!row) throw new ActionFailure('failed', 'Item não encontrado');
  return toListItem(row);
}

export const checkListItemAction = defineMemberAction({
  schema: itemIdSchema,
  handler: async ({ input, member }): Promise<ListItem> => {
    await findItemOrFail(member.coupleId, input.listId, input.itemId);

    const now = new Date();
    return getDatabase().transaction(async (transaction) => {
      const changed = await checkListItemIfOpen(
        member.coupleId,
        input.listId,
        input.itemId,
        member.memberId,
        now,
        transaction,
      );
      if (!changed) {
        return currentItemState(member.coupleId, input.listId, input.itemId, transaction);
      }

      await touchList(member.coupleId, input.listId, now, transaction);
      return toListItem(changed);
    });
  },
});

export const uncheckListItemAction = defineMemberAction({
  schema: itemIdSchema,
  handler: async ({ input, member }): Promise<ListItem> => {
    await findItemOrFail(member.coupleId, input.listId, input.itemId);

    const now = new Date();
    return getDatabase().transaction(async (transaction) => {
      const changed = await uncheckListItemIfChecked(
        member.coupleId,
        input.listId,
        input.itemId,
        now,
        transaction,
      );
      if (!changed) {
        return currentItemState(member.coupleId, input.listId, input.itemId, transaction);
      }

      await touchList(member.coupleId, input.listId, now, transaction);
      return toListItem(changed);
    });
  },
});

export const removeListItemAction = defineMemberAction({
  schema: itemIdSchema,
  handler: async ({ input, member }): Promise<null> => {
    await findItemOrFail(member.coupleId, input.listId, input.itemId);

    const now = new Date();
    const deleted = await softDeleteListItem(member.coupleId, input.listId, input.itemId, now);
    if (!deleted) throw new ActionFailure('failed', 'Item não encontrado');

    await touchList(member.coupleId, input.listId, now);
    return null;
  },
});

export const clearCheckedItemsAction = defineMemberAction({
  schema: clearCheckedSchema,
  handler: async ({ input, member }): Promise<null> => {
    await findListOrFail(member.coupleId, input.listId);

    const now = new Date();
    const cleared = await clearCheckedListItems(member.coupleId, input.listId, now);
    if (cleared.length > 0) await touchList(member.coupleId, input.listId, now);
    return null;
  },
});
