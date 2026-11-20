import { and, eq } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import { coupleMembers } from '@/db/couple-schema';
import { pushSubscriptions } from '@/db/push-schema';
import type { SubscribePushInput } from './push-schemas';

export type StoredSubscription = { endpoint: string; p256dh: string; auth: string };
export type SubscribedMember = StoredSubscription & { coupleId: string; memberId: string };

/**
 * Se o aparelho já estava inscrito (mesmo endpoint), a linha é atualizada em vez de
 * duplicada, e passa para o usuário atual: quem entra com outra conta no mesmo
 * aparelho não deixa a conta anterior recebendo os avisos dele.
 */
export async function upsertPushSubscription(
  userId: string,
  input: SubscribePushInput,
): Promise<void> {
  const values = {
    userId,
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
  };
  await getDatabase()
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { ...values, lastSeenAt: new Date() },
    });
}

/** Só remove a inscrição do próprio usuário: o endpoint sozinho não dá direito sobre a de outro. */
export async function deletePushSubscription(userId: string, endpoint: string): Promise<void> {
  await getDatabase()
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/** Para o envio: o serviço de push avisou que o aparelho não existe mais. */
export async function deleteExpiredPushSubscription(endpoint: string): Promise<void> {
  await getDatabase().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function listMemberSubscriptions(
  coupleId: string,
  memberId: string,
): Promise<StoredSubscription[]> {
  return getDatabase()
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(coupleMembers, eq(coupleMembers.userId, pushSubscriptions.userId))
    .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.id, memberId)));
}

/** Para o resumo diário, que roda sem sessão: lista quem tem aparelho inscrito, de todos os casais. */
export async function listSubscribedMembers(): Promise<SubscribedMember[]> {
  return getDatabase()
    .select({
      coupleId: coupleMembers.coupleId,
      memberId: coupleMembers.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(coupleMembers, eq(coupleMembers.userId, pushSubscriptions.userId));
}
