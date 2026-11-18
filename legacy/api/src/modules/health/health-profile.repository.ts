import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  healthProfiles,
  type HealthProfileRow,
  type NewHealthProfileRow,
} from './health-profile.entity';

@Injectable()
export class HealthProfileRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByMember(coupleId: string, memberId: string): Promise<HealthProfileRow | null> {
    const result = await this.db
      .select()
      .from(healthProfiles)
      .where(and(eq(healthProfiles.coupleId, coupleId), eq(healthProfiles.memberId, memberId)))
      .limit(1);

    return result[0] ?? null;
  }

  /** A ficha tem um registro por membro: o primeiro salvar cria, os seguintes substituem. */
  async upsert(data: NewHealthProfileRow): Promise<HealthProfileRow> {
    const result = await this.db
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
    if (!result[0]) throw new Error('Falha ao salvar a ficha');
    return result[0];
  }
}
