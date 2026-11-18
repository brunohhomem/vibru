import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { DATABASE, type Database, type DatabaseTransaction } from '../../database/database.module';
import { listItems, type ListItemRow, type NewListItemRow } from './list-item.entity';
import { lists, type ListRow, type NewListRow } from './list.entity';

export type ListSummaryRow = {
  id: string;
  title: string;
  totalItems: number;
  checkedItems: number;
  updatedAt: Date;
};

/**
 * Único acesso às tabelas `lists` e `list_items`. Todo método de domínio
 * recebe `coupleId`; a exclusão é lógica nas duas tabelas.
 */
@Injectable()
export class ListsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listSummaries(coupleId: string): Promise<ListSummaryRow[]> {
    const totalItems = sql<number>`count(${listItems.id}) filter (where ${listItems.isActive})::int`;
    const checkedItems = sql<number>`count(${listItems.id}) filter (where ${listItems.isActive} and ${listItems.checkedAt} is not null)::int`;

    return this.db
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

  async findActiveById(
    coupleId: string,
    listId: string,
    tx?: DatabaseTransaction,
  ): Promise<ListRow | null> {
    const client = tx ?? this.db;
    const result = await client
      .select()
      .from(lists)
      .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewListRow): Promise<ListRow> {
    const result = await this.db.insert(lists).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar lista');
    return result[0];
  }

  async updateTitle(
    coupleId: string,
    listId: string,
    title: string,
    updatedAt: Date,
  ): Promise<ListRow> {
    const result = await this.db
      .update(lists)
      .set({ title, updatedAt })
      .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)))
      .returning();
    if (!result[0]) throw new Error('Lista não encontrada para renomear');
    return result[0];
  }

  /** Sobe a lista na ordenação de atividade sem alterar nenhum outro campo. */
  async touch(
    coupleId: string,
    listId: string,
    updatedAt: Date,
    tx?: DatabaseTransaction,
  ): Promise<void> {
    const client = tx ?? this.db;
    await client
      .update(lists)
      .set({ updatedAt })
      .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)));
  }

  async softDelete(coupleId: string, listId: string, updatedAt: Date): Promise<ListRow | null> {
    const result = await this.db
      .update(lists)
      .set({ isActive: false, updatedAt })
      .where(and(eq(lists.coupleId, coupleId), eq(lists.id, listId), eq(lists.isActive, true)))
      .returning();

    return result[0] ?? null;
  }

  async listItemsByList(
    coupleId: string,
    listId: string,
    tx?: DatabaseTransaction,
  ): Promise<ListItemRow[]> {
    const client = tx ?? this.db;

    return client
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

  async findActiveItem(
    coupleId: string,
    listId: string,
    itemId: string,
    tx?: DatabaseTransaction,
  ): Promise<ListItemRow | null> {
    const client = tx ?? this.db;
    const result = await client
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

    return result[0] ?? null;
  }

  async createItem(data: NewListItemRow): Promise<ListItemRow> {
    const result = await this.db.insert(listItems).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar item');
    return result[0];
  }

  async updateItemTitle(
    coupleId: string,
    listId: string,
    itemId: string,
    title: string,
  ): Promise<ListItemRow> {
    const result = await this.db
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
    if (!result[0]) throw new Error('Item não encontrado para editar');
    return result[0];
  }

  /**
   * Marca somente se o item ainda estiver aberto. Duas marcações simultâneas
   * serializam no `WHERE`: a segunda não encontra a linha e o service devolve
   * o estado atual (idempotência).
   */
  async checkIfOpen(
    coupleId: string,
    listId: string,
    itemId: string,
    memberId: string,
    checkedAt: Date,
    tx: DatabaseTransaction,
  ): Promise<ListItemRow | null> {
    const result = await tx
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

    return result[0] ?? null;
  }

  /** Desmarca somente se o item estiver marcado. Mesma garantia de `checkIfOpen`. */
  async uncheckIfChecked(
    coupleId: string,
    listId: string,
    itemId: string,
    updatedAt: Date,
    tx: DatabaseTransaction,
  ): Promise<ListItemRow | null> {
    const result = await tx
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

    return result[0] ?? null;
  }

  async softDeleteItem(
    coupleId: string,
    listId: string,
    itemId: string,
    updatedAt: Date,
  ): Promise<ListItemRow | null> {
    const result = await this.db
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

    return result[0] ?? null;
  }

  async clearChecked(coupleId: string, listId: string, updatedAt: Date): Promise<ListItemRow[]> {
    return this.db
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
}
