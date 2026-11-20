import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isIosDevice } from '@/features/install/install-environment';
import { readStandalone } from '@/features/install/read-standalone';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import { subscribePushAction, unsubscribePushAction } from '../actions';
import { decidePushState, vapidKeyToBytes, type PushState } from '../push-environment';

const SERVICE_WORKER_PATH = '/sw.js';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushStatus = PushState | 'loading';

async function findExistingSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

async function readPushState(): Promise<PushState> {
  const isSupported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const subscription = isSupported ? await findExistingSubscription() : null;

  return decidePushState({
    isSupported,
    isIos: isIosDevice(navigator.userAgent, navigator.maxTouchPoints),
    isStandalone: readStandalone(),
    permission: isSupported ? Notification.permission : 'default',
    hasSubscription: subscription !== null,
    hasVapidKey: VAPID_PUBLIC_KEY !== '',
  });
}

async function subscribeThisDevice(): Promise<void> {
  // O pedido de permissão precisa vir logo do toque do usuário; o iOS recusa depois de esperas.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('permission-not-granted');

  await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToBytes(VAPID_PUBLIC_KEY),
    }));

  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('invalid-subscription');
  unwrapActionResult(
    await subscribePushAction({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }),
  );
}

async function unsubscribeThisDevice(): Promise<void> {
  const subscription = await findExistingSubscription();
  if (!subscription) return;

  // Avisa o servidor primeiro: se falhar, a inscrição continua válida nos dois lados.
  unwrapActionResult(await unsubscribePushAction({ endpoint: subscription.endpoint }));
  await subscription.unsubscribe();
}

const PUSH_STATE_QUERY_KEY = ['push-state'] as const;

export function usePushNotifications() {
  const queryClient = useQueryClient();
  // O estado vive no navegador (permissão, inscrição), não no servidor: lê-lo como query
  // deixa o React Query cuidar do carregamento e de reler depois de ativar ou desativar.
  const state = useQuery({
    queryKey: PUSH_STATE_QUERY_KEY,
    queryFn: readPushState,
    staleTime: 0,
    retry: false,
  });
  const status: PushStatus = state.data ?? 'loading';

  const refresh = () => queryClient.invalidateQueries({ queryKey: PUSH_STATE_QUERY_KEY });
  const enable = useMutation({ mutationFn: subscribeThisDevice, onSettled: refresh });
  const disable = useMutation({ mutationFn: unsubscribeThisDevice, onSettled: refresh });

  return { status, enable, disable };
}
