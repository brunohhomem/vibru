'use server';

import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies';
import { cookies, headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getEnv } from '@/lib/env';
import type { ActionResult } from '@/lib/define-action';
import { readSession } from '@/lib/session';
import { loginRequestSchema, type AuthResponse } from '@/features/auth/login-schema';

// Mesma mensagem para senha errada e e-mail inexistente: não revela quem tem conta.
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos.';
const TOO_MANY_ATTEMPTS_MESSAGE = 'Muitas tentativas. Aguarde um minuto e tente de novo.';

const SIGN_IN_PATH = '/api/auth/sign-in/email';
const FORWARDED_ADDRESS_HEADERS = ['x-vercel-forwarded-for', 'x-forwarded-for'];

// O rate limit do Better Auth só roda no roteador HTTP (auth.handler); auth.api.* o ignora.
// Por isso o login monta a requisição e passa pelo handler, repassando o IP do cliente.
function buildSignInRequest(credentials: unknown, incomingHeaders: Headers): Request {
  const requestHeaders = new Headers();
  requestHeaders.set('content-type', 'application/json');
  requestHeaders.set('origin', getEnv().BETTER_AUTH_URL);
  for (const headerName of FORWARDED_ADDRESS_HEADERS) {
    const value = incomingHeaders.get(headerName);
    if (value) requestHeaders.set(headerName, value);
  }
  return new Request(new URL(SIGN_IN_PATH, getEnv().BETTER_AUTH_URL), {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(credentials),
  });
}

async function forwardSessionCookies(response: Response): Promise<void> {
  const setCookieHeader = response.headers.get('set-cookie');
  if (!setCookieHeader) return;

  const cookieStore = await cookies();
  for (const [name, attributes] of parseSetCookieHeader(setCookieHeader)) {
    cookieStore.set(name, attributes.value, toCookieOptions(attributes));
  }
}

export async function loginAction(
  rawInput: unknown,
): Promise<ActionResult<{ mustChangePassword: boolean }>> {
  const parsed = loginRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, code: 'invalid_input', message: INVALID_CREDENTIALS_MESSAGE };
  }

  const response = await auth.handler(buildSignInRequest(parsed.data, await headers()));
  if (response.status === 429) {
    return { ok: false, code: 'failed', message: TOO_MANY_ATTEMPTS_MESSAGE };
  }
  if (!response.ok) {
    return { ok: false, code: 'unauthenticated', message: INVALID_CREDENTIALS_MESSAGE };
  }

  await forwardSessionCookies(response);
  const payload = (await response.json()) as { user?: { mustChangePassword?: boolean } };
  return { ok: true, data: { mustChangePassword: Boolean(payload.user?.mustChangePassword) } };
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
