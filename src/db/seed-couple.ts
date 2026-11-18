import { inArray } from 'drizzle-orm';
import { getDatabase } from './client';
import { coupleMembers, couples } from './couple-schema';
import type { CoupleSeedPlan } from './couple-seed-plan';

// Idempotente: se qualquer um dos usuários já tem vínculo, não cria nada.
export async function seedCouple(plan: CoupleSeedPlan): Promise<{ created: boolean }> {
  const database = getDatabase();
  const userIds = plan.members.map((member) => member.userId);

  const existingMemberships = await database
    .select({ id: coupleMembers.id })
    .from(coupleMembers)
    .where(inArray(coupleMembers.userId, userIds));
  if (existingMemberships.length > 0) return { created: false };

  await database.transaction(async (transaction) => {
    const [couple] = await transaction.insert(couples).values(plan.dates).returning({
      id: couples.id,
    });
    if (!couple) throw new Error('Seed: falha ao criar o casal');

    await transaction.insert(coupleMembers).values(
      plan.members.map((member) => ({
        coupleId: couple.id,
        userId: member.userId,
        displayName: member.displayName,
        color: member.color,
      })),
    );
  });

  return { created: true };
}
