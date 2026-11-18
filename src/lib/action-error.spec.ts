import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { applyActionError } from './action-error';
import { ActionResultError } from './unwrap-action-result';

describe('applyActionError', () => {
  beforeEach(() => {
    toast.error.mockReset();
  });

  it('põe a mensagem no campo quando a falha aponta um campo do formulário', () => {
    const setError = vi.fn();

    applyActionError(
      new ActionResultError('invalid_input', 'Tarefa recorrente precisa de prazo', 'dueOn'),
      setError,
    );

    expect(setError).toHaveBeenCalledWith('dueOn', {
      message: 'Tarefa recorrente precisa de prazo',
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('mostra a mensagem em toast quando não há campo', () => {
    applyActionError(new ActionResultError('failed', 'Tarefa já concluída'));

    expect(toast.error).toHaveBeenCalledWith('Tarefa já concluída');
  });

  it('mostra a mensagem em toast quando há campo mas não há formulário', () => {
    applyActionError(
      new ActionResultError('invalid_input', 'Responsável inválido', 'assigneeMemberId'),
    );

    expect(toast.error).toHaveBeenCalledWith('Responsável inválido');
  });

  it('erro que não é resultado de action (rede caiu, bug) vira mensagem genérica', () => {
    applyActionError(new Error('Failed to fetch: detalhe interno'));

    expect(toast.error).toHaveBeenCalledWith('Não foi possível concluir a ação');
  });
});
