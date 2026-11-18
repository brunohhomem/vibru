import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { LISTS_QUERY_KEY } from '@/features/lists/hooks/use-lists';
import { TASKS_QUERY_KEY } from '@/features/tasks/hooks/use-tasks';
import type { ActionResult } from '@/lib/define-action';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import {
  createAllergyAction,
  createConditionAction,
  createContactAction,
  createDoctorAction,
  createEventAction,
  getHealthRecordAction,
  listHealthMembersAction,
  removeAllergyAction,
  removeConditionAction,
  removeContactAction,
  removeDoctorAction,
  removeEventAction,
  saveHealthProfileAction,
  updateAllergyAction,
  updateConditionAction,
  updateContactAction,
  updateDoctorAction,
  updateEventAction,
} from '../actions';
import {
  addMedicationToPharmacyAction,
  createMedicationAction,
  removeMedicationAction,
  updateMedicationAction,
} from '../medication-actions';
import { HEALTH_QUERY_KEY } from '../lib/query-keys';
import type {
  Allergy,
  CreateAllergyRequest,
  CreateDoctorRequest,
  CreateEmergencyContactRequest,
  CreateHealthConditionRequest,
  CreateHealthEventRequest,
  CreateMedicationRequest,
  Doctor,
  EmergencyContact,
  HealthCondition,
  HealthEvent,
  UpdateAllergyRequest,
  UpdateDoctorRequest,
  UpdateEmergencyContactRequest,
  UpdateHealthConditionRequest,
  UpdateHealthEventRequest,
  UpdateHealthProfileRequest,
  UpdateMedicationRequest,
} from '../health-schemas';

/** Itens da ficha que seguem o mesmo contrato: criar, editar e excluir por membro. */
export type HealthItemKind = 'allergies' | 'conditions' | 'contacts' | 'doctors' | 'events';

type HealthItemTypes = {
  allergies: { item: Allergy; create: CreateAllergyRequest; update: UpdateAllergyRequest };
  conditions: {
    item: HealthCondition;
    create: CreateHealthConditionRequest;
    update: UpdateHealthConditionRequest;
  };
  contacts: {
    item: EmergencyContact;
    create: CreateEmergencyContactRequest;
    update: UpdateEmergencyContactRequest;
  };
  doctors: { item: Doctor; create: CreateDoctorRequest; update: UpdateDoctorRequest };
  events: {
    item: HealthEvent;
    create: CreateHealthEventRequest;
    update: UpdateHealthEventRequest;
  };
};

type ItemActionSet<K extends HealthItemKind> = {
  create: (input: {
    memberId: string;
    data: HealthItemTypes[K]['create'];
  }) => Promise<ActionResult<HealthItemTypes[K]['item']>>;
  update: (input: {
    memberId: string;
    itemId: string;
    data: HealthItemTypes[K]['update'];
  }) => Promise<ActionResult<HealthItemTypes[K]['item']>>;
  remove: (input: { memberId: string; itemId: string }) => Promise<ActionResult<null>>;
};

const ITEM_ACTIONS: { [K in HealthItemKind]: ItemActionSet<K> } = {
  allergies: {
    create: createAllergyAction,
    update: updateAllergyAction,
    remove: removeAllergyAction,
  },
  conditions: {
    create: createConditionAction,
    update: updateConditionAction,
    remove: removeConditionAction,
  },
  contacts: {
    create: createContactAction,
    update: updateContactAction,
    remove: removeContactAction,
  },
  doctors: { create: createDoctorAction, update: updateDoctorAction, remove: removeDoctorAction },
  events: { create: createEventAction, update: updateEventAction, remove: removeEventAction },
};

export function healthMembersQueryKey() {
  return [...HEALTH_QUERY_KEY, 'members'] as const;
}

export function healthRecordQueryKey(memberId: string) {
  return [...HEALTH_QUERY_KEY, 'record', memberId] as const;
}

function invalidateHealth(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: HEALTH_QUERY_KEY });
}

/** Remédio mexe nas tarefas (lembretes) e no estoque que as tarefas descontam. */
function invalidateHealthAndTasks(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
  return invalidateHealth(queryClient);
}

export function useHealthMembers() {
  return useQuery({
    queryKey: healthMembersQueryKey(),
    queryFn: async () => unwrapActionResult(await listHealthMembersAction(undefined)),
  });
}

export function useHealthRecord(memberId: string) {
  return useQuery({
    queryKey: healthRecordQueryKey(memberId),
    queryFn: async () => unwrapActionResult(await getHealthRecordAction({ memberId })),
  });
}

export function useUpdateHealthProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: UpdateHealthProfileRequest;
    }) => unwrapActionResult(await saveHealthProfileAction({ memberId, data: payload })),
    onSuccess: () => invalidateHealth(queryClient),
  });
}

export function useCreateHealthItem<K extends HealthItemKind>(kind: K) {
  const queryClient = useQueryClient();
  const actions: ItemActionSet<K> = ITEM_ACTIONS[kind];

  return useMutation({
    mutationFn: async ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: HealthItemTypes[K]['create'];
    }) => unwrapActionResult(await actions.create({ memberId, data: payload })),
    onSuccess: () => invalidateHealth(queryClient),
  });
}

export function useUpdateHealthItem<K extends HealthItemKind>(kind: K) {
  const queryClient = useQueryClient();
  const actions: ItemActionSet<K> = ITEM_ACTIONS[kind];

  return useMutation({
    mutationFn: async ({
      memberId,
      itemId,
      payload,
    }: {
      memberId: string;
      itemId: string;
      payload: HealthItemTypes[K]['update'];
    }) => unwrapActionResult(await actions.update({ memberId, itemId, data: payload })),
    onSuccess: () => invalidateHealth(queryClient),
  });
}

export function useDeleteHealthItem(kind: HealthItemKind) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, itemId }: { memberId: string; itemId: string }) => {
      unwrapActionResult(await ITEM_ACTIONS[kind].remove({ memberId, itemId }));
    },
    onSuccess: () => invalidateHealth(queryClient),
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: CreateMedicationRequest;
    }) => unwrapActionResult(await createMedicationAction({ memberId, data: payload })),
    onSuccess: () => invalidateHealthAndTasks(queryClient),
  });
}

export function useUpdateMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medicationId,
      payload,
    }: {
      medicationId: string;
      payload: UpdateMedicationRequest;
    }) => unwrapActionResult(await updateMedicationAction({ id: medicationId, data: payload })),
    onSuccess: () => invalidateHealthAndTasks(queryClient),
  });
}

export function useDeleteMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) => {
      unwrapActionResult(await removeMedicationAction({ id: medicationId }));
    },
    onSuccess: () => invalidateHealthAndTasks(queryClient),
  });
}

export function useAddToPharmacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) =>
      unwrapActionResult(await addMedicationToPharmacyAction({ id: medicationId })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY }),
  });
}
