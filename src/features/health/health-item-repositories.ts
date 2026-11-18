import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { getDatabase } from '@/db/client';
import {
  allergies,
  doctors,
  emergencyContacts,
  healthConditions,
  healthEvents,
  type AllergyRow,
  type DoctorRow,
  type EmergencyContactRow,
  type HealthConditionRow,
  type HealthEventRow,
  type NewAllergyRow,
  type NewDoctorRow,
  type NewEmergencyContactRow,
  type NewHealthConditionRow,
  type NewHealthEventRow,
} from '@/db/health-schema';

// Todo método recebe `coupleId` e `memberId`: um item nunca é lido nem gravado fora da
// ficha do membro pedido. A exclusão é lógica (`is_active = false`).

/** Contrato comum dos cinco tipos de item da ficha. */
export type HealthItemRepository<Row, NewRow> = {
  listByMember: (coupleId: string, memberId: string) => Promise<Row[]>;
  findActive: (coupleId: string, memberId: string, itemId: string) => Promise<Row | null>;
  insert: (data: NewRow) => Promise<Row>;
  update: (
    coupleId: string,
    memberId: string,
    itemId: string,
    data: Partial<NewRow>,
  ) => Promise<Row>;
  softDelete: (coupleId: string, memberId: string, itemId: string) => Promise<boolean>;
};

type OwnedColumns = {
  coupleId: PgColumn;
  memberId: PgColumn;
  isActive: PgColumn;
};

function activeOfMember(columns: OwnedColumns, coupleId: string, memberId: string): SQL {
  const condition = and(
    eq(columns.coupleId, coupleId),
    eq(columns.memberId, memberId),
    eq(columns.isActive, true),
  );
  if (!condition) throw new Error('Condição de posse vazia');
  return condition;
}

function ofItem(columns: OwnedColumns & { id: PgColumn }, ...scope: [string, string, string]): SQL {
  const [coupleId, memberId, itemId] = scope;
  const condition = and(activeOfMember(columns, coupleId, memberId), eq(columns.id, itemId));
  if (!condition) throw new Error('Condição de item vazia');
  return condition;
}

export const allergiesRepository: HealthItemRepository<AllergyRow, NewAllergyRow> = {
  listByMember: (coupleId, memberId) =>
    getDatabase()
      .select()
      .from(allergies)
      .where(activeOfMember(allergies, coupleId, memberId))
      .orderBy(
        sql`case ${allergies.severity} when 'severe' then 0 when 'moderate' then 1 else 2 end`,
        asc(allergies.createdAt),
      ),
  findActive: async (coupleId, memberId, itemId) => {
    const [row] = await getDatabase()
      .select()
      .from(allergies)
      .where(ofItem(allergies, coupleId, memberId, itemId))
      .limit(1);
    return row ?? null;
  },
  insert: async (data) => {
    const [row] = await getDatabase().insert(allergies).values(data).returning();
    if (!row) throw new Error('Falha ao criar alergia');
    return row;
  },
  update: async (coupleId, memberId, itemId, data) => {
    const [row] = await getDatabase()
      .update(allergies)
      .set(data)
      .where(ofItem(allergies, coupleId, memberId, itemId))
      .returning();
    if (!row) throw new Error('Alergia não encontrada para editar');
    return row;
  },
  softDelete: async (coupleId, memberId, itemId) => {
    const deleted = await getDatabase()
      .update(allergies)
      .set({ isActive: false })
      .where(ofItem(allergies, coupleId, memberId, itemId))
      .returning({ id: allergies.id });
    return deleted.length > 0;
  },
};

export const conditionsRepository: HealthItemRepository<HealthConditionRow, NewHealthConditionRow> =
  {
    listByMember: (coupleId, memberId) =>
      getDatabase()
        .select()
        .from(healthConditions)
        .where(activeOfMember(healthConditions, coupleId, memberId))
        .orderBy(asc(healthConditions.createdAt)),
    findActive: async (coupleId, memberId, itemId) => {
      const [row] = await getDatabase()
        .select()
        .from(healthConditions)
        .where(ofItem(healthConditions, coupleId, memberId, itemId))
        .limit(1);
      return row ?? null;
    },
    insert: async (data) => {
      const [row] = await getDatabase().insert(healthConditions).values(data).returning();
      if (!row) throw new Error('Falha ao criar condição');
      return row;
    },
    update: async (coupleId, memberId, itemId, data) => {
      const [row] = await getDatabase()
        .update(healthConditions)
        .set(data)
        .where(ofItem(healthConditions, coupleId, memberId, itemId))
        .returning();
      if (!row) throw new Error('Condição não encontrada para editar');
      return row;
    },
    softDelete: async (coupleId, memberId, itemId) => {
      const deleted = await getDatabase()
        .update(healthConditions)
        .set({ isActive: false })
        .where(ofItem(healthConditions, coupleId, memberId, itemId))
        .returning({ id: healthConditions.id });
      return deleted.length > 0;
    },
  };

export const contactsRepository: HealthItemRepository<EmergencyContactRow, NewEmergencyContactRow> =
  {
    listByMember: (coupleId, memberId) =>
      getDatabase()
        .select()
        .from(emergencyContacts)
        .where(activeOfMember(emergencyContacts, coupleId, memberId))
        .orderBy(asc(emergencyContacts.createdAt)),
    findActive: async (coupleId, memberId, itemId) => {
      const [row] = await getDatabase()
        .select()
        .from(emergencyContacts)
        .where(ofItem(emergencyContacts, coupleId, memberId, itemId))
        .limit(1);
      return row ?? null;
    },
    insert: async (data) => {
      const [row] = await getDatabase().insert(emergencyContacts).values(data).returning();
      if (!row) throw new Error('Falha ao criar contato');
      return row;
    },
    update: async (coupleId, memberId, itemId, data) => {
      const [row] = await getDatabase()
        .update(emergencyContacts)
        .set(data)
        .where(ofItem(emergencyContacts, coupleId, memberId, itemId))
        .returning();
      if (!row) throw new Error('Contato não encontrado para editar');
      return row;
    },
    softDelete: async (coupleId, memberId, itemId) => {
      const deleted = await getDatabase()
        .update(emergencyContacts)
        .set({ isActive: false })
        .where(ofItem(emergencyContacts, coupleId, memberId, itemId))
        .returning({ id: emergencyContacts.id });
      return deleted.length > 0;
    },
  };

export const doctorsRepository: HealthItemRepository<DoctorRow, NewDoctorRow> = {
  listByMember: (coupleId, memberId) =>
    getDatabase()
      .select()
      .from(doctors)
      .where(activeOfMember(doctors, coupleId, memberId))
      .orderBy(asc(doctors.createdAt)),
  findActive: async (coupleId, memberId, itemId) => {
    const [row] = await getDatabase()
      .select()
      .from(doctors)
      .where(ofItem(doctors, coupleId, memberId, itemId))
      .limit(1);
    return row ?? null;
  },
  insert: async (data) => {
    const [row] = await getDatabase().insert(doctors).values(data).returning();
    if (!row) throw new Error('Falha ao criar médico');
    return row;
  },
  update: async (coupleId, memberId, itemId, data) => {
    const [row] = await getDatabase()
      .update(doctors)
      .set(data)
      .where(ofItem(doctors, coupleId, memberId, itemId))
      .returning();
    if (!row) throw new Error('Médico não encontrado para editar');
    return row;
  },
  softDelete: async (coupleId, memberId, itemId) => {
    const deleted = await getDatabase()
      .update(doctors)
      .set({ isActive: false })
      .where(ofItem(doctors, coupleId, memberId, itemId))
      .returning({ id: doctors.id });
    return deleted.length > 0;
  },
};

export const eventsRepository: HealthItemRepository<HealthEventRow, NewHealthEventRow> = {
  listByMember: (coupleId, memberId) =>
    getDatabase()
      .select()
      .from(healthEvents)
      .where(activeOfMember(healthEvents, coupleId, memberId))
      .orderBy(desc(healthEvents.occurredOn), desc(healthEvents.createdAt)),
  findActive: async (coupleId, memberId, itemId) => {
    const [row] = await getDatabase()
      .select()
      .from(healthEvents)
      .where(ofItem(healthEvents, coupleId, memberId, itemId))
      .limit(1);
    return row ?? null;
  },
  insert: async (data) => {
    const [row] = await getDatabase().insert(healthEvents).values(data).returning();
    if (!row) throw new Error('Falha ao criar evento de saúde');
    return row;
  },
  update: async (coupleId, memberId, itemId, data) => {
    const [row] = await getDatabase()
      .update(healthEvents)
      .set(data)
      .where(ofItem(healthEvents, coupleId, memberId, itemId))
      .returning();
    if (!row) throw new Error('Evento de saúde não encontrado para editar');
    return row;
  },
  softDelete: async (coupleId, memberId, itemId) => {
    const deleted = await getDatabase()
      .update(healthEvents)
      .set({ isActive: false })
      .where(ofItem(healthEvents, coupleId, memberId, itemId))
      .returning({ id: healthEvents.id });
    return deleted.length > 0;
  },
};
