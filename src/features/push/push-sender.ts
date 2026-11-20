import { sendNotification, setVapidDetails, WebPushError } from 'web-push';
import { getEnv } from '@/lib/env';
import type { PushPayload } from './push-payloads';
import {
  deleteExpiredPushSubscription,
  listMemberSubscriptions,
  type StoredSubscription,
} from './push-repository';

type SendOutcome = 'sent' | 'expired' | 'failed';

const GONE_STATUS_CODES = new Set([404, 410]);
// Se o aparelho está desligado, o serviço guarda o aviso por até 1 dia; depois descarta.
const TIME_TO_LIVE_SECONDS = 86_400;

let vapidConfigured = false;

/** Falso quando as chaves não existem: o app segue funcionando, só sem push. */
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const env = getEnv();
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = env;
  if (!publicKey || !privateKey) return false;

  setVapidDetails(env.VAPID_SUBJECT ?? env.BETTER_AUTH_URL, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

async function sendToSubscription(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<SendOutcome> {
  try {
    await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: TIME_TO_LIVE_SECONDS },
    );
    return 'sent';
  } catch (error) {
    if (error instanceof WebPushError && GONE_STATUS_CODES.has(error.statusCode)) return 'expired';
    return 'failed';
  }
}

/**
 * Envia para todos os aparelhos de uma pessoa e apaga os que o serviço de push disse
 * que não existem mais. Nunca lança: aviso que falha não pode derrubar quem o causou.
 */
export async function sendPushToMember(
  coupleId: string,
  memberId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    if (!ensureVapidConfigured()) return;

    const subscriptions = await listMemberSubscriptions(coupleId, memberId);
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const outcome = await sendToSubscription(subscription, payload);
        if (outcome === 'expired') await deleteExpiredPushSubscription(subscription.endpoint);
      }),
    );
  } catch {
    // Falha de banco ou de rede no aviso é ignorada de propósito (ver o comentário acima).
  }
}

/** Resumo diário: aqui o chamador já tem as inscrições e quer o resultado de cada uma. */
export async function sendPushToSubscription(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<SendOutcome> {
  if (!ensureVapidConfigured()) return 'failed';

  const outcome = await sendToSubscription(subscription, payload);
  if (outcome === 'expired') await deleteExpiredPushSubscription(subscription.endpoint);
  return outcome;
}
