import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const readSessionUserId = vi.fn<() => Promise<string | null>>();
vi.mock('./session', () => ({ readSessionUserId }));

const { defineAction } = await import('./define-action');

const inputSchema = z.object({ title: z.string().min(1) });

describe('defineAction', () => {
  beforeEach(() => {
    readSessionUserId.mockReset();
  });

  it('devolve unauthenticated sem chamar o handler quando não há sessão', async () => {
    readSessionUserId.mockResolvedValue(null);
    const handler = vi.fn();

    const result = await defineAction({ schema: inputSchema, handler })({ title: 'x' });

    expect(result).toMatchObject({ ok: false, code: 'unauthenticated' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('devolve invalid_input sem chamar o handler quando o dado não passa no zod', async () => {
    readSessionUserId.mockResolvedValue('user-1');
    const handler = vi.fn();

    const result = await defineAction({ schema: inputSchema, handler })({ title: '' });

    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('devolve ok com os dados do handler, entregando input e userId', async () => {
    readSessionUserId.mockResolvedValue('user-1');
    const handler = vi.fn(
      async ({ input, userId }: { input: { title: string }; userId: string }) => ({
        echoed: `${userId}:${input.title}`,
      }),
    );

    const result = await defineAction({ schema: inputSchema, handler })({ title: 'tarefa' });

    expect(result).toEqual({ ok: true, data: { echoed: 'user-1:tarefa' } });
  });

  it('devolve failed sem vazar a mensagem interna quando o handler lança', async () => {
    readSessionUserId.mockResolvedValue('user-1');
    const handler = vi.fn().mockRejectedValue(new Error('senha do banco: hunter2'));

    const result = await defineAction({ schema: inputSchema, handler })({ title: 'x' });

    expect(result).toMatchObject({ ok: false, code: 'failed' });
    expect(JSON.stringify(result)).not.toContain('hunter2');
  });
});
