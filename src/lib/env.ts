import { z } from 'zod';

const MINIMUM_SECRET_LENGTH = 32;

const DEVELOPMENT_AUTH_URL = 'http://localhost:3100';
const INVALID_ENV_HEADER = 'Variáveis de ambiente inválidas:';

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // Conexão direta (sem -pooler): só para migrations e seed, nunca para o tráfego do app.
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(1),
  BETTER_AUTH_SECRET: z.string().min(MINIMUM_SECRET_LENGTH),
  BETTER_AUTH_URL: z.url().default(DEVELOPMENT_AUTH_URL),
  SEED_USER_ONE_EMAIL: z.string().optional(),
  SEED_USER_ONE_PASSWORD: z.string().optional(),
  SEED_USER_TWO_EMAIL: z.string().optional(),
  SEED_USER_TWO_PASSWORD: z.string().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

// Na Vercel, sem URL https o cookie de sessão perderia Secure e __Secure-: falha cedo em vez de abrir.
function assertAuthUrlIsSafeOnVercel(rawEnvironment: Record<string, string | undefined>): void {
  if (!rawEnvironment.VERCEL) return;

  const authUrl = rawEnvironment.BETTER_AUTH_URL;
  if (!authUrl) throw new Error(`${INVALID_ENV_HEADER}\nBETTER_AUTH_URL: obrigatória na Vercel`);
  if (!authUrl.startsWith('https://')) {
    throw new Error(`${INVALID_ENV_HEADER}\nBETTER_AUTH_URL: precisa ser https na Vercel`);
  }
}

export function parseEnv(rawEnvironment: Record<string, string | undefined>): Environment {
  assertAuthUrlIsSafeOnVercel(rawEnvironment);
  const parsed = environmentSchema.safeParse(rawEnvironment);
  if (parsed.success) return parsed.data;

  const invalidVariables = parsed.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(`${INVALID_ENV_HEADER}\n${invalidVariables.join('\n')}`);
}

let cachedEnvironment: Environment | undefined;

// Lido sob demanda para que `next build` não exija .env.
export function getEnv(): Environment {
  cachedEnvironment ??= parseEnv(process.env);
  return cachedEnvironment;
}
