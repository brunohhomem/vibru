import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import { coupleMembers, type CoupleMemberRow } from './couple-member.entity';
import { couples, type Couple } from './couple.entity';

/**
 * Acesso a `couples` e `couple_members`. Todo método de domínio exige
 * `coupleId`; a única exceção é `findMembershipByUserId`, que resolve o
 * vínculo do usuário logado antes de existir um casal no contexto.
 */
@Injectable()
export class CoupleRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findMembershipByUserId(userId: string): Promise<CoupleMemberRow | null> {
    const result = await this.db
      .select()
      .from(coupleMembers)
      .where(eq(coupleMembers.userId, userId))
      .limit(1);
    return result[0] ?? null;
  }

  async findById(coupleId: string): Promise<Couple | null> {
    const result = await this.db.select().from(couples).where(eq(couples.id, coupleId)).limit(1);
    return result[0] ?? null;
  }

  async findMembers(coupleId: string): Promise<CoupleMemberRow[]> {
    return this.db
      .select()
      .from(coupleMembers)
      .where(eq(coupleMembers.coupleId, coupleId))
      .orderBy(asc(coupleMembers.createdAt));
  }

  async findMember(coupleId: string, memberId: string): Promise<CoupleMemberRow | null> {
    const result = await this.db
      .select()
      .from(coupleMembers)
      .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.id, memberId)))
      .limit(1);
    return result[0] ?? null;
  }

  async updateDates(
    coupleId: string,
    data: { datingStartedOn?: string | null; marriedOn?: string | null },
  ): Promise<Couple> {
    const result = await this.db
      .update(couples)
      .set(data)
      .where(eq(couples.id, coupleId))
      .returning();
    if (!result[0]) throw new Error('Couple not found');
    return result[0];
  }

  async updateMemberDisplayName(
    coupleId: string,
    memberId: string,
    displayName: string,
  ): Promise<CoupleMemberRow> {
    const result = await this.db
      .update(coupleMembers)
      .set({ displayName })
      .where(and(eq(coupleMembers.coupleId, coupleId), eq(coupleMembers.id, memberId)))
      .returning();
    if (!result[0]) throw new Error('Couple member not found');
    return result[0];
  }
}
