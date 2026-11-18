import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { healthEvents, type HealthEventRow, type NewHealthEventRow } from './health-records.entity';

/** Único acesso à tabela `health_events`. Todo método recebe `coupleId` e `memberId`. */
@Injectable()
export class HealthEventsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByMember(coupleId: string, memberId: string): Promise<HealthEventRow[]> {
    return this.db
      .select()
      .from(healthEvents)
      .where(this.activeOfMember(coupleId, memberId))
      .orderBy(desc(healthEvents.occurredOn), desc(healthEvents.createdAt));
  }

  async findActive(
    coupleId: string,
    memberId: string,
    itemId: string,
  ): Promise<HealthEventRow | null> {
    const result = await this.db
      .select()
      .from(healthEvents)
      .where(and(this.activeOfMember(coupleId, memberId), eq(healthEvents.id, itemId)))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewHealthEventRow): Promise<HealthEventRow> {
    const result = await this.db.insert(healthEvents).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar evento de saúde');
    return result[0];
  }

  async update(
    coupleId: string,
    memberId: string,
    itemId: string,
    data: Partial<NewHealthEventRow>,
  ): Promise<HealthEventRow> {
    const result = await this.db
      .update(healthEvents)
      .set(data)
      .where(and(this.activeOfMember(coupleId, memberId), eq(healthEvents.id, itemId)))
      .returning();
    if (!result[0]) throw new Error('Falha ao atualizar evento de saúde');
    return result[0];
  }

  async softDelete(coupleId: string, memberId: string, itemId: string): Promise<boolean> {
    const result = await this.db
      .update(healthEvents)
      .set({ isActive: false })
      .where(and(this.activeOfMember(coupleId, memberId), eq(healthEvents.id, itemId)))
      .returning({ id: healthEvents.id });

    return result.length > 0;
  }

  private activeOfMember(coupleId: string, memberId: string) {
    return and(
      eq(healthEvents.coupleId, coupleId),
      eq(healthEvents.memberId, memberId),
      eq(healthEvents.isActive, true),
    );
  }
}
