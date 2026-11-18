// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

function requestTo(path: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3100'), {
    headers: cookie ? { cookie } : {},
  });
}

describe('Proxy de sessão', () => {
  it('Navegador com cookie de acesso inválido abre o /login sem ser mandado para o /app', () => {
    // A presença do cookie não prova a sessão. Mandar o /login para o /app com
    // um cookie inválido fecha o loop com o cliente, que volta ao /login.
    const response = proxy(requestTo('/login', 'better-auth.session_token=token-invalido'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('Visitante sem cookie abre o /app e vai para o /login com o destino', () => {
    const response = proxy(requestTo('/app/agenda'));

    expect(response.headers.get('location')).toBe(
      'http://localhost:3100/login?next=%2Fapp%2Fagenda',
    );
  });

  it('Visitante com cookie de sessão abre o /app sem redirecionar', () => {
    const response = proxy(requestTo('/app', 'better-auth.session_token=qualquer-token'));

    expect(response.headers.get('location')).toBeNull();
  });
});
