import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  LIST_ERROR_CODES,
  type CreateListItemRequest,
  type CreateListRequest,
  type List,
  type ListItem,
  type ListsResponse,
  type UpdateListItemRequest,
  type UpdateListRequest,
} from '@vibru/shared';
import { DATABASE, type Database } from '../../database/database.module';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import type { ListItemRow } from './list-item.entity';
import type { ListRow } from './list.entity';
import { ListsRepository } from './lists.repository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ListsService {
  constructor(
    private readonly listsRepository: ListsRepository,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async list(member: CurrentMemberContext): Promise<ListsResponse> {
    const summaries = await this.listsRepository.listSummaries(member.coupleId);

    return {
      lists: summaries.map((summary) => ({
        id: summary.id,
        title: summary.title,
        totalItems: summary.totalItems,
        checkedItems: summary.checkedItems,
        updatedAt: summary.updatedAt.toISOString(),
      })),
    };
  }

  async create(member: CurrentMemberContext, data: CreateListRequest): Promise<List> {
    const row = await this.listsRepository.create({
      coupleId: member.coupleId,
      title: data.title,
    });

    return toList(row, []);
  }

  async get(member: CurrentMemberContext, listId: string): Promise<List> {
    const row = await this.findListOrThrow(member.coupleId, listId);
    const items = await this.listsRepository.listItemsByList(member.coupleId, row.id);

    return toList(row, items);
  }

  async rename(
    member: CurrentMemberContext,
    listId: string,
    data: UpdateListRequest,
  ): Promise<List> {
    await this.findListOrThrow(member.coupleId, listId);

    const renamed = await this.listsRepository.updateTitle(
      member.coupleId,
      listId,
      data.title,
      new Date(),
    );
    const items = await this.listsRepository.listItemsByList(member.coupleId, listId);

    return toList(renamed, items);
  }

  async remove(member: CurrentMemberContext, listId: string): Promise<void> {
    await this.findListOrThrow(member.coupleId, listId);

    const deleted = await this.listsRepository.softDelete(member.coupleId, listId, new Date());
    if (!deleted) throw this.listNotFound();
  }

  async addItem(
    member: CurrentMemberContext,
    listId: string,
    data: CreateListItemRequest,
  ): Promise<ListItem> {
    await this.findListOrThrow(member.coupleId, listId);

    const row = await this.listsRepository.createItem({
      coupleId: member.coupleId,
      listId,
      title: data.title,
    });
    await this.listsRepository.touch(member.coupleId, listId, new Date());

    return toListItem(row);
  }

  async editItem(
    member: CurrentMemberContext,
    listId: string,
    itemId: string,
    data: UpdateListItemRequest,
  ): Promise<ListItem> {
    await this.findItemOrThrow(member.coupleId, listId, itemId);

    const row = await this.listsRepository.updateItemTitle(
      member.coupleId,
      listId,
      itemId,
      data.title,
    );
    await this.listsRepository.touch(member.coupleId, listId, new Date());

    return toListItem(row);
  }

  async checkItem(member: CurrentMemberContext, listId: string, itemId: string): Promise<ListItem> {
    await this.findItemOrThrow(member.coupleId, listId, itemId);

    const now = new Date();
    return this.db.transaction(async (tx) => {
      const changed = await this.listsRepository.checkIfOpen(
        member.coupleId,
        listId,
        itemId,
        member.memberId,
        now,
        tx,
      );
      if (!changed) return this.currentItemState(member.coupleId, listId, itemId, tx);

      await this.listsRepository.touch(member.coupleId, listId, now, tx);
      return toListItem(changed);
    });
  }

  async uncheckItem(
    member: CurrentMemberContext,
    listId: string,
    itemId: string,
  ): Promise<ListItem> {
    await this.findItemOrThrow(member.coupleId, listId, itemId);

    const now = new Date();
    return this.db.transaction(async (tx) => {
      const changed = await this.listsRepository.uncheckIfChecked(
        member.coupleId,
        listId,
        itemId,
        now,
        tx,
      );
      if (!changed) return this.currentItemState(member.coupleId, listId, itemId, tx);

      await this.listsRepository.touch(member.coupleId, listId, now, tx);
      return toListItem(changed);
    });
  }

  async removeItem(member: CurrentMemberContext, listId: string, itemId: string): Promise<void> {
    await this.findItemOrThrow(member.coupleId, listId, itemId);

    const now = new Date();
    const deleted = await this.listsRepository.softDeleteItem(member.coupleId, listId, itemId, now);
    if (!deleted) throw this.itemNotFound();

    await this.listsRepository.touch(member.coupleId, listId, now);
  }

  async clearChecked(member: CurrentMemberContext, listId: string): Promise<void> {
    await this.findListOrThrow(member.coupleId, listId);

    const now = new Date();
    const cleared = await this.listsRepository.clearChecked(member.coupleId, listId, now);
    if (cleared.length === 0) return;

    await this.listsRepository.touch(member.coupleId, listId, now);
  }

  private async currentItemState(
    coupleId: string,
    listId: string,
    itemId: string,
    tx: Parameters<ListsRepository['findActiveItem']>[3],
  ): Promise<ListItem> {
    const row = await this.listsRepository.findActiveItem(coupleId, listId, itemId, tx);
    if (!row) throw this.itemNotFound();

    return toListItem(row);
  }

  private async findListOrThrow(coupleId: string, listId: string): Promise<ListRow> {
    if (!UUID_PATTERN.test(listId)) throw this.listNotFound();

    const row = await this.listsRepository.findActiveById(coupleId, listId);
    if (!row) throw this.listNotFound();

    return row;
  }

  private async findItemOrThrow(
    coupleId: string,
    listId: string,
    itemId: string,
  ): Promise<ListItemRow> {
    await this.findListOrThrow(coupleId, listId);
    if (!UUID_PATTERN.test(itemId)) throw this.itemNotFound();

    const row = await this.listsRepository.findActiveItem(coupleId, listId, itemId);
    if (!row) throw this.itemNotFound();

    return row;
  }

  private listNotFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Lista não encontrada',
      code: LIST_ERROR_CODES.LIST_NOT_FOUND,
      requestId: '',
      path: '/api/lists',
      timestamp: new Date().toISOString(),
    });
  }

  private itemNotFound(): NotFoundException {
    return new NotFoundException({
      statusCode: 404,
      error: 'Not Found',
      message: 'Item não encontrado',
      code: LIST_ERROR_CODES.LIST_ITEM_NOT_FOUND,
      requestId: '',
      path: '/api/lists',
      timestamp: new Date().toISOString(),
    });
  }
}

function toListItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    title: row.title,
    checkedAt: row.checkedAt ? row.checkedAt.toISOString() : null,
    checkedByMemberId: row.checkedByMemberId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toList(row: ListRow, items: ListItemRow[]): List {
  return {
    id: row.id,
    title: row.title,
    items: items.map(toListItem),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
