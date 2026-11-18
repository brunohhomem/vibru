import { and, eq } from 'drizzle-orm';
import { account, session, user } from '@/db/auth-schema';
import { getDatabase } from '@/db/client';

const CREDENTIAL_PROVIDER_ID = 'credential';

export async function findCredentialHash(userId: string): Promise<string | null> {
  const [row] = await getDatabase()
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)))
    .limit(1);
  return row?.password ?? null;
}

/**
 * Troca a senha do parceiro por uma provisória: a pessoa troca no próximo acesso
 * e as sessões antigas caem. Tudo ou nada; sem conta de credencial, nada muda.
 */
export async function replacePartnerCredentials(
  partnerUserId: string,
  passwordHash: string,
): Promise<void> {
  await getDatabase().transaction(async (transaction) => {
    const updated = await transaction
      .update(account)
      .set({ password: passwordHash })
      .where(and(eq(account.userId, partnerUserId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)))
      .returning({ id: account.id });
    if (updated.length === 0) throw new Error('Partner has no credential account');

    await transaction
      .update(user)
      .set({ mustChangePassword: true })
      .where(eq(user.id, partnerUserId));
    await transaction.delete(session).where(eq(session.userId, partnerUserId));
  });
}
