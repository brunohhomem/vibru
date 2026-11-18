import { describe, expect, it } from 'vitest';
import type { ListItemRow, ListRow } from '@/db/lists-schema';
import { toList, toListItem, toListSummary } from './list-mappers';

function listRow(overrides: Partial<ListRow> = {}): ListRow {
  return {
    id: 'list-1',
    isActive: true,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-02T10:00:00.000Z'),
    coupleId: 'couple-1',
    title: 'Mercado',
    ...overrides,
  };
}

function itemRow(overrides: Partial<ListItemRow> = {}): ListItemRow {
  return {
    id: 'item-1',
    isActive: true,
    createdAt: new Date('2026-10-01T11:00:00.000Z'),
    updatedAt: new Date('2026-10-01T11:00:00.000Z'),
    coupleId: 'couple-1',
    listId: 'list-1',
    title: 'Leite',
    checkedAt: null,
    checkedByMemberId: null,
    ...overrides,
  };
}

describe('toListItem', () => {
  it('item aberto tem checkedAt e checkedByMemberId nulos', () => {
    expect(toListItem(itemRow())).toEqual({
      id: 'item-1',
      title: 'Leite',
      checkedAt: null,
      checkedByMemberId: null,
      createdAt: '2026-10-01T11:00:00.000Z',
    });
  });

  it('item marcado leva a data em ISO e quem marcou', () => {
    expect(
      toListItem(
        itemRow({ checkedAt: new Date('2026-10-03T08:00:00.000Z'), checkedByMemberId: 'member-1' }),
      ),
    ).toMatchObject({ checkedAt: '2026-10-03T08:00:00.000Z', checkedByMemberId: 'member-1' });
  });
});

describe('toList', () => {
  it('leva os itens na ordem recebida e as datas em ISO', () => {
    const list = toList(listRow(), [itemRow({ id: 'a' }), itemRow({ id: 'b' })]);

    expect(list).toMatchObject({
      id: 'list-1',
      title: 'Mercado',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
    });
    expect(list.items.map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('toListSummary', () => {
  it('leva as contagens e a atualização em ISO', () => {
    expect(
      toListSummary({
        id: 'list-1',
        title: 'Mercado',
        totalItems: 5,
        checkedItems: 2,
        updatedAt: new Date('2026-10-02T10:00:00.000Z'),
      }),
    ).toEqual({
      id: 'list-1',
      title: 'Mercado',
      totalItems: 5,
      checkedItems: 2,
      updatedAt: '2026-10-02T10:00:00.000Z',
    });
  });
});
