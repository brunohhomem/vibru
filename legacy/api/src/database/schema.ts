/**
 * Agrega as entities de cada módulo. Cada feature declara sua tabela no
 * próprio `*.entity.ts`; este arquivo é o único que o Drizzle e as
 * migrations conhecem, para que `drizzle(pool, { schema })` carregue todas
 * as relações.
 */
export { systemSettings } from '../modules/settings/system-setting.entity';
export type { SystemSetting, NewSystemSetting } from '../modules/settings/system-setting.entity';

export { users, userRoleEnum } from '../modules/auth/user.entity';
export type { User, NewUser } from '../modules/auth/user.entity';

export { sessions } from '../modules/auth/session.entity';
export type { Session, NewSession } from '../modules/auth/session.entity';

export { emailTokens, emailTokenTypeEnum } from '../modules/email-tokens/email-token.entity';
export type { EmailToken, NewEmailToken } from '../modules/email-tokens/email-token.entity';

export { auditLogs } from '../modules/audit/audit-log.entity';
export type { AuditLog, NewAuditLog } from '../modules/audit/audit-log.entity';

export { people } from '../modules/people/person.entity';
export type { Person, NewPerson } from '../modules/people/person.entity';

export { couples } from '../modules/couple/couple.entity';
export type { Couple, NewCouple } from '../modules/couple/couple.entity';

export { coupleMembers, memberColorEnum } from '../modules/couple/couple-member.entity';
export type { CoupleMemberRow, NewCoupleMember } from '../modules/couple/couple-member.entity';

export { tasks, taskRecurrenceEnum, taskCategoryEnum } from '../modules/tasks/task.entity';
export type { TaskRow, NewTaskRow } from '../modules/tasks/task.entity';

export { wishes, wishCategoryEnum } from '../modules/wishes/wish.entity';
export { gifts, giftCategoryEnum } from '../modules/gifts/gift.entity';
export type { GiftRow, NewGiftRow } from '../modules/gifts/gift.entity';
export type { WishRow, NewWishRow } from '../modules/wishes/wish.entity';

export { agendaEvents, importantDates } from '../modules/agenda/agenda.entity';
export type {
  AgendaEventRow,
  NewAgendaEventRow,
  ImportantDateRow,
  NewImportantDateRow,
} from '../modules/agenda/agenda.entity';

export { lists } from '../modules/lists/list.entity';
export type { ListRow, NewListRow } from '../modules/lists/list.entity';

export { listItems } from '../modules/lists/list-item.entity';
export type { ListItemRow, NewListItemRow } from '../modules/lists/list-item.entity';

export { healthProfiles, bloodTypeEnum } from '../modules/health/health-profile.entity';
export type {
  HealthProfileRow,
  NewHealthProfileRow,
} from '../modules/health/health-profile.entity';

export {
  allergies,
  allergySeverityEnum,
  healthConditions,
  emergencyContacts,
  doctors,
  healthEventKindEnum,
  healthEvents,
} from '../modules/health/health-records.entity';
export type {
  HealthEventRow,
  NewHealthEventRow,
  AllergyRow,
  NewAllergyRow,
  HealthConditionRow,
  NewHealthConditionRow,
  EmergencyContactRow,
  NewEmergencyContactRow,
  DoctorRow,
  NewDoctorRow,
} from '../modules/health/health-records.entity';

export { medications } from '../modules/medications/medication.entity';
export type { MedicationRow, NewMedicationRow } from '../modules/medications/medication.entity';
