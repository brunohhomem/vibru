'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { loginRequestSchema, type AuthResponse } from '@vibru/shared';
import { auth } from '@/lib/auth';
import type { ActionResult } from '@/lib/define-action';
import { readSession } from '@/lib/session';

// Mesma mensagem para senha errada e e-mail inexistente: não revela quem tem conta.
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos.';
const TOO_MANY_ATTEMPTS_MESSAGE = 'Muitas tentativas. Aguarde um minuto e tente de novo.';

export async function loginAction(
  rawInput: unknown,
): Promise<ActionResult<{ mustChangePassword: boolean }>> {
  const parsed = loginRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, code: 'invalid_input', message: INVALID_CREDENTIALS_MESSAGE };
  }

  try {
    const result = await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
    const mustChangePassword = Boolean(
      (result.user as { mustChangePassword?: boolean }).mustChangePassword,
    );
    return { ok: true, data: { mustChangePassword } };
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) {
      return { ok: false, code: 'failed', message: TOO_MANY_ATTEMPTS_MESSAGE };
    }
    return { ok: false, code: 'unauthenticated', message: INVALID_CREDENTIALS_MESSAGE };
  }
}

export async function logoutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
}

// Mantém o formato antigo (AuthResponse) enquanto as telas da Fase 2 ainda o consomem.
export async function getCurrentUserAction(): Promise<ActionResult<AuthResponse>> {
  const session = await readSession();
  if (!session) return { ok: false, code: 'unauthenticated', message: 'Sessão expirada.' };

  const { user } = session;
  return {
    ok: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: 'user',
        mustChangePassword: Boolean((user as { mustChangePassword?: boolean }).mustChangePassword),
        emailVerified: user.emailVerified,
      },
    },
  };
}
