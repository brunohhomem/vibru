import { describe, expect, it } from 'vitest';
import {
  dailySummaryPayload,
  lowStockPayload,
  taskAssignedPayload,
  taskCompletedPayload,
} from './push-payloads';

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
      dailySummaryPayload({
        taskTitles: [],
        eventTitles: [],
        importantDateTitles: [],
        tomorrowTitles: [],
      }),
    ).toBeNull();
  });

  it('lista só as seções que têm itens', () => {
    const payload = dailySummaryPayload({
      taskTitles: ['Pagar luz'],
      eventTitles: [],
      importantDateTitles: ['Aniversário da Ana'],
      tomorrowTitles: [],
    });

    expect(payload?.body).toBe('Tarefas: Pagar luz\nDatas: Aniversário da Ana');
    expect(payload?.url).toBe('/app');
  });

  it('corta em 3 títulos por seção e conta o resto', () => {
    const payload = dailySummaryPayload({
      taskTitles: ['a', 'b', 'c', 'd', 'e'],
      eventTitles: [],
      importantDateTitles: [],
      tomorrowTitles: [],
    });

    expect(payload?.body).toBe('Tarefas: a, b, c e mais 2');
  });
});

describe('prévia de amanhã no resumo', () => {
  const empty = { taskTitles: [], eventTitles: [], importantDateTitles: [], tomorrowTitles: [] };

  it('acrescenta a seção Amanhã depois das de hoje', () => {
    const payload = dailySummaryPayload({
      ...empty,
      taskTitles: ['Pagar luz'],
      tomorrowTitles: ['Jantar', 'Aniversário da Ana'],
    });

    expect(payload?.title).toBe('Hoje no Vibru');
    expect(payload?.body).toBe('Tarefas: Pagar luz\nAmanhã: Jantar, Aniversário da Ana');
  });

  it('com coisa só para amanhã o título deixa de dizer Hoje', () => {
    const payload = dailySummaryPayload({ ...empty, tomorrowTitles: ['Jantar'] });

    expect(payload?.title).toBe('Amanhã no Vibru');
    expect(payload?.body).toBe('Amanhã: Jantar');
  });
});

describe('lowStockPayload', () => {
  it('diz o remédio e quantos dias sobram, no plural', () => {
    expect(lowStockPayload('Losartana', 3)).toMatchObject({
      title: 'Estoque de remédio baixo',
      body: 'Losartana: sobra para 3 dias',
      url: '/app/health',
    });
  });

  it('usa o singular para 1 dia', () => {
    expect(lowStockPayload('Losartana', 1).body).toBe('Losartana: sobra para 1 dia');
  });
});
