import { date, index, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { coreColumns } from '../../database/columns/core-columns';
import { coupleMembers } from '../couple/couple-member.entity';
import { couples } from '../couple/couple.entity';

export const allergySeverityEnum = pgEnum('allergy_severity', ['mild', 'moderate', 'severe']);
export const healthEventKindEnum = pgEnum('health_event_kind', [
  'appointment',
  'exam',
  'vaccine',
  'surgery',
  'hospitalization',
]);

/** Colunas de posse comuns aos itens da ficha: casal, membro e índices por ambos. */
function ownerColumns() {
  return {
    ...coreColumns,
    coupleId: uuid('couple_id')
      .notNull()
      .references(() => couples.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => coupleMembers.id, { onDelete: 'cascade' }),
  };
}

export const allergies = pgTable(
  'allergies',
  {
    ...ownerColumns(),
    substance: text('substance').notNull(),
    reaction: text('reaction'),
    severity: allergySeverityEnum('severity').notNull(),
  },
  (table) => ({
    coupleIdx: index('allergies_couple_id_idx').on(table.coupleId),
    memberIdx: index('allergies_member_id_idx').on(table.memberId),
  }),
);

export const healthConditions = pgTable(
  'health_conditions',
  {
    ...ownerColumns(),
    name: text('name').notNull(),
    sinceOn: date('since_on', { mode: 'string' }),
    notes: text('notes'),
  },
  (table) => ({
    coupleIdx: index('health_conditions_couple_id_idx').on(table.coupleId),
    memberIdx: index('health_conditions_member_id_idx').on(table.memberId),
  }),
);

export const emergencyContacts = pgTable(
  'emergency_contacts',
  {
    ...ownerColumns(),
    name: text('name').notNull(),
    relationship: text('relationship').notNull(),
    phone: text('phone').notNull(),
  },
  (table) => ({
    coupleIdx: index('emergency_contacts_couple_id_idx').on(table.coupleId),
    memberIdx: index('emergency_contacts_member_id_idx').on(table.memberId),
  }),
);

export const doctors = pgTable(
  'doctors',
  {
    ...ownerColumns(),
    name: text('name').notNull(),
    specialty: text('specialty'),
    phone: text('phone'),
    notes: text('notes'),
  },
  (table) => ({
    coupleIdx: index('doctors_couple_id_idx').on(table.coupleId),
    memberIdx: index('doctors_member_id_idx').on(table.memberId),
  }),
);

export const healthEvents = pgTable(
  'health_events',
  {
    ...ownerColumns(),
    kind: healthEventKindEnum('kind').notNull(),
    occurredOn: date('occurred_on', { mode: 'string' }).notNull(),
    title: text('title').notNull(),
    doctorId: uuid('doctor_id').references(() => doctors.id, { onDelete: 'set null' }),
    notes: text('notes'),
  },
  (table) => ({
    coupleIdx: index('health_events_couple_id_idx').on(table.coupleId),
    memberOccurredIdx: index('health_events_member_id_occurred_on_idx').on(
      table.memberId,
      table.occurredOn,
    ),
  }),
);

export type AllergyRow = typeof allergies.$inferSelect;
export type NewAllergyRow = typeof allergies.$inferInsert;
export type HealthConditionRow = typeof healthConditions.$inferSelect;
export type NewHealthConditionRow = typeof healthConditions.$inferInsert;
export type EmergencyContactRow = typeof emergencyContacts.$inferSelect;
export type NewEmergencyContactRow = typeof emergencyContacts.$inferInsert;
export type DoctorRow = typeof doctors.$inferSelect;
export type NewDoctorRow = typeof doctors.$inferInsert;
export type HealthEventRow = typeof healthEvents.$inferSelect;
export type NewHealthEventRow = typeof healthEvents.$inferInsert;
