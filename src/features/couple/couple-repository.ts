import { and, asc, eq } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import { user } from '@/db/auth-schema';
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

/**
 * A foto mora em `user.image`. Fica numa busca à parte para que os outros
 * chamadores de `findCoupleMembers` não carreguem o texto da imagem à toa.
 */
export async function findCoupleMemberAvatars(
  coupleId: string,
): Promise<Array<{ memberId: string; avatarUrl: string | null }>> {
  return getDatabase()
    .select({ memberId: coupleMembers.id, avatarUrl: user.image })
    .from(coupleMembers)
    .innerJoin(user, eq(user.id, coupleMembers.userId))
    .where(eq(coupleMembers.coupleId, coupleId));
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

/** Dono do feed ICS: o token da URL é a credencial, então a busca é pelo hash dele. */
export async function findMemberByIcsTokenHash(tokenHash: string): Promise<CoupleMemberRow | null> {
  const [member] = await getDatabase()
    .select()
    .from(coupleMembers)
    .where(eq(coupleMembers.icsTokenHash, tokenHash))
    .limit(1);
  return member ?? null;
}

/** Trocar o hash invalida o token anterior na mesma escrita; nulo desliga o feed. */
export async function updateMemberIcsTokenHash(
  coupleId: string,
  memberId: string,
  tokenHash: string | null,
): Promise<void> {
  const updatedRows = await getDatabase()
    .update(coupleMembers)
    .set({ icsTokenHash: tokenHash })
    .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.id, memberId)))
    .returning({ id: coupleMembers.id });
  if (updatedRows.length === 0) throw new Error('Couple member not found');
}
