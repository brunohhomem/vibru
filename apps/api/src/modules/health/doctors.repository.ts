import { Inject, Injectable } from '@nestjs/common';
import { and, eq, asc } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { doctors, type DoctorRow, type NewDoctorRow } from './health-records.entity';

/** Único acesso à tabela `doctors`. Todo método recebe `coupleId` e `memberId`. */
@Injectable()
export class DoctorsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByMember(coupleId: string, memberId: string): Promise<DoctorRow[]> {
    return this.db
      .select()
      .from(doctors)
      .where(
        and(
          eq(doctors.coupleId, coupleId),
          eq(doctors.memberId, memberId),
          eq(doctors.isActive, true),
        ),
      )
      .orderBy(asc(doctors.createdAt));
  }

  async findActive(coupleId: string, memberId: string, itemId: string): Promise<DoctorRow | null> {
    const result = await this.db
      .select()
      .from(doctors)
      .where(
        and(
          and(
            eq(doctors.coupleId, coupleId),
            eq(doctors.memberId, memberId),
            eq(doctors.isActive, true),
          ),
          eq(doctors.id, itemId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewDoctorRow): Promise<DoctorRow> {
    const result = await this.db.insert(doctors).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar médico');
    return result[0];
  }

  async update(
    coupleId: string,
    memberId: string,
    itemId: string,
    data: Partial<NewDoctorRow>,
  ): Promise<DoctorRow> {
    const result = await this.db
      .update(doctors)
      .set(data)
      .where(
        and(
          and(
            eq(doctors.coupleId, coupleId),
            eq(doctors.memberId, memberId),
            eq(doctors.isActive, true),
          ),
          eq(doctors.id, itemId),
        ),
      )
      .returning();
    if (!result[0]) throw new Error('Médico não encontrado para editar');
    return result[0];
  }

  async softDelete(coupleId: string, memberId: string, itemId: string): Promise<boolean> {
    const result = await this.db
      .update(doctors)
      .set({ isActive: false })
      .where(
        and(
          and(
            eq(doctors.coupleId, coupleId),
            eq(doctors.memberId, memberId),
            eq(doctors.isActive, true),
          ),
          eq(doctors.id, itemId),
        ),
      )
      .returning({ id: doctors.id });

    return result.length > 0;
  }
}
