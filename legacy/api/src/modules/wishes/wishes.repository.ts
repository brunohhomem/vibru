import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, getTableColumns, isNotNull, isNull, sql } from 'drizzle-orm';
import type { WishStatus } from '@vibru/shared';
import { DATABASE, type Database } from '../../database/database.module';
import { agendaEvents } from '../agenda/agenda.entity';
import { wishes, type NewWishRow, type WishRow } from './wish.entity';

export type WishWithPlan = WishRow & { plannedOn: string | null };

/** Único acesso à tabela `wishes`. Todo método recebe `coupleId`. */
@Injectable()
export class WishesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByStatus(coupleId: string, status: WishStatus, today: string): Promise<WishWithPlan[]> {
    const isDone = status === 'done';

    return this.selectWithPlan(today)
      .where(
        and(
          this.activeOfCouple(coupleId),
          isDone ? isNotNull(wishes.doneAt) : isNull(wishes.doneAt),
        ),
      )
      .orderBy(isDone ? desc(wishes.doneAt) : asc(wishes.createdAt));
  }

  async findActive(coupleId: string, wishId: string, today: string): Promise<WishWithPlan | null> {
    const result = await this.selectWithPlan(today)
      .where(and(this.activeOfCouple(coupleId), eq(wishes.id, wishId)))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewWishRow): Promise<WishRow> {
    const result = await this.db.insert(wishes).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar desejo');
    return result[0];
  }

  async update(coupleId: string, wishId: string, data: Partial<NewWishRow>): Promise<void> {
    await this.db
      .update(wishes)
      .set(data)
      .where(and(this.activeOfCouple(coupleId), eq(wishes.id, wishId)));
  }

  async softDelete(coupleId: string, wishId: string): Promise<boolean> {
    const result = await this.db
      .update(wishes)
      .set({ isActive: false })
      .where(and(this.activeOfCouple(coupleId), eq(wishes.id, wishId)))
      .returning({ id: wishes.id });

    return result.length > 0;
  }

  /**
   * `plannedOn`: o dia mais próximo, de hoje em diante, entre os eventos ativos
   * do desejo. Os nomes vão qualificados à mão: dentro de um select de uma
   * tabela só, o Drizzle escreve a coluna sem a tabela, e `"wish_id" = "id"`
   * compararia duas colunas de `events`.
   */
  private selectWithPlan(today: string) {
    const plannedOn = sql<string | null>`(
      select min("events"."starts_on")::text
      from ${agendaEvents}
      where "events"."wish_id" = "wishes"."id"
        and "events"."is_active" = true
        and "events"."starts_on" >= ${today}
    )`;

    return this.db
      .select({ ...getTableColumns(wishes), plannedOn })
      .from(wishes)
      .$dynamic();
  }

  private activeOfCouple(coupleId: string) {
    return and(eq(wishes.coupleId, coupleId), eq(wishes.isActive, true));
  }
}
