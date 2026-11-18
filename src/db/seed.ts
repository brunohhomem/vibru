import 'dotenv/config';
import { inArray } from 'drizzle-orm';
import { user } from './auth-schema';
import { getDatabase } from './client';
import { planCoupleSeed } from './couple-seed-plan';
import { seedCouple } from './seed-couple';
import { seedUsers } from './seed-users';
import { readSeedUsersFromEnv } from './seed-users-from-env';
import { todayInSaoPaulo } from '@/lib/calendar-date';

function optionalDate(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function runSeed(): Promise<void> {
  const inputs = readSeedUsersFromEnv(process.env);
  const usersResult = await seedUsers(inputs);
  console.log(`seed: users created ${usersResult.created}, skipped ${usersResult.skipped}`);

  const emails = inputs.map((input) => input.email.toLowerCase());
  const storedUsers = await getDatabase()
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.email, emails));

  // A ordem do .env define as cores: o primeiro usuário é azul, o segundo roxo.
  const plan = planCoupleSeed({
    users: inputs.map((input) => ({
      id: storedUsers.find((stored) => stored.email === input.email.toLowerCase())!.id,
      displayName: input.name,
    })),
    datingStartedOn: optionalDate(process.env.COUPLE_DATING_STARTED_ON),
    marriedOn: optionalDate(process.env.COUPLE_MARRIED_ON),
    today: todayInSaoPaulo(new Date()),
  });
  const coupleResult = await seedCouple(plan);
  console.log(`seed: couple ${coupleResult.created ? 'created' : 'skipped'}`);
}

runSeed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
