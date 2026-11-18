import { and, eq } from 'drizzle-orm';
import { getDatabase } from '@/db/client';
import {
  healthProfiles,
  type HealthProfileRow,
  type NewHealthProfileRow,
} from '@/db/health-schema';

export async function findHealthProfile(
  coupleId: string,
  memberId: string,
): Promise<HealthProfileRow | null> {
  const [row] = await getDatabase()
    .select()
    .from(healthProfiles)
    .where(and(eq(healthProfiles.coupleId, coupleId), eq(healthProfiles.memberId, memberId)))
    .limit(1);
  return row ?? null;
}

/** A ficha tem um registro por membro: o primeiro salvar cria, os seguintes substituem. */
export async function upsertHealthProfile(data: NewHealthProfileRow): Promise<HealthProfileRow> {
  const [row] = await getDatabase()
    .insert(healthProfiles)
    .values(data)
    .onConflictDoUpdate({
      target: healthProfiles.memberId,
      set: {
        bloodType: data.bloodType,
        organDonor: data.organDonor,
        healthPlanName: data.healthPlanName,
        healthPlanNumber: data.healthPlanNumber,
        preferredHospital: data.preferredHospital,
        notes: data.notes,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error('Falha ao salvar a ficha');
  return row;
}
