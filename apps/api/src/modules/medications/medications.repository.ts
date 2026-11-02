import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { DATABASE, type Database, type DatabaseTransaction } from '../../database/database.module';
import { medications, type MedicationRow, type NewMedicationRow } from './medication.entity';

export type MedicationCountRow = {
  memberId: string;
  medicationCount: number;
};

/**
 * Único acesso à tabela `medications`. Todo método recebe `coupleId`; a
 * exclusão é lógica (`is_active = false`).
 */
@Injectable()
export class MedicationsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByMember(coupleId: string, memberId: string): Promise<MedicationRow[]> {
    return this.db
      .select()
      .from(medications)
      .where(
        and(
          eq(medications.coupleId, coupleId),
          eq(medications.memberId, memberId),
          eq(medications.isActive, true),
        ),
      )
      .orderBy(asc(medications.createdAt));
  }

  async countByMember(coupleId: string): Promise<MedicationCountRow[]> {
    return this.db
      .select({
        memberId: medications.memberId,
        medicationCount: sql<number>`count(*)::int`,
      })
      .from(medications)
      .where(and(eq(medications.coupleId, coupleId), eq(medications.isActive, true)))
      .groupBy(medications.memberId);
  }

  async findActive(
    coupleId: string,
    medicationId: string,
    tx?: DatabaseTransaction,
  ): Promise<MedicationRow | null> {
    const client = tx ?? this.db;
    const result = await client
      .select()
      .from(medications)
      .where(
        and(
          eq(medications.coupleId, coupleId),
          eq(medications.id, medicationId),
          eq(medications.isActive, true),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewMedicationRow, tx: DatabaseTransaction): Promise<MedicationRow> {
    const result = await tx.insert(medications).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar remédio');
    return result[0];
  }

  async update(
    coupleId: string,
    medicationId: string,
    data: Partial<NewMedicationRow>,
    tx: DatabaseTransaction,
  ): Promise<MedicationRow> {
    const result = await tx
      .update(medications)
      .set(data)
      .where(
        and(
          eq(medications.coupleId, coupleId),
          eq(medications.id, medicationId),
          eq(medications.isActive, true),
        ),
      )
      .returning();
    if (!result[0]) throw new Error('Remédio não encontrado para editar');
    return result[0];
  }

  async softDelete(
    coupleId: string,
    medicationId: string,
    tx: DatabaseTransaction,
  ): Promise<boolean> {
    const result = await tx
      .update(medications)
      .set({ isActive: false })
      .where(
        and(
          eq(medications.coupleId, coupleId),
          eq(medications.id, medicationId),
          eq(medications.isActive, true),
        ),
      )
      .returning({ id: medications.id });

    return result.length > 0;
  }

  /** Desconta uma dose sem passar de zero. Só age quando o estoque é controlado. */
  async decrementStock(
    coupleId: string,
    medicationId: string,
    tx: DatabaseTransaction,
  ): Promise<MedicationRow | null> {
    const result = await tx
      .update(medications)
      .set({
        stockUnits: sql`greatest(${medications.stockUnits} - ${medications.unitsPerDose}, 0)`,
      })
      .where(this.stockControlled(coupleId, medicationId))
      .returning();

    return result[0] ?? null;
  }

  async incrementStock(
    coupleId: string,
    medicationId: string,
    tx: DatabaseTransaction,
  ): Promise<void> {
    await tx
      .update(medications)
      .set({ stockUnits: sql`${medications.stockUnits} + ${medications.unitsPerDose}` })
      .where(this.stockControlled(coupleId, medicationId));
  }

  /**
   * Grava que a pergunta da Farmácia já foi feita. O `WHERE ... IS NULL`
   * serializa conclusões simultâneas: só uma delas recebe a linha de volta.
   */
  async markLowStockPrompted(
    coupleId: string,
    medicationId: string,
    promptedAt: Date,
    tx: DatabaseTransaction,
  ): Promise<boolean> {
    const result = await tx
      .update(medications)
      .set({ lowStockPromptedAt: promptedAt })
      .where(
        and(
          eq(medications.coupleId, coupleId),
          eq(medications.id, medicationId),
          eq(medications.isActive, true),
          isNull(medications.lowStockPromptedAt),
        ),
      )
      .returning({ id: medications.id });

    return result.length > 0;
  }

  private stockControlled(coupleId: string, medicationId: string) {
    return and(
      eq(medications.coupleId, coupleId),
      eq(medications.id, medicationId),
      eq(medications.isActive, true),
      sql`${medications.stockUnits} is not null`,
    );
  }
}
