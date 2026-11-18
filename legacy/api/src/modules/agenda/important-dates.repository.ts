import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { importantDates, type ImportantDateRow, type NewImportantDateRow } from './agenda.entity';

/** Único acesso à tabela `important_dates`. Todo método recebe `coupleId`. */
@Injectable()
export class ImportantDatesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByCouple(coupleId: string): Promise<ImportantDateRow[]> {
    return this.db
      .select()
      .from(importantDates)
      .where(this.activeOfCouple(coupleId))
      .orderBy(asc(importantDates.createdAt));
  }

  async findActive(coupleId: string, dateId: string): Promise<ImportantDateRow | null> {
    const result = await this.db
      .select()
      .from(importantDates)
      .where(and(this.activeOfCouple(coupleId), eq(importantDates.id, dateId)))
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewImportantDateRow): Promise<ImportantDateRow> {
    const result = await this.db.insert(importantDates).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar data importante');
    return result[0];
  }

  async update(
    coupleId: string,
    dateId: string,
    data: Partial<NewImportantDateRow>,
  ): Promise<ImportantDateRow> {
    const result = await this.db
      .update(importantDates)
      .set(data)
      .where(and(this.activeOfCouple(coupleId), eq(importantDates.id, dateId)))
      .returning();
    if (!result[0]) throw new Error('Falha ao atualizar data importante');
    return result[0];
  }

  async softDelete(coupleId: string, dateId: string): Promise<boolean> {
    const result = await this.db
      .update(importantDates)
      .set({ isActive: false })
      .where(and(this.activeOfCouple(coupleId), eq(importantDates.id, dateId)))
      .returning({ id: importantDates.id });

    return result.length > 0;
  }

  private activeOfCouple(coupleId: string) {
    return and(eq(importantDates.coupleId, coupleId), eq(importantDates.isActive, true));
  }
}
