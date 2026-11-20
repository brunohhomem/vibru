export type PushState = 'unsupported' | 'needsInstall' | 'denied' | 'notConfigured' | 'off' | 'on';

type PushEnvironment = {
  /** O navegador tem service worker, Push API e Notification. */
  isSupported: boolean;
  isIos: boolean;
  isStandalone: boolean;
  permission: NotificationPermission;
  hasSubscription: boolean;
  /** A chave pública VAPID foi embutida no build; sem ela não há como se inscrever. */
  hasVapidKey: boolean;
};

/**
 * O que o cartão de avisos mostra neste aparelho. No iPhone e no iPad o navegador
 * só expõe a Push API depois que o app é instalado na Tela de Início, então
 * "não suportado" ali significa "instale primeiro", não "impossível".
 */
export function decidePushState(environment: PushEnvironment): PushState {
  if (environment.isIos && !environment.isStandalone) return 'needsInstall';
  if (!environment.isSupported) return 'unsupported';
  if (!environment.hasVapidKey) return 'notConfigured';
  if (environment.permission === 'denied') return 'denied';
  if (environment.hasSubscription && environment.permission === 'granted') return 'on';
  return 'off';
}

/** A chave pública VAPID viaja em base64url; o `subscribe` do navegador pede os bytes dela. */
export function vapidKeyToBytes(base64UrlKey: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64UrlKey.length % 4)) % 4);
  const base64 = (base64UrlKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
