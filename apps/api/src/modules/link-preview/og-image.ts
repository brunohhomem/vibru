const META_TAG = /<meta\b[^>]*>/gi;
const OG_IMAGE_PROPERTY = /\bproperty\s*=\s*["']og:image["']/i;
const CONTENT_ATTRIBUTE = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

function resolveHttpUrl(value: string, pageUrl: string): string | null {
  try {
    const resolved = new URL(value.trim(), pageUrl);
    const isHttp = resolved.protocol === 'http:' || resolved.protocol === 'https:';
    return isHttp ? resolved.href : null;
  } catch {
    return null;
  }
}

/**
 * Lê o `og:image` do `<head>` sem parser de HTML (nenhuma dependência nova).
 * A ordem dos atributos e o tipo de aspas variam entre sites. A imagem é
 * carregada pelo navegador, nunca pelo servidor, mas só `http` e `https` passam.
 */
export function extractOgImageUrl(headHtml: string, pageUrl: string): string | null {
  for (const tag of headHtml.match(META_TAG) ?? []) {
    if (!OG_IMAGE_PROPERTY.test(tag)) continue;

    const content = CONTENT_ATTRIBUTE.exec(tag);
    const value = content?.[1] ?? content?.[2];
    if (value) return resolveHttpUrl(value, pageUrl);
  }

  return null;
}
