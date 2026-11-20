import { describe, expect, it } from 'vitest';
import { AVATAR_MAX_DATA_URL_LENGTH, computeSquareCrop, isAvatarDataUrl } from './avatar-rules';

// "/9j/" é o começo de qualquer JPEG (FF D8 FF) em base64.
const VALID_JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

describe('isAvatarDataUrl', () => {
  it('aceita um JPEG em data URL', () => {
    expect(isAvatarDataUrl(VALID_JPEG_DATA_URL)).toBe(true);
  });

  it('recusa outro formato de imagem', () => {
    expect(isAvatarDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
    expect(isAvatarDataUrl('data:image/webp;base64,UklGRg==')).toBe(false);
  });

  it('recusa texto que não é data URL, como um endereço externo', () => {
    expect(isAvatarDataUrl('https://example.com/foto.jpg')).toBe(false);
  });

  it('recusa um data URL que diz ser JPEG mas não tem a assinatura de JPEG', () => {
    expect(isAvatarDataUrl('data:image/jpeg;base64,iVBORw0KGgo=')).toBe(false);
  });

  it('recusa caracteres fora do base64', () => {
    expect(isAvatarDataUrl('data:image/jpeg;base64,/9j/<script>')).toBe(false);
  });

  it('recusa acima do tamanho máximo', () => {
    const tooLarge = `${VALID_JPEG_DATA_URL}${'A'.repeat(AVATAR_MAX_DATA_URL_LENGTH)}`;
    expect(isAvatarDataUrl(tooLarge)).toBe(false);
  });
});

describe('computeSquareCrop', () => {
  it('centraliza o recorte numa foto horizontal', () => {
    expect(computeSquareCrop(400, 200)).toEqual({ sourceX: 100, sourceY: 0, sourceSide: 200 });
  });

  it('centraliza o recorte numa foto vertical', () => {
    expect(computeSquareCrop(200, 500)).toEqual({ sourceX: 0, sourceY: 150, sourceSide: 200 });
  });

  it('não corta uma foto já quadrada', () => {
    expect(computeSquareCrop(300, 300)).toEqual({ sourceX: 0, sourceY: 0, sourceSide: 300 });
  });
});
