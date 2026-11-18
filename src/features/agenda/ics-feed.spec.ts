import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMemberByIcsTokenHash: vi.fn(),
  findCoupleById: vi.fn(),
  listEventsBetween: vi.fn(),
  listImportantDates: vi.fn(),
}));

vi.mock('@/features/couple/couple-repository', () => ({
  findMemberByIcsTokenHash: mocks.findMemberByIcsTokenHash,
  findCoupleById: mocks.findCoupleById,
}));
vi.mock('./agenda-repository', () => ({ listEventsBetween: mocks.listEventsBetween }));
vi.mock('./important-dates-repository', () => ({ listImportantDates: mocks.listImportantDates }));

import { hashFeedToken } from './ics-feed-rules';
import { renderIcsFeed } from './ics-feed';

const TOKEN = 'B'.repeat(43);
const NOW = new Date('2026-06-01T12:00:00.000Z');

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findMemberByIcsTokenHash.mockResolvedValue({ id: 'member-1', coupleId: 'couple-1' });
  mocks.findCoupleById.mockResolvedValue({
    id: 'couple-1',
    marriedOn: null,
    datingStartedOn: null,
  });
  mocks.listEventsBetween.mockResolvedValue([
    {
      id: 'e1',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
      coupleId: 'couple-1',
      title: 'Jantar',
      startsOn: '2026-06-10',
      startTime: '20:00:00',
      notes: 'observação privada',
      wishId: null,
    },
  ]);
  mocks.listImportantDates.mockResolvedValue([]);
});

describe('renderIcsFeed', () => {
  it('arquivo fora do formato responde nulo sem consultar o banco', async () => {
    expect(await renderIcsFeed(`${TOKEN}`, NOW)).toBeNull();
    expect(await renderIcsFeed('curto.ics', NOW)).toBeNull();
    expect(mocks.findMemberByIcsTokenHash).not.toHaveBeenCalled();
  });

  it('token desconhecido ou revogado responde nulo', async () => {
    mocks.findMemberByIcsTokenHash.mockResolvedValue(null);

    expect(await renderIcsFeed(`${TOKEN}.ics`, NOW)).toBeNull();
    expect(mocks.listEventsBetween).not.toHaveBeenCalled();
  });

  it('procura pelo hash (nunca pelo token) e monta o calendário do casal dono do token', async () => {
    const calendar = await renderIcsFeed(`${TOKEN}.ics`, NOW);

    expect(mocks.findMemberByIcsTokenHash).toHaveBeenCalledWith(hashFeedToken(TOKEN));
    expect(mocks.listEventsBetween).toHaveBeenCalledWith('couple-1', '2025-01-01', '2028-12-31');
    expect(mocks.listImportantDates).toHaveBeenCalledWith('couple-1');
    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('SUMMARY:Jantar');
  });

  it('as observações do evento nunca saem no feed', async () => {
    expect(await renderIcsFeed(`${TOKEN}.ics`, NOW)).not.toContain('observação privada');
  });
});
