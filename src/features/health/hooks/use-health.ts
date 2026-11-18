import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
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
  HealthMembersResponse,
  HealthProfile,
  HealthRecord,
  Medication,
  PharmacyResult,
  UpdateAllergyRequest,
  UpdateDoctorRequest,
  UpdateEmergencyContactRequest,
  UpdateHealthConditionRequest,
  UpdateHealthEventRequest,
  UpdateHealthProfileRequest,
  UpdateMedicationRequest,
} from '@vibru/shared';
import { LISTS_QUERY_KEY } from '@/features/lists/hooks/use-lists';
import { TASKS_QUERY_KEY } from '@/features/tasks/hooks/use-tasks';
import { api } from '@/lib/api';
import { HEALTH_QUERY_KEY } from '../lib/query-keys';

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
    queryFn: async () => {
      const response = await api.get<HealthMembersResponse>('/health/members');
      return response.data;
    },
  });
}

export function useHealthRecord(memberId: string) {
  return useQuery({
    queryKey: healthRecordQueryKey(memberId),
    queryFn: async () => {
      const response = await api.get<HealthRecord>(`/health/members/${memberId}`);
      return response.data;
    },
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
    }) => {
      const response = await api.put<HealthProfile>(`/health/members/${memberId}/profile`, payload);
      return response.data;
    },
    onSuccess: () => invalidateHealth(queryClient),
  });
}

export function useCreateHealthItem<K extends HealthItemKind>(kind: K) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: HealthItemTypes[K]['create'];
    }) => {
      const response = await api.post<HealthItemTypes[K]['item']>(
        `/health/members/${memberId}/${kind}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => invalidateHealth(queryClient),
  });
}

export function useUpdateHealthItem<K extends HealthItemKind>(kind: K) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      itemId,
      payload,
    }: {
      memberId: string;
      itemId: string;
      payload: HealthItemTypes[K]['update'];
    }) => {
      const response = await api.patch<HealthItemTypes[K]['item']>(
        `/health/members/${memberId}/${kind}/${itemId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => invalidateHealth(queryClient),
  });
}

export function useDeleteHealthItem(kind: HealthItemKind) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, itemId }: { memberId: string; itemId: string }) => {
      await api.delete(`/health/members/${memberId}/${kind}/${itemId}`);
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
    }) => {
      const response = await api.post<Medication>(
        `/health/members/${memberId}/medications`,
        payload,
      );
      return response.data;
    },
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
    }) => {
      const response = await api.patch<Medication>(`/health/medications/${medicationId}`, payload);
      return response.data;
    },
    onSuccess: () => invalidateHealthAndTasks(queryClient),
  });
}

export function useDeleteMedication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) => {
      await api.delete(`/health/medications/${medicationId}`);
    },
    onSuccess: () => invalidateHealthAndTasks(queryClient),
  });
}

export function useAddToPharmacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medicationId: string) => {
      const response = await api.post<PharmacyResult>(
        `/health/medications/${medicationId}/pharmacy`,
      );
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY }),
  });
}
