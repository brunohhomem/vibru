import { boolean, index, pgEnum, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { coupleMembers } from '../couple/couple-member.entity';
import { couples } from '../couple/couple.entity';

export const bloodTypeEnum = pgEnum('blood_type', [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'unknown',
]);

/**
 * Ficha de saúde de um membro (um registro por membro). Os dois membros do
 * casal leem e editam as duas fichas (ADR 0004, decisão 2.2).
 */
export const healthProfiles = pgTable(
  'health_profiles',
  {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => coupleMembers.id, { onDelete: 'cascade' }),
    bloodType: bloodTypeEnum('blood_type').notNull().default('unknown'),
    organDonor: boolean('organ_donor'),
    healthPlanName: text('health_plan_name'),
    healthPlanNumber: text('health_plan_number'),
    preferredHospital: text('preferred_hospital'),
    notes: text('notes'),
  },
  (table) => ({
    coupleIdx: index('health_profiles_couple_id_idx').on(table.coupleId),
    memberIdx: uniqueIndex('health_profiles_member_id_idx').on(table.memberId),
  }),
);

export type HealthProfileRow = typeof healthProfiles.$inferSelect;
export type NewHealthProfileRow = typeof healthProfiles.$inferInsert;
