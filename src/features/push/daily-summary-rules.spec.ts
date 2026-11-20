import { describe, expect, it } from 'vitest';
import { groupByMember, selectTaskTitlesDueToday } from './daily-summary-rules';

const TODAY = '2026-11-20';
const ME = 'member-me';
const PARTNER = 'member-partner';

function task(overrides: Partial<Parameters<typeof selectTaskTitlesDueToday>[0][number]>) {
  return {
    title: 'Tarefa',
    dueOn: TODAY,
    assigneeMemberId: null,
    medicationId: null,
    ...overrides,
  };
}

describe('selectTaskTitlesDueToday', () => {
  it('inclui as minhas e as sem responsável, e deixa as do parceiro', () => {
    const titles = selectTaskTitlesDueToday(
      [
        task({ title: 'Minha', assigneeMemberId: ME }),
        task({ title: 'Nossa', assigneeMemberId: null }),
        task({ title: 'Dele', assigneeMemberId: PARTNER }),
      ],
      ME,
      TODAY,
    );

    expect(titles).toEqual(['Minha', 'Nossa']);
  });

  it('só traz as de hoje, sem atrasadas, futuras nem sem prazo', () => {
    const titles = selectTaskTitlesDueToday(
      [
        task({ title: 'Ontem', dueOn: '2026-11-19' }),
        task({ title: 'Amanhã', dueOn: '2026-11-21' }),
        task({ title: 'Sem prazo', dueOn: null }),
        task({ title: 'Hoje' }),
      ],
      ME,
      TODAY,
    );

    expect(titles).toEqual(['Hoje']);
  });

  it('nunca inclui tarefa de remédio', () => {
    expect(
      selectTaskTitlesDueToday([task({ title: 'Losartana', medicationId: 'med-1' })], ME, TODAY),
    ).toEqual([]);
  });
});

describe('groupByMember', () => {
  it('agrupa os aparelhos de cada membro', () => {
    const groups = groupByMember([
      { memberId: ME, endpoint: 'a' },
      { memberId: PARTNER, endpoint: 'b' },
      { memberId: ME, endpoint: 'c' },
    ]);

    expect(groups.get(ME)?.map((item) => item.endpoint)).toEqual(['a', 'c']);
    expect(groups.get(PARTNER)?.map((item) => item.endpoint)).toEqual(['b']);
  });
});
