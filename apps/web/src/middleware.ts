import { NextResponse, type NextRequest } from 'next/server';

const ACCESS_COOKIE = 'access_token';

function matchesPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Só barra o /app sem cookie. A presença do cookie não prova a sessão, então as
 * páginas públicas (login, cadastro) nunca mandam para o /app por causa dele:
 * com um cookie inválido, esse redirect e a volta do cliente ao /login formam
 * um loop.
 */
export function middleware(request: NextRequest) {
  const hasAccessCookie = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!hasAccessCookie && matchesPath(pathname, '/app')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
