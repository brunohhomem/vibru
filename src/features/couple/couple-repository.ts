import { and, asc, eq } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import { coupleMembers, couples, type CoupleMemberRow, type CoupleRow } from '@/db/couple-schema';
import type { CoupleDates } from './couple-dates';

// Todo método exige coupleId: um membro nunca lê nem grava dados de outro casal.

export async function findCoupleById(coupleId: string): Promise<CoupleRow | null> {
  const [couple] = await getDatabase().select().from(couples).where(eq(couples.id, coupleId));
  return couple ?? null;
}

export async function findCoupleMembers(coupleId: string): Promise<CoupleMemberRow[]> {
  return getDatabase()
    .select()
    .from(coupleMembers)
    .where(eq(coupleMembers.coupleId, coupleId))
    .orderBy(asc(coupleMembers.createdAt));
}

export async function updateCoupleDates(coupleId: string, dates: CoupleDates): Promise<CoupleRow> {
  const [updated] = await getDatabase()
    .update(couples)
    .set(dates)
    .where(eq(couples.id, coupleId))
    .returning();
  if (!updated) throw new Error('Couple not found');
  return updated;
}

export async function updateMemberDisplayName(
  coupleId: string,
  memberId: string,
  displayName: string,
): Promise<void> {
  const updatedRows = await getDatabase()
    .update(coupleMembers)
    .set({ displayName })
    .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.id, memberId)))
    .returning({ id: coupleMembers.id });
  if (updatedRows.length === 0) throw new Error('Couple member not found');
}
