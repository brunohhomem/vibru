import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from './query-client';
import { ActionResultError } from './unwrap-action-result';

describe('createQueryClient', () => {
  it('avisa quando uma query volta unauthenticated', async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient(onUnauthenticated);

    await client
      .fetchQuery({
        queryKey: ['couple'],
        queryFn: () => Promise.reject(new ActionResultError('unauthenticated', 'Sessão expirada.')),
      })
      .catch(() => undefined);

    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('avisa quando uma mutation volta unauthenticated', async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient(onUnauthenticated);

    await client
      .getMutationCache()
      .build(client, {
        mutationFn: () =>
          Promise.reject(new ActionResultError('unauthenticated', 'Sessão expirada.')),
      })
      .execute(undefined)
      .catch(() => undefined);

    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('não avisa para outros erros (failed, couple_required, erro de rede)', async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient(onUnauthenticated);
    const failures = [
      new ActionResultError('failed', 'x'),
      new ActionResultError('couple_required', 'x'),
      new Error('rede caiu'),
    ];

    for (const [index, failure] of failures.entries()) {
      await client
        .fetchQuery({ queryKey: ['q', index], queryFn: () => Promise.reject(failure) })
        .catch(() => undefined);
    }

    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});
