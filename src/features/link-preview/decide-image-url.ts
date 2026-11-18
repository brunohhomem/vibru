export type ImageDecision =
  { kind: 'keep' } | { kind: 'set'; value: string | null } | { kind: 'lookup'; url: string };

/**
 * Imagem de um desejo ou presente ao editar. A imagem informada à mão vence; sem ela,
 * só uma URL nova dispara a busca do `og:image`; apagar a URL apaga a imagem; não
 * mexer na URL mantém tudo.
 */
export function decideImageUrl(
  current: { url: string | null },
  patch: { imageUrl?: string | null; url?: string | null },
): ImageDecision {
  if (patch.imageUrl !== undefined) return { kind: 'set', value: patch.imageUrl };
  if (patch.url === undefined || patch.url === current.url) return { kind: 'keep' };
  if (patch.url === null) return { kind: 'set', value: null };
  return { kind: 'lookup', url: patch.url };
}
