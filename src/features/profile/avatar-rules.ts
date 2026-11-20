// A foto é reduzida no navegador para AVATAR_SIDE_PIXELS e convertida para JPEG
// (o único formato que todo navegador sabe gerar no canvas, inclusive o Safari).
export const AVATAR_SIDE_PIXELS = 256;
export const AVATAR_JPEG_QUALITY = 0.85;

// Uma foto 256x256 em JPEG pesa algo em torno de 20 KB (~27 mil caracteres em base64).
// O teto deixa folga para fotos detalhadas e barra qualquer arquivo grande.
export const AVATAR_MAX_DATA_URL_LENGTH = 100_000;

const JPEG_DATA_URL_PREFIX = 'data:image/jpeg;base64,';
const BASE64_BODY_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const JPEG_SIGNATURE_BYTES = [0xff, 0xd8, 0xff];
// 4 caracteres em base64 viram 3 bytes; 4 já cobrem os 3 bytes da assinatura.
const SIGNATURE_BASE64_LENGTH = 4;

/**
 * Confere no servidor o que o navegador mandou: o cliente não é confiável, então
 * a action não aceita nada além de um JPEG em data URL dentro do tamanho esperado.
 */
export function isAvatarDataUrl(value: string): boolean {
  if (value.length > AVATAR_MAX_DATA_URL_LENGTH) return false;
  if (!value.startsWith(JPEG_DATA_URL_PREFIX)) return false;

  const body = value.slice(JPEG_DATA_URL_PREFIX.length);
  if (!BASE64_BODY_PATTERN.test(body)) return false;

  const decodedStart = atob(body.slice(0, SIGNATURE_BASE64_LENGTH));
  return JPEG_SIGNATURE_BYTES.every((byte, index) => decodedStart.charCodeAt(index) === byte);
}

export type SquareCrop = { sourceX: number; sourceY: number; sourceSide: number };

/** Recorte quadrado centralizado: o avatar é redondo, então sobra só o meio da foto. */
export function computeSquareCrop(width: number, height: number): SquareCrop {
  const sourceSide = Math.min(width, height);
  return {
    sourceX: Math.floor((width - sourceSide) / 2),
    sourceY: Math.floor((height - sourceSide) / 2),
    sourceSide,
  };
}
