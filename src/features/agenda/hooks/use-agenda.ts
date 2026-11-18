import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AgendaEvent,
  AgendaResponse,
  CreateAgendaEventRequest,
  CreateImportantDateRequest,
  IcsFeedCreated,
  IcsFeedStatus,
  ImportantDate,
  UpdateAgendaEventRequest,
  UpdateImportantDateRequest,
} from '@vibru/shared';
import { api } from '@/lib/api';

export const AGENDA_QUERY_KEY = ['agenda'] as const;
const ICS_FEED_QUERY_KEY = ['ics-feed'] as const;

type AgendaItemKind = 'events' | 'importantDates';

const AGENDA_ITEM_PATHS: Record<AgendaItemKind, string> = {
  events: '/agenda/events',
  importantDates: '/agenda/important-dates',
};

type AgendaItemTypes = {
  events: {
    item: AgendaEvent;
    create: CreateAgendaEventRequest;
    update: UpdateAgendaEventRequest;
  };
  importantDates: {
    item: ImportantDate;
    create: CreateImportantDateRequest;
    update: UpdateImportantDateRequest;
  };
};

export function useAgenda(month: string) {
  return useQuery({
    queryKey: [...AGENDA_QUERY_KEY, month],
    queryFn: async () => {
      const response = await api.get<AgendaResponse>('/agenda', { params: { month } });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateAgendaItem<K extends AgendaItemKind>(kind: K) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AgendaItemTypes[K]['create']) => {
      const response = await api.post<AgendaItemTypes[K]['item']>(AGENDA_ITEM_PATHS[kind], payload);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY }),
  });
}

export function useUpdateAgendaItem<K extends AgendaItemKind>(kind: K) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: AgendaItemTypes[K]['update'];
    }) => {
      const response = await api.patch<AgendaItemTypes[K]['item']>(
        `${AGENDA_ITEM_PATHS[kind]}/${itemId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY }),
  });
}

export function useDeleteAgendaItem(kind: AgendaItemKind) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`${AGENDA_ITEM_PATHS[kind]}/${itemId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY }),
  });
}

export function useIcsFeedStatus() {
  return useQuery({
    queryKey: ICS_FEED_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<IcsFeedStatus>('/agenda/ics');
      return response.data;
    },
  });
}

export function useRegenerateIcsFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<IcsFeedCreated>('/agenda/ics');
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ICS_FEED_QUERY_KEY }),
  });
}

export function useRevokeIcsFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/agenda/ics');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ICS_FEED_QUERY_KEY }),
  });
}
