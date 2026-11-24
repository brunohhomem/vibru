import { describe, expect, it } from 'vitest';
import { filterGiftsByPrice } from './gift-price-filter';

const gifts = [
  { id: 'free', priceCents: 0 },
  { id: 'cheap', priceCents: 5000 },
  { id: 'edge100', priceCents: 10000 },
  { id: 'mid', priceCents: 25000 },
  { id: 'edge500', priceCents: 50000 },
  { id: 'pricey', priceCents: 129990 },
  { id: 'none', priceCents: null },
];

function ids(filter: Parameters<typeof filterGiftsByPrice>[1]) {
  return filterGiftsByPrice(gifts, filter).map((gift) => gift.id);
}

describe('filterGiftsByPrice', () => {
  it('Todos os preços mantém tudo, inclusive sem preço', () => {
    expect(ids('all')).toHaveLength(gifts.length);
  });

  it('Até R$ 100 inclui o limite de R$ 100 e deixa de fora o sem preço', () => {
    expect(ids('upTo100')).toEqual(['free', 'cheap', 'edge100']);
  });

  it('Cada faixa começa onde a anterior termina, sem repetir presente', () => {
    expect(ids('from100To300')).toEqual(['mid']);
    expect(ids('from300To500')).toEqual(['edge500']);
    expect(ids('above500')).toEqual(['pricey']);
  });

  it('Sem preço traz só os que não têm valor informado', () => {
    expect(ids('noPrice')).toEqual(['none']);
  });
});
