import { and, eq, ne } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import { user } from '@/db/auth-schema';
import { people } from '@/db/people-schema';
import type { ProfileRow, ProfileUpdates } from './profile-response';

export async function findProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const [row] = await getDatabase()
    .select({
      email: user.email,
      fullName: people.fullName,
      cpf: people.cpf,
      phone: people.phone,
    })
    .from(user)
    .leftJoin(people, eq(people.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

export async function isCpfUsedByAnotherUser(cpf: string, userId: string): Promise<boolean> {
  const [row] = await getDatabase()
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.cpf, cpf), ne(people.userId, userId)))
    .limit(1);
  return row !== undefined;
}

/**
 * Cria a linha na primeira gravação (o seed não a cria) e atualiza nas
 * seguintes. `fallbackFullName` só vale quando a linha ainda não existe e o
 * pedido não trouxe o nome, que é obrigatório na tabela.
 */
export async function upsertProfile(
  userId: string,
  updates: ProfileUpdates,
  fallbackFullName: string,
): Promise<void> {
  await getDatabase()
    .insert(people)
    .values({ userId, fullName: updates.fullName ?? fallbackFullName, ...updates })
    .onConflictDoUpdate({ target: people.userId, set: updates });
}

/** `null` remove a foto e devolve o avatar à inicial colorida. */
export async function updateUserImage(userId: string, image: string | null): Promise<void> {
  await getDatabase().update(user).set({ image }).where(eq(user.id, userId));
}

export async function findUserDisplayName(userId: string): Promise<string> {
  const [row] = await getDatabase()
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.name ?? '';
}
