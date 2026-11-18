import { Inject, Injectable } from '@nestjs/common';
import { and, eq, asc } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  healthConditions,
  type HealthConditionRow,
  type NewHealthConditionRow,
} from './health-records.entity';

/** Único acesso à tabela `health_conditions`. Todo método recebe `coupleId` e `memberId`. */
@Injectable()
export class HealthConditionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByMember(coupleId: string, memberId: string): Promise<HealthConditionRow[]> {
    return this.db
      .select()
      .from(healthConditions)
      .where(
        and(
          eq(healthConditions.coupleId, coupleId),
          eq(healthConditions.memberId, memberId),
          eq(healthConditions.isActive, true),
        ),
      )
      .orderBy(asc(healthConditions.createdAt));
  }

  async findActive(
    coupleId: string,
    memberId: string,
    itemId: string,
  ): Promise<HealthConditionRow | null> {
    const result = await this.db
      .select()
      .from(healthConditions)
      .where(
        and(
          and(
            eq(healthConditions.coupleId, coupleId),
            eq(healthConditions.memberId, memberId),
            eq(healthConditions.isActive, true),
          ),
          eq(healthConditions.id, itemId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewHealthConditionRow): Promise<HealthConditionRow> {
    const result = await this.db.insert(healthConditions).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar condição');
    return result[0];
  }

  async update(
    coupleId: string,
    memberId: string,
    itemId: string,
    data: Partial<NewHealthConditionRow>,
  ): Promise<HealthConditionRow> {
    const result = await this.db
      .update(healthConditions)
      .set(data)
      .where(
        and(
          and(
            eq(healthConditions.coupleId, coupleId),
            eq(healthConditions.memberId, memberId),
            eq(healthConditions.isActive, true),
          ),
          eq(healthConditions.id, itemId),
        ),
      )
      .returning();
    if (!result[0]) throw new Error('Condição não encontrado para editar');
    return result[0];
  }

  async softDelete(coupleId: string, memberId: string, itemId: string): Promise<boolean> {
    const result = await this.db
      .update(healthConditions)
      .set({ isActive: false })
      .where(
        and(
          and(
            eq(healthConditions.coupleId, coupleId),
            eq(healthConditions.memberId, memberId),
            eq(healthConditions.isActive, true),
          ),
          eq(healthConditions.id, itemId),
        ),
      )
      .returning({ id: healthConditions.id });

    return result.length > 0;
  }
}
