const META_TAG = /<meta\b[^>]*>/gi;
const CONTENT_ATTRIBUTE = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const TITLE_TAG = /<title\b[^>]*>([\s\S]*?)<\/title>/i;
const MAX_TITLE_LENGTH = 120;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
};

export type PageMetadata = { title: string | null; priceCents: number | null };

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function readMetaContent(headHtml: string, keys: readonly string[]): string | null {
  for (const key of keys) {
    const identifier = new RegExp(`\\b(?:property|name|itemprop)\\s*=\\s*["']${key}["']`, 'i');
    for (const tag of headHtml.match(META_TAG) ?? []) {
      if (!identifier.test(tag)) continue;

      const content = CONTENT_ATTRIBUTE.exec(tag);
      const value = (content?.[1] ?? content?.[2])?.trim();
      if (value) return decodeEntities(value);
    }
  }

  return null;
}

/**
 * Converte o valor de uma meta de preço em centavos. Aceita "1299.90" (formato de
 * máquina, o mais comum nas metas) e "1.299,90" (formato brasileiro): quando há
 * vírgula, ela é o separador decimal; sem vírgula, o ponto é.
 */
export function parsePriceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * 100);
}

function readTitle(headHtml: string): string | null {
  const fromMeta = readMetaContent(headHtml, ['og:title', 'twitter:title']);
  const fromTag = TITLE_TAG.exec(headHtml)?.[1];
  const title = fromMeta ?? (fromTag ? decodeEntities(fromTag).replace(/\s+/g, ' ').trim() : null);
  if (!title) return null;

  return title.slice(0, MAX_TITLE_LENGTH);
}

function readPriceCents(headHtml: string): number | null {
  const currency = readMetaContent(headHtml, ['product:price:currency', 'og:price:currency']);
  if (currency && currency.toUpperCase() !== 'BRL') return null;

  const amount = readMetaContent(headHtml, [
    'product:price:amount',
    'og:price:amount',
    'twitter:data1',
    'price',
  ]);
  return amount ? parsePriceToCents(amount) : null;
}

/** Título e preço (em reais) que o site declara no `<head>`; o que faltar vem `null`. */
export function extractPageMetadata(headHtml: string): PageMetadata {
  return { title: readTitle(headHtml), priceCents: readPriceCents(headHtml) };
}
