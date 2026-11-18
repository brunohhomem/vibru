import type { z } from 'zod';
import { findMemberContextByUserId, type MemberContext } from '@/features/couple/membership';
import { toFailureResult, type ActionResult } from './define-action';
import { readSessionUserId } from './session';

type MemberActionConfig<TInput, TData> = {
  schema: z.ZodType<TInput>;
  handler: (context: { input: TInput; userId: string; member: MemberContext }) => Promise<TData>;
};

/**
 * Como `defineAction`, mas também resolve o vínculo do usuário com o casal
 * (o antigo CoupleMemberGuard) antes de validar o dado e rodar o handler.
 */
export function defineMemberAction<TInput, TData>(config: MemberActionConfig<TInput, TData>) {
  return async function memberAction(rawInput: unknown): Promise<ActionResult<TData>> {
    const userId = await readSessionUserId();
    if (!userId) return { ok: false, code: 'unauthenticated', message: 'Sessão expirada.' };

    const member = await findMemberContextByUserId(userId);
    if (!member) {
      return {
        ok: false,
        code: 'couple_required',
        message: 'Sua conta não está ligada a um casal.',
      };
    }

    const parsed = config.schema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, code: 'invalid_input', message: 'Dados inválidos.' };

    try {
      return { ok: true, data: await config.handler({ input: parsed.data, userId, member }) };
    } catch (error) {
      return toFailureResult(error);
    }
  };
}
