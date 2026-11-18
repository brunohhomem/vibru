import { describe, expect, it } from 'vitest';
import { buildCoupleResponse } from './couple-response';

const members = [
  { id: 'member-blue', displayName: 'Bruno', color: 'blue' as const },
  { id: 'member-purple', displayName: 'Ela', color: 'purple' as const },
];

describe('buildCoupleResponse', () => {
  it('deixa tudo nulo quando o casal não tem datas', () => {
    const response = buildCoupleResponse({
      couple: { id: 'couple-1', datingStartedOn: null, marriedOn: null },
      members,
      currentMemberId: 'member-blue',
      today: '2026-11-18',
    });

    expect(response.married).toBeNull();
    expect(response.nextWeddingAnniversary).toBeNull();
    expect(response.nextDatingAnniversary).toBeNull();
  });

  it('calcula a próxima boda: 7 anos em 2027-06-15, a 209 dias, Lã', () => {
    const response = buildCoupleResponse({
      couple: { id: 'couple-1', datingStartedOn: null, marriedOn: '2020-06-15' },
      members,
      currentMemberId: 'member-blue',
      today: '2026-11-18',
    });

    expect(response.nextWeddingAnniversary).toEqual({
      date: '2027-06-15',
      years: 7,
      bodasName: 'Lã',
      daysUntil: 209,
    });
  });

  it('calcula o próximo aniversário de namoro sem nome de bodas', () => {
    const response = buildCoupleResponse({
      couple: { id: 'couple-1', datingStartedOn: '2018-12-01', marriedOn: null },
      members,
      currentMemberId: 'member-blue',
      today: '2026-11-18',
    });

    expect(response.nextDatingAnniversary).toEqual({ date: '2026-12-01', years: 8, daysUntil: 13 });
  });

  it('marca isMe só no membro atual e preserva a ordem', () => {
    const response = buildCoupleResponse({
      couple: { id: 'couple-1', datingStartedOn: null, marriedOn: null },
      members,
      currentMemberId: 'member-purple',
      today: '2026-11-18',
    });

    expect(response.members).toEqual([
      { id: 'member-blue', displayName: 'Bruno', color: 'blue', isMe: false },
      { id: 'member-purple', displayName: 'Ela', color: 'purple', isMe: true },
    ]);
  });

  it('devolve o dia de hoje recebido', () => {
    const response = buildCoupleResponse({
      couple: { id: 'couple-1', datingStartedOn: null, marriedOn: null },
      members,
      currentMemberId: 'member-blue',
      today: '2026-11-18',
    });

    expect(response.today).toBe('2026-11-18');
  });
});
