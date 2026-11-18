import { describe, expect, it } from 'vitest';
import {
  buildLowStockWarning,
  buildMedicationUpdatePatch,
  isRestock,
  medicationTaskTitle,
  planMedicationTaskSync,
  sortTimes,
} from './medication-rules';

describe('sortTimes', () => {
  it('ordena os horários sem alterar a lista original', () => {
    const times = ['20:00', '08:00', '14:30'];
    expect(sortTimes(times)).toEqual(['08:00', '14:30', '20:00']);
    expect(times).toEqual(['20:00', '08:00', '14:30']);
  });
});

describe('medicationTaskTitle', () => {
  it('junta nome e dose', () => {
    expect(medicationTaskTitle({ name: 'Dipirona', dosage: '500mg' })).toBe('Tomar Dipirona 500mg');
  });

  it('sem dose não deixa espaço sobrando', () => {
    expect(medicationTaskTitle({ name: 'Dipirona', dosage: '' })).toBe('Tomar Dipirona');
  });
});

describe('isRestock', () => {
  it('repor é mandar um estoque maior que o atual', () => {
    expect(isRestock(5, 30)).toBe(true);
  });

  it('estoque antes não controlado e agora controlado conta como reposição', () => {
    expect(isRestock(null, 10)).toBe(true);
  });

  it('igual, menor, nulo ou ausente não é reposição', () => {
    expect(isRestock(10, 10)).toBe(false);
    expect(isRestock(10, 3)).toBe(false);
    expect(isRestock(10, null)).toBe(false);
    expect(isRestock(10, undefined)).toBe(false);
  });
});

describe('buildMedicationUpdatePatch', () => {
  const existing = { stockUnits: 5 };

  it('ordena os horários enviados', () => {
    expect(buildMedicationUpdatePatch(existing, { times: ['20:00', '08:00'] }).times).toEqual([
      '08:00',
      '20:00',
    ]);
  });

  it('na reposição libera o próximo aviso da Farmácia', () => {
    expect(buildMedicationUpdatePatch(existing, { stockUnits: 30 })).toMatchObject({
      stockUnits: 30,
      lowStockPromptedAt: null,
    });
  });

  it('sem reposição não mexe no aviso', () => {
    expect(buildMedicationUpdatePatch(existing, { name: 'Outro' })).not.toHaveProperty(
      'lowStockPromptedAt',
    );
  });
});

describe('planMedicationTaskSync', () => {
  const spec = { times: ['08:00', '20:00'], title: 'Tomar Dipirona 500mg', memberId: 'member-1' };

  function openTask(overrides: Record<string, unknown> = {}) {
    return {
      id: 't1',
      dueTime: '08:00:00',
      title: 'Tomar Dipirona 500mg',
      assigneeMemberId: 'member-1',
      ...overrides,
    } as { id: string; dueTime: string | null; title: string; assigneeMemberId: string | null };
  }

  it('cria só as tarefas dos horários que faltam', () => {
    expect(planMedicationTaskSync([openTask()], spec)).toEqual({
      staleIds: [],
      updates: [],
      timesToCreate: ['20:00'],
    });
  });

  it('remove a tarefa de um horário que deixou de existir', () => {
    const plan = planMedicationTaskSync([openTask({ id: 'old', dueTime: '12:00:00' })], spec);

    expect(plan.staleIds).toEqual(['old']);
    expect(plan.timesToCreate).toEqual(['08:00', '20:00']);
  });

  it('mantém uma tarefa por horário e remove as duplicadas', () => {
    const plan = planMedicationTaskSync([openTask({ id: 'a' }), openTask({ id: 'b' })], {
      ...spec,
      times: ['08:00'],
    });

    expect(plan.staleIds).toEqual(['b']);
    expect(plan.timesToCreate).toEqual([]);
  });

  it('remove tarefa aberta sem horário', () => {
    expect(planMedicationTaskSync([openTask({ id: 'x', dueTime: null })], spec).staleIds).toEqual([
      'x',
    ]);
  });

  it('atualiza título e responsável só quando mudaram', () => {
    const plan = planMedicationTaskSync(
      [
        openTask({ id: 'a', title: 'Tomar Antigo' }),
        openTask({ id: 'b', dueTime: '20:00:00', assigneeMemberId: 'member-2' }),
      ],
      spec,
    );

    expect(plan.updates).toEqual([
      { id: 'a', title: 'Tomar Dipirona 500mg', assigneeMemberId: 'member-1' },
      { id: 'b', title: 'Tomar Dipirona 500mg', assigneeMemberId: 'member-1' },
    ]);
    expect(planMedicationTaskSync([openTask()], { ...spec, times: ['08:00'] }).updates).toEqual([]);
  });
});

describe('buildLowStockWarning', () => {
  const base = {
    id: 'med-1',
    name: 'Dipirona',
    stockUnits: 14,
    unitsPerDose: 1,
    times: ['08:00', '20:00'],
    lowStockDays: 7,
  };

  it('avisa no limiar exato (dias restantes iguais ao limite)', () => {
    expect(buildLowStockWarning(base)).toEqual({
      medicationId: 'med-1',
      name: 'Dipirona',
      daysLeft: 7,
    });
  });

  it('não avisa acima do limiar', () => {
    expect(buildLowStockWarning({ ...base, stockUnits: 16 })).toBeNull();
  });

  it('avisa com estoque zerado', () => {
    expect(buildLowStockWarning({ ...base, stockUnits: 0 })).toMatchObject({ daysLeft: 0 });
  });

  it('não avisa quando o estoque não é controlado ou não há horário', () => {
    expect(buildLowStockWarning({ ...base, stockUnits: null })).toBeNull();
    expect(buildLowStockWarning({ ...base, times: [] })).toBeNull();
  });
});
