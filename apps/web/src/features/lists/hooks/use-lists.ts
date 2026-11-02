import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { List, ListItem, ListsResponse } from '@vibru/shared';
import { api } from '@/lib/api';

export const LISTS_QUERY_KEY = ['lists'] as const;

export function listQueryKey(listId: string) {
  return ['lists', listId] as const;
}

export type CheckItemVariables = {
  listId: string;
  itemId: string;
  memberId: string;
};

export type ItemVariables = {
  listId: string;
  itemId: string;
};

type CheckMutationContext = { previous: List | undefined };

export function useLists() {
  return useQuery({
    queryKey: LISTS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<ListsResponse>('/lists');
      return response.data;
    },
  });
}

export function useList(listId: string) {
  return useQuery({
    queryKey: listQueryKey(listId),
    queryFn: async () => {
      const response = await api.get<List>(`/lists/${listId}`);
      return response.data;
    },
  });
}

function invalidateLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
}

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      const response = await api.post<List>('/lists', { title });
      return response.data;
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useRenameList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: string }) => {
      const response = await api.patch<List>(`/lists/${listId}`, { title });
      return response.data;
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      await api.delete(`/lists/${listId}`);
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useAddListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: string }) => {
      const response = await api.post<ListItem>(`/lists/${listId}/items`, { title });
      return response.data;
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useUpdateListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, itemId, title }: ItemVariables & { title: string }) => {
      const response = await api.patch<ListItem>(`/lists/${listId}/items/${itemId}`, { title });
      return response.data;
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useDeleteListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, itemId }: ItemVariables) => {
      await api.delete(`/lists/${listId}/items/${itemId}`);
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useClearCheckedItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      await api.delete(`/lists/${listId}/items/checked`);
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

/** Reordena como a API: abertos por criação, marcados no fim por marcação mais recente. */
function sortItems(items: ListItem[]): ListItem[] {
  const open = items.filter((item) => item.checkedAt === null);
  const checked = items
    .filter((item) => item.checkedAt !== null)
    .sort((left, right) => (right.checkedAt ?? '').localeCompare(left.checkedAt ?? ''));
  return [...open, ...checked];
}

function useOptimisticItemToggle(action: 'check' | 'uncheck') {
  const queryClient = useQueryClient();

  return useMutation<ListItem, unknown, CheckItemVariables, CheckMutationContext>({
    mutationFn: async ({ listId, itemId }) => {
      const response = await api.post<ListItem>(`/lists/${listId}/items/${itemId}/${action}`);
      return response.data;
    },
    onMutate: async ({ listId, itemId, memberId }) => {
      const key = listQueryKey(listId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<List>(key);

      if (previous) {
        const checkedAt = action === 'check' ? new Date().toISOString() : null;
        const checkedByMemberId = action === 'check' ? memberId : null;
        queryClient.setQueryData<List>(key, {
          ...previous,
          items: sortItems(
            previous.items.map((item) =>
              item.id === itemId ? { ...item, checkedAt, checkedByMemberId } : item,
            ),
          ),
        });
      }

      return { previous };
    },
    onError: (_error, { listId }, context) => {
      if (!context?.previous) return;
      queryClient.setQueryData(listQueryKey(listId), context.previous);
    },
    onSettled: () => invalidateLists(queryClient),
  });
}

export function useCheckListItem() {
  return useOptimisticItemToggle('check');
}

export function useUncheckListItem() {
  return useOptimisticItemToggle('uncheck');
}
