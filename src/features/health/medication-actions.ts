'use server';

import { z } from 'zod';
import { getDatabase } from '@/db/client';
import type { MedicationRow } from '@/db/medications-schema';
import { addItemToNamedList } from '@/features/lists/named-list';
import { ActionFailure } from '@/lib/define-action';
import { defineMemberAction } from '@/lib/define-member-action';
import { toMedication } from './health-mappers';
import { MEDICATION_NOT_FOUND_MESSAGE, isUuid, requireCoupleMember } from './health-member-access';
import {
  createMedicationRequestSchema,
  updateMedicationRequestSchema,
  type Medication,
  type PharmacyResult,
} from './health-schemas';
import { buildMedicationUpdatePatch, sortTimes } from './medication-rules';
import { removeOpenMedicationTasks, syncMedicationTasks } from './medication-tasks';
import {
  findActiveMedication,
  insertMedication,
  softDeleteMedication,
  updateMedication,
} from './medications-repository';

const PHARMACY_LIST_TITLE = 'Farmácia';

const createSchema = z.object({ memberId: z.string(), data: createMedicationRequestSchema });
const updateSchema = z.object({ id: z.string(), data: updateMedicationRequestSchema });
const medicationIdSchema = z.object({ id: z.string() });

async function requireMedication(coupleId: string, medicationId: string): Promise<MedicationRow> {
  const row = isUuid(medicationId) ? await findActiveMedication(coupleId, medicationId) : null;
  if (!row) throw new ActionFailure('failed', MEDICATION_NOT_FOUND_MESSAGE);
  return row;
}

/** Cada mudança do remédio e a sincronização das tarefas dele acontecem na mesma transação. */
export const createMedicationAction = defineMemberAction({
  schema: createSchema,
  handler: async ({ input, member }): Promise<Medication> => {
    await requireCoupleMember(member.coupleId, input.memberId);

    const row = await getDatabase().transaction(async (transaction) => {
      const created = await insertMedication(
        {
          ...input.data,
          times: sortTimes(input.data.times),
          coupleId: member.coupleId,
          memberId: input.memberId,
        },
        transaction,
      );
      await syncMedicationTasks(created, transaction);
      return created;
    });
    return toMedication(row);
  },
});

export const updateMedicationAction = defineMemberAction({
  schema: updateSchema,
  handler: async ({ input, member }): Promise<Medication> => {
    const existing = await requireMedication(member.coupleId, input.id);

    const row = await getDatabase().transaction(async (transaction) => {
      const updated = await updateMedication(
        member.coupleId,
        input.id,
        buildMedicationUpdatePatch(existing, input.data),
        transaction,
      );
      await syncMedicationTasks(updated, transaction);
      return updated;
    });
    return toMedication(row);
  },
});

export const removeMedicationAction = defineMemberAction({
  schema: medicationIdSchema,
  handler: async ({ input, member }): Promise<null> => {
    await requireMedication(member.coupleId, input.id);

    await getDatabase().transaction(async (transaction) => {
      await softDeleteMedication(member.coupleId, input.id, transaction);
      await removeOpenMedicationTasks(member.coupleId, input.id, transaction);
    });
    return null;
  },
});

/** Resposta "Sim" à pergunta de estoque baixo: põe o remédio na lista Farmácia. */
export const addMedicationToPharmacyAction = defineMemberAction({
  schema: medicationIdSchema,
  handler: async ({ input, member }): Promise<PharmacyResult> => {
    const medication = await requireMedication(member.coupleId, input.id);
    return addItemToNamedList(member.coupleId, PHARMACY_LIST_TITLE, medication.name);
  },
});
