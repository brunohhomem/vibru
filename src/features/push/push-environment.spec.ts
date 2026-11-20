import { describe, expect, it } from 'vitest';
import { decidePushState, vapidKeyToBytes } from './push-environment';

const READY = {
  isSupported: true,
  isIos: false,
  isStandalone: false,
  permission: 'default' as NotificationPermission,
  hasSubscription: false,
  hasVapidKey: true,
};

describe('decidePushState', () => {
  it('no iPhone fora do app instalado pede para instalar antes', () => {
    expect(decidePushState({ ...READY, isIos: true, isSupported: false })).toBe('needsInstall');
  });

  it('no iPhone com o app instalado deixa ativar', () => {
    expect(decidePushState({ ...READY, isIos: true, isStandalone: true })).toBe('off');
  });

  it('navegador sem Push API fora do iOS é não suportado', () => {
    expect(decidePushState({ ...READY, isSupported: false })).toBe('unsupported');
  });

  it('sem a chave VAPID no build não oferece ativar', () => {
    expect(decidePushState({ ...READY, hasVapidKey: false })).toBe('notConfigured');
  });

  it('permissão negada vence qualquer inscrição antiga', () => {
    expect(decidePushState({ ...READY, permission: 'denied', hasSubscription: true })).toBe(
      'denied',
    );
  });

  it('inscrito com permissão concedida está ligado', () => {
    expect(decidePushState({ ...READY, permission: 'granted', hasSubscription: true })).toBe('on');
  });

  it('permissão concedida mas sem inscrição está desligado', () => {
    expect(decidePushState({ ...READY, permission: 'granted' })).toBe('off');
  });
});

describe('vapidKeyToBytes', () => {
  it('converte base64url, com os caracteres - e _, nos bytes originais', () => {
    // 0xfb 0xff 0xbe em base64 é "+/++" e em base64url é "-_--".
    expect(Array.from(vapidKeyToBytes('-_--'))).toEqual([0xfb, 0xff, 0xbe]);
  });

  it('aceita chave sem o preenchimento "="', () => {
    expect(Array.from(vapidKeyToBytes('AQID'))).toEqual([1, 2, 3]);
    expect(Array.from(vapidKeyToBytes('AQI'))).toEqual([1, 2]);
  });
});
