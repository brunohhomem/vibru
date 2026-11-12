import { Injectable } from '@nestjs/common';
import { Response } from 'express';

export interface CookieConfig {
  secure: boolean;
  refreshTtlDays: number;
}

@Injectable()
export class CookieService {
  constructor(private readonly config: CookieConfig) {}

  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const { secure, refreshTtlDays } = this.config;
    const sessionMaxAge = refreshTtlDays * 24 * 60 * 60 * 1000;

    // O middleware do web só enxerga este cookie. Se ele sumisse junto com o JWT
    // (15 min), a navegação cairia no login com a sessão de 90 dias ainda válida;
    // o JWT expirado dentro dele responde 401 e o cliente renova pelo refresh.
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAge,
    });

    // Refresh token cookie - only available on /api/auth path
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: sessionMaxAge,
    });
  }

  clearAuthCookies(res: Response): void {
    const { secure } = this.config;

    res.clearCookie('access_token', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  getAccessToken(req: { cookies?: Record<string, string> }): string | undefined {
    return req.cookies?.access_token;
  }

  getRefreshToken(req: { cookies?: Record<string, string> }): string | undefined {
    return req.cookies?.refresh_token;
  }
}
