import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { MemberContext } from '@/features/couple/membership';

const readSessionUserId = vi.fn<() => Promise<string | null>>();
vi.mock('./session', () => ({ readSessionUserId }));

const findMemberContextByUserId = vi.fn();
vi.mock('@/features/couple/membership', () => ({ findMemberContextByUserId }));

const { defineMemberAction } = await import('./define-member-action');

const inputSchema = z.object({ title: z.string().min(1) });
const memberContext: MemberContext = { memberId: 'member-1', coupleId: 'couple-1', color: 'blue' };

describe('defineMemberAction', () => {
  beforeEach(() => {
    readSessionUserId.mockReset();
    findMemberContextByUserId.mockReset();
  });

  it('devolve unauthenticated sem consultar o casal quando não há sessão', async () => {
    readSessionUserId.mockResolvedValue(null);

    const result = await defineMemberAction({ schema: inputSchema, handler: vi.fn() })({
      title: 'x',
    });

    expect(result).toMatchObject({ ok: false, code: 'unauthenticated' });
    expect(findMemberContextByUserId).not.toHaveBeenCalled();
  });

  it('devolve couple_required sem chamar o handler quando o usuário não tem casal', async () => {
    readSessionUserId.mockResolvedValue('user-1');
    findMemberContextByUserId.mockResolvedValue(null);
    const handler = vi.fn();

    const result = await defineMemberAction({ schema: inputSchema, handler })({ title: 'x' });

    expect(result).toMatchObject({ ok: false, code: 'couple_required' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('devolve invalid_input sem chamar o handler quando o dado não passa no zod', async () => {
    readSessionUserId.mockResolvedValue('user-1');
    findMemberContextByUserId.mockResolvedValue(memberContext);
    const handler = vi.fn();

    const result = await defineMemberAction({ schema: inputSchema, handler })({ title: '' });

    expect(result).toMatchObject({ ok: false, code: 'invalid_input' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('entrega input, userId e member ao handler e devolve ok', async () => {
    readSessionUserId.mockResolvedValue('user-1');
    findMemberContextByUserId.mockResolvedValue(memberContext);
    const handler = vi.fn(
      async (context: { input: { title: string }; userId: string; member: typeof memberContext }) =>
        `${context.userId}:${context.member.coupleId}:${context.input.title}`,
    );

    const result = await defineMemberAction({ schema: inputSchema, handler })({ title: 'tarefa' });

    expect(result).toEqual({ ok: true, data: 'user-1:couple-1:tarefa' });
  });

  it('devolve failed sem vazar a mensagem interna quando o handler lança', async () => {
    readSessionUserId.mockResolvedValue('user-1');
    findMemberContextByUserId.mockResolvedValue(memberContext);
    const handler = vi.fn().mockRejectedValue(new Error('senha do banco: hunter2'));

    const result = await defineMemberAction({ schema: inputSchema, handler })({ title: 'x' });

    expect(result).toMatchObject({ ok: false, code: 'failed' });
    expect(JSON.stringify(result)).not.toContain('hunter2');
  });
});
