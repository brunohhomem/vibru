export const GIFT_PRICE_FILTERS = [
  'all',
  'upTo100',
  'from100To300',
  'from300To500',
  'above500',
  'noPrice',
] as const;

export type GiftPriceFilter = (typeof GIFT_PRICE_FILTERS)[number];

const CENTS_PER_REAL = 100;

type PriceBand = { minCents: number; maxCents: number };

/** Faixas fechadas em cima (`até R$ 100` inclui os R$ 100) e abertas embaixo. */
const PRICE_BANDS: Record<Exclude<GiftPriceFilter, 'all' | 'noPrice'>, PriceBand> = {
  upTo100: { minCents: -1, maxCents: 100 * CENTS_PER_REAL },
  from100To300: { minCents: 100 * CENTS_PER_REAL, maxCents: 300 * CENTS_PER_REAL },
  from300To500: { minCents: 300 * CENTS_PER_REAL, maxCents: 500 * CENTS_PER_REAL },
  above500: { minCents: 500 * CENTS_PER_REAL, maxCents: Number.POSITIVE_INFINITY },
};

const FILTER_LABELS: Record<GiftPriceFilter, string> = {
  all: 'Todos os preços',
  upTo100: 'Até R$ 100',
  from100To300: 'R$ 100 a 300',
  from300To500: 'R$ 300 a 500',
  above500: 'Acima de R$ 500',
  noPrice: 'Sem preço',
};

export function giftPriceFilterLabel(filter: GiftPriceFilter): string {
  return FILTER_LABELS[filter];
}

export function filterGiftsByPrice<T extends { priceCents: number | null }>(
  gifts: readonly T[],
  filter: GiftPriceFilter,
): T[] {
  if (filter === 'all') return [...gifts];
  if (filter === 'noPrice') return gifts.filter((gift) => gift.priceCents === null);

  const { minCents, maxCents } = PRICE_BANDS[filter];
  return gifts.filter(
    (gift) => gift.priceCents !== null && gift.priceCents > minCents && gift.priceCents <= maxCents,
  );
}
