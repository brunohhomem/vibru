import { describe, expect, it } from 'vitest';
import { isBlockedAddress } from './blocked-address';
import { extractOgImageUrl } from './og-image';

describe('Busca do og:image', () => {
  it('Endereço interno, loopback, link-local ou metadata é bloqueado', () => {
    for (const address of [
      '10.1.2.3',
      '127.0.0.1',
      '169.254.169.254',
      '::1',
      '::ffff:192.168.0.1',
      'fd00::1',
    ]) {
      expect(isBlockedAddress(address), address).toBe(true);
    }
  });

  it('Endereço público passa', () => {
    expect(isBlockedAddress('93.184.216.34')).toBe(false);
    expect(isBlockedAddress('2606:2800::1')).toBe(false);
  });

  it('og:image relativo é resolvido contra a página', () => {
    expect(
      extractOgImageUrl('<meta content="/a.jpg" property="og:image">', 'https://x.com/p'),
    ).toBe('https://x.com/a.jpg');
  });

  it('og:image com esquema fora de http e https é descartado', () => {
    expect(
      extractOgImageUrl(
        "<meta property='og:image' content='javascript:alert(1)'>",
        'https://x.com',
      ),
    ).toBeNull();
  });

  it('Página sem og:image não tem imagem', () => {
    expect(extractOgImageUrl('<head><title>Loja</title></head>', 'https://x.com')).toBeNull();
  });
});
