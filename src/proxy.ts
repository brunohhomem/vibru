import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

function matchesPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Checagem barata: só barra o /app sem cookie de sessão. A presença do cookie não
 * prova a sessão (isso é feito no layout e em cada action), então as páginas
 * públicas nunca mandam para o /app por causa dele: com um cookie inválido, esse
 * redirect e a volta do layout ao /login formariam um loop.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const { pathname } = request.nextUrl;

  if (!hasSessionCookie && matchesPath(pathname, '/app')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
