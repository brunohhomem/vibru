import { describe, expect, it } from 'vitest';
import {
  ActionResultError,
  describeActionFailure,
  unwrapActionResult,
} from './unwrap-action-result';

describe('unwrapActionResult', () => {
  it('devolve os dados quando a action deu certo', () => {
    expect(unwrapActionResult({ ok: true, data: { id: 1 } })).toEqual({ id: 1 });
  });

  it('lança ActionResultError com code, message e field quando a action falhou', () => {
    const failure = {
      ok: false as const,
      code: 'invalid_input' as const,
      message: 'Data inválida',
      field: 'marriedOn',
    };

    expect(() => unwrapActionResult(failure)).toThrowError(ActionResultError);
    try {
      unwrapActionResult(failure);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'invalid_input',
        message: 'Data inválida',
        field: 'marriedOn',
      });
    }
  });
});

describe('describeActionFailure', () => {
  it('couple_required vira couple-required', () => {
    expect(describeActionFailure(new ActionResultError('couple_required', 'x'))).toBe(
      'couple-required',
    );
  });

  it('unauthenticated vira redirect-to-login', () => {
    expect(describeActionFailure(new ActionResultError('unauthenticated', 'x'))).toBe(
      'redirect-to-login',
    );
  });

  it('qualquer outro código ou erro desconhecido vira retry', () => {
    expect(describeActionFailure(new ActionResultError('failed', 'x'))).toBe('retry');
    expect(describeActionFailure(new Error('rede caiu'))).toBe('retry');
    expect(describeActionFailure('texto solto')).toBe('retry');
  });
});
