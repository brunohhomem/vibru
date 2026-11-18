import { describe, expect, it } from 'vitest';
import { generateFeedToken, hashFeedToken, parseFeedFile, toIcsEntries } from './ics-feed-rules';

describe('toIcsEntries', () => {
  const entries = {
    events: [
      {
        id: 'e1',
        title: 'Jantar',
        startsOn: '2026-06-10',
        startTime: '20:00',
        notes: 'segredo da surpresa',
        wishId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    importantDates: [
      {
        id: 'd1',
        title: 'Aniversário',
        occursOn: '1990-06-01',
        repeatsYearly: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        date: '2026-06-01',
      },
    ],
    anniversaries: [
      { kind: 'wedding' as const, date: '2026-06-05', years: 6, title: 'Bodas de Ferro (6 anos)' },
    ],
  };

  it('nunca leva as observações do evento (o feed vai para serviços de terceiros)', () => {
    expect(JSON.stringify(toIcsEntries(entries, 'couple-1'))).not.toContain('segredo');
  });

  it('gera UIDs estáveis por tipo e usa horário só nos eventos que têm', () => {
    expect(toIcsEntries(entries, 'couple-1')).toEqual([
      { uid: 'event-e1@vibru', title: 'Jantar', date: '2026-06-10', time: '20:00' },
      { uid: 'date-d1-2026-06-01@vibru', title: 'Aniversário', date: '2026-06-01', time: null },
      {
        uid: 'wedding-couple-1-2026-06-05@vibru',
        title: 'Bodas de Ferro (6 anos)',
        date: '2026-06-05',
        time: null,
      },
    ]);
  });
});

describe('token do feed', () => {
  it('o hash é determinístico e não contém o token', () => {
    const token = generateFeedToken();

    expect(hashFeedToken(token)).toBe(hashFeedToken(token));
    expect(hashFeedToken(token)).not.toContain(token);
    expect(hashFeedToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gera tokens base64url de 43 caracteres e diferentes a cada vez', () => {
    const first = generateFeedToken();
    const second = generateFeedToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
  });
});

describe('parseFeedFile', () => {
  const token = 'A'.repeat(43);

  it('extrai o token de um arquivo .ics válido', () => {
    expect(parseFeedFile(`${token}.ics`)).toBe(token);
  });

  it('recusa sem .ics, com token curto ou com caracteres fora do alfabeto', () => {
    expect(parseFeedFile(token)).toBeNull();
    expect(parseFeedFile(`${'A'.repeat(42)}.ics`)).toBeNull();
    expect(parseFeedFile(`${'A'.repeat(42)}!.ics`)).toBeNull();
    expect(parseFeedFile(`../${token}.ics`)).toBeNull();
  });
});
