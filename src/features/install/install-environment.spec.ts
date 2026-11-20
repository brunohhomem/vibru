import { describe, expect, it } from 'vitest';
import { decideInstallMode, isIosDevice } from './install-environment';

const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const IPAD_AS_MAC_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
const DESKTOP_CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';

describe('isIosDevice', () => {
  it('reconhece iPhone', () => {
    expect(isIosDevice(IPHONE_USER_AGENT, 5)).toBe(true);
  });

  it('reconhece iPad que se apresenta como Mac, pelo toque', () => {
    expect(isIosDevice(IPAD_AS_MAC_USER_AGENT, 5)).toBe(true);
  });

  it('não confunde um Mac de verdade (sem toque) com iPad', () => {
    expect(isIosDevice(IPAD_AS_MAC_USER_AGENT, 0)).toBe(false);
  });

  it('não reconhece Windows', () => {
    expect(isIosDevice(DESKTOP_CHROME_USER_AGENT, 0)).toBe(false);
  });
});

describe('decideInstallMode', () => {
  const base = {
    userAgent: DESKTOP_CHROME_USER_AGENT,
    maxTouchPoints: 0,
    isStandalone: false,
    hasNativePrompt: false,
  };

  it('esconde o botão quando o app já roda instalado', () => {
    expect(decideInstallMode({ ...base, isStandalone: true, hasNativePrompt: true })).toBe(
      'installed',
    );
  });

  it('usa o convite do navegador quando ele existe', () => {
    expect(decideInstallMode({ ...base, hasNativePrompt: true })).toBe('native-prompt');
  });

  it('mostra o passo a passo no iPhone', () => {
    expect(decideInstallMode({ ...base, userAgent: IPHONE_USER_AGENT, maxTouchPoints: 5 })).toBe(
      'ios-manual',
    );
  });

  it('não oferece nada quando o navegador não permite instalar', () => {
    expect(decideInstallMode(base)).toBe('unavailable');
  });
});
