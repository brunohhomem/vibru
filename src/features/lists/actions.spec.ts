import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readSessionUserId: vi.fn(),
  findMemberContextByUserId: vi.fn(),
  findActiveList: vi.fn(),
  findActiveListItem: vi.fn(),
  checkListItemIfOpen: vi.fn(),
  uncheckListItemIfChecked: vi.fn(),
  clearCheckedListItems: vi.fn(),
  touchList: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ readSessionUserId: mocks.readSessionUserId }));
vi.mock('@/features/couple/membership', () => ({
  findMemberContextByUserId: mocks.findMemberContextByUserId,
}));
vi.mock('@/db/client', () => ({
  getDatabase: () => ({
    transaction: (callback: (transaction: unknown) => unknown) => callback({}),
  }),
}));
vi.mock('./lists-repository', () => ({
  findActiveList: mocks.findActiveList,
  findActiveListItem: mocks.findActiveListItem,
  checkListItemIfOpen: mocks.checkListItemIfOpen,
  uncheckListItemIfChecked: mocks.uncheckListItemIfChecked,
  clearCheckedListItems: mocks.clearCheckedListItems,
  touchList: mocks.touchList,
  insertList: vi.fn(),
  insertListItem: vi.fn(),
  listItemsOfList: vi.fn(),
  listSummaries: vi.fn(),
  softDeleteList: vi.fn(),
  softDeleteListItem: vi.fn(),
  updateListItemTitle: vi.fn(),
  updateListTitle: vi.fn(),
}));

import {
  checkListItemAction,
  clearCheckedItemsAction,
  getListAction,
  uncheckListItemAction,
} from './actions';

const LIST_ID = '0194c5e0-0000-7000-8000-000000000001';
const ITEM_ID = '0194c5e0-0000-7000-8000-000000000002';

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    isActive: true,
    createdAt: new Date('2026-10-01T11:00:00.000Z'),
    updatedAt: new Date('2026-10-01T11:00:00.000Z'),
    coupleId: 'couple-1',
    listId: LIST_ID,
    title: 'Leite',
    checkedAt: null,
    checkedByMemberId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.readSessionUserId.mockResolvedValue('user-a');
  mocks.findMemberContextByUserId.mockResolvedValue({ memberId: 'member-1', coupleId: 'couple-1' });
  mocks.findActiveList.mockResolvedValue({ id: LIST_ID, coupleId: 'couple-1', title: 'Mercado' });
  mocks.findActiveListItem.mockResolvedValue(itemRow());
});

describe('checkListItemAction', () => {
  it('marcar um item aberto marca e sobe a lista', async () => {
    mocks.checkListItemIfOpen.mockResolvedValue(
      itemRow({ checkedAt: new Date('2026-10-03T08:00:00.000Z'), checkedByMemberId: 'member-1' }),
    );

    const result = await checkListItemAction({ listId: LIST_ID, itemId: ITEM_ID });

    expect(result).toMatchObject({ ok: true, data: { checkedByMemberId: 'member-1' } });
    expect(mocks.touchList).toHaveBeenCalledTimes(1);
  });

  it('marcar um item já marcado devolve o estado atual e não toca a lista', async () => {
    mocks.checkListItemIfOpen.mockResolvedValue(null);
    mocks.findActiveListItem.mockResolvedValue(
      itemRow({ checkedAt: new Date('2026-10-03T08:00:00.000Z'), checkedByMemberId: 'member-2' }),
    );

    const result = await checkListItemAction({ listId: LIST_ID, itemId: ITEM_ID });

    expect(result).toMatchObject({ ok: true, data: { checkedByMemberId: 'member-2' } });
    expect(mocks.touchList).not.toHaveBeenCalled();
  });

  it('item de outra lista ou de outro casal não é encontrado e nada é alterado', async () => {
    mocks.findActiveListItem.mockResolvedValue(null);

    expect(await checkListItemAction({ listId: LIST_ID, itemId: ITEM_ID })).toMatchObject({
      ok: false,
      message: 'Item não encontrado',
    });
    expect(mocks.checkListItemIfOpen).not.toHaveBeenCalled();
  });
});

describe('uncheckListItemAction', () => {
  it('desmarcar um item aberto devolve o estado atual sem tocar a lista', async () => {
    mocks.uncheckListItemIfChecked.mockResolvedValue(null);

    const result = await uncheckListItemAction({ listId: LIST_ID, itemId: ITEM_ID });

    expect(result).toMatchObject({ ok: true, data: { checkedAt: null } });
    expect(mocks.touchList).not.toHaveBeenCalled();
  });
});

describe('clearCheckedItemsAction', () => {
  it('lista sem itens marcados não falha e não toca a lista', async () => {
    mocks.clearCheckedListItems.mockResolvedValue([]);

    expect(await clearCheckedItemsAction({ listId: LIST_ID })).toEqual({ ok: true, data: null });
    expect(mocks.touchList).not.toHaveBeenCalled();
  });

  it('com itens marcados limpa e sobe a lista', async () => {
    mocks.clearCheckedListItems.mockResolvedValue([itemRow()]);

    await clearCheckedItemsAction({ listId: LIST_ID });

    expect(mocks.touchList).toHaveBeenCalledTimes(1);
  });
});

describe('getListAction', () => {
  it('id que não é UUID vira lista não encontrada, sem consultar o banco', async () => {
    expect(await getListAction({ id: 'nao-uuid' })).toMatchObject({
      ok: false,
      message: 'Lista não encontrada',
    });
    expect(mocks.findActiveList).not.toHaveBeenCalled();
  });
});
