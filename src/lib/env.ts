import { z } from 'zod';

const MINIMUM_SECRET_LENGTH = 32;

const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // Conexão direta (sem -pooler): só para migrations e seed, nunca para o tráfego do app.
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(1),
  BETTER_AUTH_SECRET: z.string().min(MINIMUM_SECRET_LENGTH),
  BETTER_AUTH_URL: z.url().default('http://localhost:3100'),
  SEED_USER_ONE_EMAIL: z.string().optional(),
  SEED_USER_ONE_PASSWORD: z.string().optional(),
  SEED_USER_TWO_EMAIL: z.string().optional(),
  SEED_USER_TWO_PASSWORD: z.string().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnv(rawEnvironment: Record<string, string | undefined>): Environment {
  const parsed = environmentSchema.safeParse(rawEnvironment);
  if (parsed.success) return parsed.data;

  const invalidVariables = parsed.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
  throw new Error(`Variáveis de ambiente inválidas:\n${invalidVariables.join('\n')}`);
}

let cachedEnvironment: Environment | undefined;

// Lido sob demanda para que `next build` não exija .env.
export function getEnv(): Environment {
  cachedEnvironment ??= parseEnv(process.env);
  return cachedEnvironment;
}
