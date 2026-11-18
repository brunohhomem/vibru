// Monta a requisição HTTP de login que os testes de integração enviam ao handler do Better Auth.
export function buildSignInRequest(email: string, password: string, clientIp: string): Request {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  headers.set('x-forwarded-for', clientIp);
  return new Request('http://localhost:3100/api/auth/sign-in/email', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  });
}
