const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Valor em centavos (ADR 0003, 3.12) exibido em reais. */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

const REAIS_PATTERN = /^(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/;

/**
 * Lê o que a pessoa digitou ("129,90", "1.299,9", "R$ 39,99") sem passar por
 * ponto flutuante. Devolve nulo para vazio ou formato inválido.
 */
export function parseReaisToCents(text: string): number | null {
  const normalized = text.replace(/R\$/i, '').trim();
  const match = REAIS_PATTERN.exec(normalized);
  if (!match) return null;

  const reais = Number((match[1] ?? '').replace(/\./g, ''));
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  return reais * 100 + cents;
}
