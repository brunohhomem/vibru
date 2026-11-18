import type { SeedUserInput } from './seed-users';

const REQUIRED_VARIABLES = [
  'SEED_USER_ONE_EMAIL',
  'SEED_USER_ONE_PASSWORD',
  'SEED_USER_TWO_EMAIL',
  'SEED_USER_TWO_PASSWORD',
] as const;

type RawEnvironment = Record<string, string | undefined>;

function nameFromEmail(email: string): string {
  return email.split('@')[0] ?? email;
}

// Falha antes de qualquer acesso ao banco, para nunca criar só um dos 2 usuários.
export function readSeedUsersFromEnv(rawEnvironment: RawEnvironment): SeedUserInput[] {
  const missingVariables = REQUIRED_VARIABLES.filter(
    (variableName) => !rawEnvironment[variableName]?.trim(),
  );
  if (missingVariables.length > 0) {
    throw new Error(`Variáveis do seed ausentes: ${missingVariables.join(', ')}`);
  }

  const userOneEmail = rawEnvironment.SEED_USER_ONE_EMAIL!.trim();
  const userTwoEmail = rawEnvironment.SEED_USER_TWO_EMAIL!.trim();
  return [
    {
      email: userOneEmail,
      password: rawEnvironment.SEED_USER_ONE_PASSWORD!,
      name: nameFromEmail(userOneEmail),
    },
    {
      email: userTwoEmail,
      password: rawEnvironment.SEED_USER_TWO_PASSWORD!,
      name: nameFromEmail(userTwoEmail),
    },
  ];
}
