import { describe, expect, it } from 'vitest';
import { dailySummaryPayload, taskAssignedPayload, taskCompletedPayload } from './push-payloads';

describe('taskAssignedPayload', () => {
  it('diz quem atribuiu e qual é a tarefa, e abre a lista de tarefas', () => {
    expect(taskAssignedPayload('Bruno', 'Lavar a louça')).toEqual({
      title: 'Nova tarefa para você',
      body: 'Bruno: Lavar a louça',
      url: '/app/tasks',
      tag: 'task-assigned',
    });
  });
});

describe('taskCompletedPayload', () => {
  it('põe quem concluiu no título e a tarefa no corpo', () => {
    expect(taskCompletedPayload('Ela', 'Comprar pão')).toMatchObject({
      title: 'Ela concluiu uma tarefa',
      body: 'Comprar pão',
      url: '/app/tasks',
    });
  });
});

describe('dailySummaryPayload', () => {
  it('devolve nulo quando não há nada para hoje', () => {
    expect(
      dailySummaryPayload({ taskTitles: [], eventTitles: [], importantDateTitles: [] }),
    ).toBeNull();
  });

  it('lista só as seções que têm itens', () => {
    const payload = dailySummaryPayload({
      taskTitles: ['Pagar luz'],
      eventTitles: [],
      importantDateTitles: ['Aniversário da Ana'],
    });

    expect(payload?.body).toBe('Tarefas: Pagar luz\nDatas: Aniversário da Ana');
    expect(payload?.url).toBe('/app');
  });

  it('corta em 3 títulos por seção e conta o resto', () => {
    const payload = dailySummaryPayload({
      taskTitles: ['a', 'b', 'c', 'd', 'e'],
      eventTitles: [],
      importantDateTitles: [],
    });

    expect(payload?.body).toBe('Tarefas: a, b, c e mais 2');
  });
});
