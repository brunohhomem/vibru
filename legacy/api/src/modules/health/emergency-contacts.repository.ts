import { Inject, Injectable } from '@nestjs/common';
import { and, eq, asc } from 'drizzle-orm';
import { DATABASE, type Database } from '../../database/database.module';
import {
  emergencyContacts,
  type EmergencyContactRow,
  type NewEmergencyContactRow,
} from './health-records.entity';

/** Único acesso à tabela `emergency_contacts`. Todo método recebe `coupleId` e `memberId`. */
@Injectable()
export class EmergencyContactsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByMember(coupleId: string, memberId: string): Promise<EmergencyContactRow[]> {
    return this.db
      .select()
      .from(emergencyContacts)
      .where(
        and(
          eq(emergencyContacts.coupleId, coupleId),
          eq(emergencyContacts.memberId, memberId),
          eq(emergencyContacts.isActive, true),
        ),
      )
      .orderBy(asc(emergencyContacts.createdAt));
  }

  async findActive(
    coupleId: string,
    memberId: string,
    itemId: string,
  ): Promise<EmergencyContactRow | null> {
    const result = await this.db
      .select()
      .from(emergencyContacts)
      .where(
        and(
          and(
            eq(emergencyContacts.coupleId, coupleId),
            eq(emergencyContacts.memberId, memberId),
            eq(emergencyContacts.isActive, true),
          ),
          eq(emergencyContacts.id, itemId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(data: NewEmergencyContactRow): Promise<EmergencyContactRow> {
    const result = await this.db.insert(emergencyContacts).values(data).returning();
    if (!result[0]) throw new Error('Falha ao criar contato');
    return result[0];
  }

  async update(
    coupleId: string,
    memberId: string,
    itemId: string,
    data: Partial<NewEmergencyContactRow>,
  ): Promise<EmergencyContactRow> {
    const result = await this.db
      .update(emergencyContacts)
      .set(data)
      .where(
        and(
          and(
            eq(emergencyContacts.coupleId, coupleId),
            eq(emergencyContacts.memberId, memberId),
            eq(emergencyContacts.isActive, true),
          ),
          eq(emergencyContacts.id, itemId),
        ),
      )
      .returning();
    if (!result[0]) throw new Error('Contato não encontrado para editar');
    return result[0];
  }

  async softDelete(coupleId: string, memberId: string, itemId: string): Promise<boolean> {
    const result = await this.db
      .update(emergencyContacts)
      .set({ isActive: false })
      .where(
        and(
          and(
            eq(emergencyContacts.coupleId, coupleId),
            eq(emergencyContacts.memberId, memberId),
            eq(emergencyContacts.isActive, true),
          ),
          eq(emergencyContacts.id, itemId),
        ),
      )
      .returning({ id: emergencyContacts.id });

    return result.length > 0;
  }
}
