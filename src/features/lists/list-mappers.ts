import type { ListItemRow, ListRow } from '@/db/lists-schema';
import type { List, ListItem, ListSummary } from './list-schemas';

export type ListSummaryRow = {
  id: string;
  title: string;
  totalItems: number;
  checkedItems: number;
  updatedAt: Date;
};

export function toListItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    title: row.title,
    checkedAt: row.checkedAt ? row.checkedAt.toISOString() : null,
    checkedByMemberId: row.checkedByMemberId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toList(row: ListRow, items: ListItemRow[]): List {
  return {
    id: row.id,
    title: row.title,
    items: items.map(toListItem),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toListSummary(row: ListSummaryRow): ListSummary {
  return {
    id: row.id,
    title: row.title,
    totalItems: row.totalItems,
    checkedItems: row.checkedItems,
    updatedAt: row.updatedAt.toISOString(),
  };
}
