import { describe, expect, it } from 'vitest';
import { extractPageMetadata, parsePriceToCents } from './page-metadata';

describe('Metadados da página do link', () => {
  it('Título vem do og:title, com entidades decodificadas', () => {
    const head =
      '<meta property="og:title" content="Fone &amp; Cia &#39;Pro&#39;"><title>x</title>';
    expect(extractPageMetadata(head).title).toBe("Fone & Cia 'Pro'");
  });

  it('Sem og:title, usa a tag title', () => {
    expect(extractPageMetadata('<title>\n  Tênis   Corrida \n</title>').title).toBe(
      'Tênis Corrida',
    );
  });

  it('Sem título, vem nulo', () => {
    expect(extractPageMetadata('<meta charset="utf-8">').title).toBeNull();
  });

  it('Preço vem da meta de produto, em centavos', () => {
    const head =
      '<meta content="1299.90" property="product:price:amount">' +
      '<meta property="product:price:currency" content="BRL">';
    expect(extractPageMetadata(head).priceCents).toBe(129990);
  });

  it('Moeda diferente de real descarta o preço', () => {
    const head =
      '<meta property="og:price:amount" content="19.99">' +
      '<meta property="og:price:currency" content="USD">';
    expect(extractPageMetadata(head).priceCents).toBeNull();
  });

  it('Aceita o formato brasileiro e rejeita lixo', () => {
    expect(parsePriceToCents('R$ 1.299,90')).toBe(129990);
    expect(parsePriceToCents('49,5')).toBe(4950);
    expect(parsePriceToCents('grátis')).toBeNull();
    expect(parsePriceToCents('0')).toBeNull();
  });
});
