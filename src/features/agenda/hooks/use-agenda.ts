import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActionResult } from '@/lib/define-action';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import {
  createAgendaEventAction,
  createImportantDateAction,
  getAgendaMonthAction,
  getIcsFeedStatusAction,
  regenerateIcsFeedAction,
  removeAgendaEventAction,
  removeImportantDateAction,
  revokeIcsFeedAction,
  updateAgendaEventAction,
  updateImportantDateAction,
} from '../actions';
import type {
  AgendaEvent,
  CreateAgendaEventRequest,
  CreateImportantDateRequest,
  ImportantDate,
  UpdateAgendaEventRequest,
  UpdateImportantDateRequest,
} from '../agenda-schemas';

export const AGENDA_QUERY_KEY = ['agenda'] as const;
const ICS_FEED_QUERY_KEY = ['ics-feed'] as const;

type AgendaItemKind = 'events' | 'importantDates';

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

type ItemActionSet<K extends AgendaItemKind> = {
  create: (
    input: AgendaItemTypes[K]['create'],
  ) => Promise<ActionResult<AgendaItemTypes[K]['item']>>;
  update: (input: {
    id: string;
    data: AgendaItemTypes[K]['update'];
  }) => Promise<ActionResult<AgendaItemTypes[K]['item']>>;
  remove: (input: { id: string }) => Promise<ActionResult<null>>;
};

const ITEM_ACTIONS: { [K in AgendaItemKind]: ItemActionSet<K> } = {
  events: {
    create: createAgendaEventAction,
    update: updateAgendaEventAction,
    remove: removeAgendaEventAction,
  },
  importantDates: {
    create: createImportantDateAction,
    update: updateImportantDateAction,
    remove: removeImportantDateAction,
  },
};

export function useAgenda(month: string) {
  return useQuery({
    queryKey: [...AGENDA_QUERY_KEY, month],
    queryFn: async () => unwrapActionResult(await getAgendaMonthAction({ month })),
    placeholderData: keepPreviousData,
  });
}

export function useCreateAgendaItem<K extends AgendaItemKind>(kind: K) {
  const queryClient = useQueryClient();
  const actions: ItemActionSet<K> = ITEM_ACTIONS[kind];

  return useMutation({
    mutationFn: async (payload: AgendaItemTypes[K]['create']) =>
      unwrapActionResult(await actions.create(payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY }),
  });
}

export function useUpdateAgendaItem<K extends AgendaItemKind>(kind: K) {
  const queryClient = useQueryClient();
  const actions: ItemActionSet<K> = ITEM_ACTIONS[kind];

  return useMutation({
    mutationFn: async ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: AgendaItemTypes[K]['update'];
    }) => unwrapActionResult(await actions.update({ id: itemId, data: payload })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY }),
  });
}

export function useDeleteAgendaItem(kind: AgendaItemKind) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      unwrapActionResult(await ITEM_ACTIONS[kind].remove({ id: itemId }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY }),
  });
}

export function useIcsFeedStatus() {
  return useQuery({
    queryKey: ICS_FEED_QUERY_KEY,
    queryFn: async () => unwrapActionResult(await getIcsFeedStatusAction(undefined)),
  });
}

export function useRegenerateIcsFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => unwrapActionResult(await regenerateIcsFeedAction(undefined)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ICS_FEED_QUERY_KEY }),
  });
}

export function useRevokeIcsFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      unwrapActionResult(await revokeIcsFeedAction(undefined));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ICS_FEED_QUERY_KEY }),
  });
}
