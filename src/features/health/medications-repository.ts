import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { getDatabase, type DatabaseExecutor } from '@/db/client';
import { medications, type MedicationRow, type NewMedicationRow } from '@/db/medications-schema';

// Todo método recebe `coupleId`. A exclusão é lógica (`is_active = false`).

export type MedicationCountRow = { memberId: string; medicationCount: number };

function activeMedication(coupleId: string, medicationId: string): SQL {
  const condition = and(
    eq(medications.coupleId, coupleId),
    eq(medications.id, medicationId),
    eq(medications.isActive, true),
  );
  if (!condition) throw new Error('Condição de remédio vazia');
  return condition;
}

/** Só remédios com estoque controlado têm o que descontar ou devolver. */
function stockControlled(coupleId: string, medicationId: string): SQL {
  const condition = and(
    activeMedication(coupleId, medicationId),
    sql`${medications.stockUnits} is not null`,
  );
  if (!condition) throw new Error('Condição de estoque vazia');
  return condition;
}

export async function listMedicationsByMember(
  coupleId: string,
  memberId: string,
): Promise<MedicationRow[]> {
  return getDatabase()
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

export async function countMedicationsByMember(coupleId: string): Promise<MedicationCountRow[]> {
  return getDatabase()
    .select({ memberId: medications.memberId, medicationCount: sql<number>`count(*)::int` })
    .from(medications)
    .where(and(eq(medications.coupleId, coupleId), eq(medications.isActive, true)))
    .groupBy(medications.memberId);
}

export async function findActiveMedication(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor = getDatabase(),
): Promise<MedicationRow | null> {
  const [row] = await executor
    .select()
    .from(medications)
    .where(activeMedication(coupleId, medicationId))
    .limit(1);
  return row ?? null;
}

export async function insertMedication(
  data: NewMedicationRow,
  executor: DatabaseExecutor,
): Promise<MedicationRow> {
  const [row] = await executor.insert(medications).values(data).returning();
  if (!row) throw new Error('Falha ao criar remédio');
  return row;
}

export async function updateMedication(
  coupleId: string,
  medicationId: string,
  data: Partial<NewMedicationRow>,
  executor: DatabaseExecutor,
): Promise<MedicationRow> {
  const [row] = await executor
    .update(medications)
    .set(data)
    .where(activeMedication(coupleId, medicationId))
    .returning();
  if (!row) throw new Error('Remédio não encontrado para editar');
  return row;
}

export async function softDeleteMedication(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor,
): Promise<boolean> {
  const deleted = await executor
    .update(medications)
    .set({ isActive: false })
    .where(activeMedication(coupleId, medicationId))
    .returning({ id: medications.id });
  return deleted.length > 0;
}

/** Desconta uma dose sem passar de zero. Só age quando o estoque é controlado. */
export async function decrementStock(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor,
): Promise<MedicationRow | null> {
  const [row] = await executor
    .update(medications)
    .set({ stockUnits: sql`greatest(${medications.stockUnits} - ${medications.unitsPerDose}, 0)` })
    .where(stockControlled(coupleId, medicationId))
    .returning();
  return row ?? null;
}

export async function incrementStock(
  coupleId: string,
  medicationId: string,
  executor: DatabaseExecutor,
): Promise<void> {
  await executor
    .update(medications)
    .set({ stockUnits: sql`${medications.stockUnits} + ${medications.unitsPerDose}` })
    .where(stockControlled(coupleId, medicationId));
}

/**
 * Grava que a pergunta da Farmácia já foi feita. O `WHERE ... IS NULL` serializa
 * conclusões simultâneas: só uma delas recebe a linha de volta.
 */
export async function markLowStockPrompted(
  coupleId: string,
  medicationId: string,
  promptedAt: Date,
  executor: DatabaseExecutor,
): Promise<boolean> {
  const claimed = await executor
    .update(medications)
    .set({ lowStockPromptedAt: promptedAt })
    .where(and(activeMedication(coupleId, medicationId), isNull(medications.lowStockPromptedAt)))
    .returning({ id: medications.id });
  return claimed.length > 0;
}
