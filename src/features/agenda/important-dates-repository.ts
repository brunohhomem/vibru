import { and, asc, eq, type SQL } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import {
  importantDates,
  type ImportantDateRow,
  type NewImportantDateRow,
} from '@/db/agenda-schema';

// Todo método recebe `coupleId`. A exclusão é lógica (`is_active = false`).

function activeOfCouple(coupleId: string): SQL {
  const condition = and(eq(importantDates.coupleId, coupleId), eq(importantDates.isActive, true));
  if (!condition) throw new Error('Condição de data vazia');
  return condition;
}

function activeDate(coupleId: string, dateId: string): SQL {
  const condition = and(activeOfCouple(coupleId), eq(importantDates.id, dateId));
  if (!condition) throw new Error('Condição de data vazia');
  return condition;
}

export async function listImportantDates(coupleId: string): Promise<ImportantDateRow[]> {
  return getDatabase()
    .select()
    .from(importantDates)
    .where(activeOfCouple(coupleId))
    .orderBy(asc(importantDates.createdAt));
}

export async function findActiveImportantDate(
  coupleId: string,
  dateId: string,
): Promise<ImportantDateRow | null> {
  const [row] = await getDatabase()
    .select()
    .from(importantDates)
    .where(activeDate(coupleId, dateId))
    .limit(1);
  return row ?? null;
}

export async function insertImportantDate(data: NewImportantDateRow): Promise<ImportantDateRow> {
  const [row] = await getDatabase().insert(importantDates).values(data).returning();
  if (!row) throw new Error('Falha ao criar data importante');
  return row;
}

export async function updateImportantDate(
  coupleId: string,
  dateId: string,
  data: Partial<NewImportantDateRow>,
): Promise<ImportantDateRow> {
  const [row] = await getDatabase()
    .update(importantDates)
    .set(data)
    .where(activeDate(coupleId, dateId))
    .returning();
  if (!row) throw new Error('Falha ao atualizar data importante');
  return row;
}

export async function softDeleteImportantDate(coupleId: string, dateId: string): Promise<boolean> {
  const deleted = await getDatabase()
    .update(importantDates)
    .set({ isActive: false })
    .where(activeDate(coupleId, dateId))
    .returning({ id: importantDates.id });
  return deleted.length > 0;
}
