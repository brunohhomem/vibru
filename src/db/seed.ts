import 'dotenv/config';
import { seedUsers } from './seed-users';
import { readSeedUsersFromEnv } from './seed-users-from-env';

async function runSeed(): Promise<void> {
  const inputs = readSeedUsersFromEnv(process.env);
  const result = await seedUsers(inputs);
  console.log(`seed: created ${result.created}, skipped ${result.skipped}`);
}

runSeed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
