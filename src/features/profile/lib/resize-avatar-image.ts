import { AVATAR_JPEG_QUALITY, AVATAR_SIDE_PIXELS, computeSquareCrop } from '../avatar-rules';

/** Falha que o usuário consegue entender e resolver (outra foto, outro navegador). */
export class AvatarImageError extends Error {}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new AvatarImageError('Não foi possível converter a foto.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new AvatarImageError('Não foi possível ler a foto convertida.'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      AVATAR_JPEG_QUALITY,
    );
  });
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new AvatarImageError(
      'Este navegador não abriu essa foto. Tente outra imagem (JPEG ou PNG).',
    );
  }
}

/**
 * Recorta a foto em quadrado, reduz para 256 px e devolve um JPEG em data URL.
 * Reduzir aqui evita mandar vários MB do celular e o limite de corpo da Vercel.
 */
export async function resizeAvatarImage(file: File): Promise<string> {
  const bitmap = await decodeImage(file);
  const { sourceX, sourceY, sourceSide } = computeSquareCrop(bitmap.width, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIDE_PIXELS;
  canvas.height = AVATAR_SIDE_PIXELS;
  const context = canvas.getContext('2d');
  if (!context) throw new AvatarImageError('Este navegador não consegue preparar a foto.');

  // JPEG não tem transparência: o fundo branco evita um quadrado preto em PNG com recorte.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, AVATAR_SIDE_PIXELS, AVATAR_SIDE_PIXELS);
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSide,
    sourceSide,
    0,
    0,
    AVATAR_SIDE_PIXELS,
    AVATAR_SIDE_PIXELS,
  );
  bitmap.close();

  return canvasToJpegDataUrl(canvas);
}
