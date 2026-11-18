import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { account, user } from './auth-schema';
import { getDatabase } from './client';

export type SeedUserInput = { email: string; password: string; name: string };
export type SeedUsersResult = { created: number; skipped: number };

// Insere só quem ainda não existe: rodar de novo nunca troca a senha de um usuário existente.
export async function seedUsers(inputs: SeedUserInput[]): Promise<SeedUsersResult> {
  const database = getDatabase();
  const { password: passwordHasher } = await auth.$context;
  const result: SeedUsersResult = { created: 0, skipped: 0 };

  for (const input of inputs) {
    const email = input.email.toLowerCase();
    const [existingUser] = await database
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));
    if (existingUser) {
      result.skipped += 1;
      continue;
    }

    const userId = randomUUID();
    const passwordHash = await passwordHasher.hash(input.password);
    await database.transaction(async (transaction) => {
      await transaction.insert(user).values({ id: userId, name: input.name, email });
      await transaction.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: passwordHash,
      });
    });
    result.created += 1;
  }

  return result;
}
