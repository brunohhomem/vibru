'use server';

import { z } from 'zod';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { findCoupleMembers } from '@/features/couple/couple-repository';
import { defineHealthItemActions } from './define-health-item-actions';
import {
  allergiesRepository,
  conditionsRepository,
  contactsRepository,
  doctorsRepository,
  eventsRepository,
} from './health-item-repositories';
import {
  emptyProfile,
  emptyToNull,
  toAllergy,
  toDoctor,
  toEmergencyContact,
  toHealthCondition,
  toHealthEvent,
  toHealthProfile,
  toMedication,
} from './health-mappers';
import { ITEM_NOT_FOUND_MESSAGE, isUuid, requireCoupleMember } from './health-member-access';
import { findHealthProfile, upsertHealthProfile } from './health-profile-repository';
import {
  createAllergyRequestSchema,
  createDoctorRequestSchema,
  createEmergencyContactRequestSchema,
  createHealthConditionRequestSchema,
  createHealthEventRequestSchema,
  updateAllergyRequestSchema,
  updateDoctorRequestSchema,
  updateEmergencyContactRequestSchema,
  updateHealthConditionRequestSchema,
  updateHealthEventRequestSchema,
  updateHealthProfileRequestSchema,
  type HealthMembersResponse,
  type HealthProfile,
  type HealthRecord,
} from './health-schemas';
import { countMedicationsByMember, listMedicationsByMember } from './medications-repository';

const memberIdSchema = z.object({ memberId: z.string() });
const saveProfileSchema = z.object({
  memberId: z.string(),
  data: updateHealthProfileRequestSchema,
});

export const listHealthMembersAction = defineMemberAction({
  schema: z.undefined(),
  handler: async ({ member }): Promise<HealthMembersResponse> => {
    const [members, counts] = await Promise.all([
      findCoupleMembers(member.coupleId),
      countMedicationsByMember(member.coupleId),
    ]);
    const countByMember = new Map(counts.map((row) => [row.memberId, row.medicationCount]));

    return {
      members: members.map((entry) => ({
        memberId: entry.id,
        name: entry.displayName,
        medicationCount: countByMember.get(entry.id) ?? 0,
      })),
    };
  },
});

/** Ficha completa de um membro, para a tela de ficha e o modo emergência. */
export const getHealthRecordAction = defineMemberAction({
  schema: memberIdSchema,
  handler: async ({ input, member }): Promise<HealthRecord> => {
    const target = await requireCoupleMember(member.coupleId, input.memberId);
    const { coupleId } = member;
    const { memberId } = input;

    const [profile, allergies, conditions, contacts, doctors, medications, events] =
      await Promise.all([
        findHealthProfile(coupleId, memberId),
        allergiesRepository.listByMember(coupleId, memberId),
        conditionsRepository.listByMember(coupleId, memberId),
        contactsRepository.listByMember(coupleId, memberId),
        doctorsRepository.listByMember(coupleId, memberId),
        listMedicationsByMember(coupleId, memberId),
        eventsRepository.listByMember(coupleId, memberId),
      ]);

    return {
      memberId: target.id,
      memberName: target.displayName,
      profile: profile ? toHealthProfile(profile) : emptyProfile(),
      allergies: allergies.map(toAllergy),
      conditions: conditions.map(toHealthCondition),
      contacts: contacts.map(toEmergencyContact),
      doctors: doctors.map(toDoctor),
      medications: medications.map(toMedication),
      events: events.map(toHealthEvent),
    };
  },
});

/** Salvar substitui a ficha inteira: campo ausente no corpo vira vazio. */
export const saveHealthProfileAction = defineMemberAction({
  schema: saveProfileSchema,
  handler: async ({ input, member }): Promise<HealthProfile> => {
    await requireCoupleMember(member.coupleId, input.memberId);
    const { data } = input;

    const row = await upsertHealthProfile({
      coupleId: member.coupleId,
      memberId: input.memberId,
      bloodType: data.bloodType,
      organDonor: data.organDonor ?? null,
      healthPlanName: emptyToNull(data.healthPlanName),
      healthPlanNumber: emptyToNull(data.healthPlanNumber),
      preferredHospital: emptyToNull(data.preferredHospital),
      notes: emptyToNull(data.notes),
    });
    return toHealthProfile(row);
  },
});

const allergyActions = defineHealthItemActions({
  repository: allergiesRepository,
  createSchema: createAllergyRequestSchema,
  updateSchema: updateAllergyRequestSchema,
  toItem: toAllergy,
  toNewRow: (data, scope) => ({ ...data, ...scope }),
  toChanges: (data) => data,
});
const conditionActions = defineHealthItemActions({
  repository: conditionsRepository,
  createSchema: createHealthConditionRequestSchema,
  updateSchema: updateHealthConditionRequestSchema,
  toItem: toHealthCondition,
  toNewRow: (data, scope) => ({ ...data, ...scope }),
  toChanges: (data) => data,
});
const contactActions = defineHealthItemActions({
  repository: contactsRepository,
  createSchema: createEmergencyContactRequestSchema,
  updateSchema: updateEmergencyContactRequestSchema,
  toItem: toEmergencyContact,
  toNewRow: (data, scope) => ({ ...data, ...scope }),
  toChanges: (data) => data,
});
const doctorActions = defineHealthItemActions({
  repository: doctorsRepository,
  createSchema: createDoctorRequestSchema,
  updateSchema: updateDoctorRequestSchema,
  toItem: toDoctor,
  toNewRow: (data, scope) => ({ ...data, ...scope }),
  toChanges: (data) => data,
});
const eventActions = defineHealthItemActions({
  repository: eventsRepository,
  createSchema: createHealthEventRequestSchema,
  updateSchema: updateHealthEventRequestSchema,
  toItem: toHealthEvent,
  toNewRow: (data, scope) => ({ ...data, ...scope }),
  toChanges: (data) => data,
  // O vínculo só vale para médico da ficha do mesmo membro; a FK não garante o casal.
  beforeWrite: async ({ coupleId, memberId }, data) => {
    const doctorId = 'doctorId' in data ? data.doctorId : undefined;
    if (!doctorId) return;

    const doctor = isUuid(doctorId)
      ? await doctorsRepository.findActive(coupleId, memberId, doctorId)
      : null;
    if (!doctor) throw new ActionFailure('failed', ITEM_NOT_FOUND_MESSAGE);
  },
});

export const createAllergyAction = allergyActions.create;
export const updateAllergyAction = allergyActions.update;
export const removeAllergyAction = allergyActions.remove;
export const createConditionAction = conditionActions.create;
export const updateConditionAction = conditionActions.update;
export const removeConditionAction = conditionActions.remove;
export const createContactAction = contactActions.create;
export const updateContactAction = contactActions.update;
export const removeContactAction = contactActions.remove;
export const createDoctorAction = doctorActions.create;
export const updateDoctorAction = doctorActions.update;
export const removeDoctorAction = doctorActions.remove;
export const createEventAction = eventActions.create;
export const updateEventAction = eventActions.update;
export const removeEventAction = eventActions.remove;
