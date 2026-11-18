import { describe, expect, it } from 'vitest';
import { planCoupleSeed } from './couple-seed-plan';

const users = [
  { id: 'user-1', displayName: 'Bruno' },
  { id: 'user-2', displayName: 'Ela' },
];
const today = '2026-11-18';

describe('planCoupleSeed', () => {
  it('atribui azul ao primeiro usuário e roxo ao segundo', () => {
    const plan = planCoupleSeed({
      users,
      datingStartedOn: '2018-03-10',
      marriedOn: '2020-06-15',
      today,
    });

    expect(plan.members).toEqual([
      { userId: 'user-1', displayName: 'Bruno', color: 'blue' },
      { userId: 'user-2', displayName: 'Ela', color: 'purple' },
    ]);
    expect(plan.dates).toEqual({ datingStartedOn: '2018-03-10', marriedOn: '2020-06-15' });
  });

  it('transforma datas ausentes em null', () => {
    const plan = planCoupleSeed({ users, datingStartedOn: null, marriedOn: null, today });

    expect(plan.dates).toEqual({ datingStartedOn: null, marriedOn: null });
  });

  it('falha quando o casamento é antes do namoro', () => {
    expect(() =>
      planCoupleSeed({ users, datingStartedOn: '2020-06-15', marriedOn: '2018-03-10', today }),
    ).toThrowError(/antes do início do namoro/);
  });

  it('falha quando uma data está no futuro', () => {
    expect(() =>
      planCoupleSeed({ users, datingStartedOn: '2027-01-01', marriedOn: null, today }),
    ).toThrowError(/futuro/);
  });

  it('falha quando não são exatamente 2 usuários', () => {
    expect(() =>
      planCoupleSeed({
        users: [users[0]!],
        datingStartedOn: null,
        marriedOn: null,
        today,
      }),
    ).toThrowError(/2 usuários/);
  });
});
