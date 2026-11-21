import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDatabase } from '@/db/client';
import * as schema from '@/db/schema';
import { getEnv } from './env';

const NINETY_DAYS_IN_SECONDS = 60 * 60 * 24 * 90;
const SESSION_COOKIE_CACHE_IN_SECONDS = 60 * 5;
const LOGIN_ATTEMPT_WINDOW_IN_SECONDS = 60;
const MAXIMUM_LOGIN_ATTEMPTS_PER_WINDOW = 5;

const SIGN_IN_PATH = '/sign-in/email';
const loginAttemptRule = {
  window: LOGIN_ATTEMPT_WINDOW_IN_SECONDS,
  max: MAXIMUM_LOGIN_ATTEMPTS_PER_WINDOW,
};

function createAuth() {
  const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = getEnv();

  return betterAuth({
    secret: BETTER_AUTH_SECRET,
    baseURL: BETTER_AUTH_URL,
    database: drizzleAdapter(getDatabase(), { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      // Os 2 usuários vêm do seed; não existe cadastro aberto.
      disableSignUp: true,
    },
    session: {
      expiresIn: NINETY_DAYS_IN_SECONDS,
      // Cada action lê a sessão; com o cache no cookie assinado isso deixa de ir ao banco a cada
      // chamada. Custo aceito: um logout em outro aparelho vale em até 5 minutos.
      cookieCache: { enabled: true, maxAge: SESSION_COOKIE_CACHE_IN_SECONDS },
    },
    user: {
      additionalFields: {
        mustChangePassword: { type: 'boolean', required: false, defaultValue: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
      window: LOGIN_ATTEMPT_WINDOW_IN_SECONDS,
      max: 100,
      customRules: Object.fromEntries([[SIGN_IN_PATH, loginAttemptRule]]),
    },
    // O limite por IP supõe a Vercel, que sobrescreve esses cabeçalhos com o IP real do cliente.
    advanced: { ipAddress: { ipAddressHeaders: ['x-vercel-forwarded-for', 'x-forwarded-for'] } },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as typeof globalThis & { vibruAuth?: AuthInstance };

// Lazy como o banco: `next build` não tem BETTER_AUTH_SECRET.
function getAuth(): AuthInstance {
  globalForAuth.vibruAuth ??= createAuth();
  return globalForAuth.vibruAuth;
}

export const auth = new Proxy({} as AuthInstance, {
  get: (_target, property) => Reflect.get(getAuth(), property),
  has: (_target, property) => Reflect.has(getAuth(), property),
});

export type Session = AuthInstance['$Infer']['Session'];
