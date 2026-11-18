import type { z } from 'zod';
import { readSessionUserId } from './session';

export type ActionFailureCode = 'unauthenticated' | 'invalid_input' | 'failed' | 'couple_required';

export type ActionResult<TData> =
  | { ok: true; data: TData }
  // field: campo do formulário a que a mensagem se refere (validações de regra de negócio).
  | { ok: false; code: ActionFailureCode; message: string; field?: string };

type ActionConfig<TInput, TData> = {
  schema: z.ZodType<TInput>;
  handler: (context: { input: TInput; userId: string }) => Promise<TData>;
};

/**
 * Único ponto de entrada das server actions autenticadas: valida a sessão antes
 * de qualquer acesso ao banco, valida o dado de fora com zod e converte falhas
 * em resultado tipado, sem vazar a mensagem interna.
 */
export function defineAction<TInput, TData>(config: ActionConfig<TInput, TData>) {
  return async function action(rawInput: unknown): Promise<ActionResult<TData>> {
    const userId = await readSessionUserId();
    if (!userId) return { ok: false, code: 'unauthenticated', message: 'Sessão expirada.' };

    const parsed = config.schema.safeParse(rawInput);
    if (!parsed.success) return { ok: false, code: 'invalid_input', message: 'Dados inválidos.' };

    try {
      return { ok: true, data: await config.handler({ input: parsed.data, userId }) };
    } catch {
      return { ok: false, code: 'failed', message: 'Não foi possível concluir a ação.' };
    }
  };
}
