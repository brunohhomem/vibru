import { headers } from 'next/headers';
import { auth } from './auth';

export async function readSession() {
  // headers() primeiro: torna a rota dinâmica antes de qualquer leitura de env (next build).
  const requestHeaders = await headers();
  return auth.api.getSession({ headers: requestHeaders });
}

// Id do usuário logado, ou null quando não há sessão válida.
export async function readSessionUserId(): Promise<string | null> {
  const session = await readSession();
  return session?.user.id ?? null;
}
