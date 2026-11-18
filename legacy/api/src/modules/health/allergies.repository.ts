import { Inject, Injectable } from '@nestjs/common';
import { and, eq, asc, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { allergies, type AllergyRow, type NewAllergyRow } from './health-records.entity';

/** Único acesso à tabela `allergies`. Todo método recebe `coupleId` e `memberId`. */
@Injectable()
export class AllergiesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByMember(coupleId: string, memberId: string): Promise<AllergyRow[]> {
    return this.db
      .select()
      .from(allergies)
      .where(
        and(
          eq(allergies.coupleId, coupleId),
          eq(allergies.memberId, memberId),
          eq(allergies.isActive, true),
        ),
      )
      .orderBy(
        sql`case ${allergies.severity} when 'severe' then 0 when 'moderate' then 1 else 2 end`,
        asc(allergies.createdAt),
      );
  }

  async findActive(coupleId: string, memberId: string, itemId: string): Promise<AllergyRow | null> {
    const result = await this.db
      .select()
      .from(allergies)
      .where(
        and(
          and(
            eq(allergies.coupleId, coupleId),
            eq(allergies.memberId, memberId),
            eq(allergies.isActive, true),
          ),
          eq(allergies.id, itemId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewAllergyRow): Promise<AllergyRow> {
    const result = await this.db.insert(allergies).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar alergia');
    return result[0];
  }

  async update(
    coupleId: string,
    memberId: string,
    itemId: string,
    data: Partial<NewAllergyRow>,
  ): Promise<AllergyRow> {
    const result = await this.db
      .update(allergies)
      .set(data)
      .where(
        and(
          and(
            eq(allergies.coupleId, coupleId),
            eq(allergies.memberId, memberId),
            eq(allergies.isActive, true),
          ),
          eq(allergies.id, itemId),
        ),
      )
      .returning();
    if (!result[0]) throw new Error('Alergia não encontrado para editar');
    return result[0];
  }

  async softDelete(coupleId: string, memberId: string, itemId: string): Promise<boolean> {
    const result = await this.db
      .update(allergies)
      .set({ isActive: false })
      .where(
        and(
          and(
            eq(allergies.coupleId, coupleId),
            eq(allergies.memberId, memberId),
            eq(allergies.isActive, true),
          ),
          eq(allergies.id, itemId),
        ),
      )
      .returning({ id: allergies.id });

    return result.length > 0;
  }
}
