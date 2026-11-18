import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { List, ListItem } from '@/features/lists/list-schemas';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import {
  addListItemAction,
  checkListItemAction,
  clearCheckedItemsAction,
  createListAction,
  editListItemAction,
  getListAction,
  listListsAction,
  removeListAction,
  removeListItemAction,
  renameListAction,
  uncheckListItemAction,
} from '../actions';

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
    queryFn: async () => unwrapActionResult(await listListsAction(undefined)),
  });
}

export function useList(listId: string) {
  return useQuery({
    queryKey: listQueryKey(listId),
    queryFn: async () => unwrapActionResult(await getListAction({ id: listId })),
  });
}

function invalidateLists(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: LISTS_QUERY_KEY });
}

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => unwrapActionResult(await createListAction({ title })),
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useRenameList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: string }) =>
      unwrapActionResult(await renameListAction({ id: listId, title })),
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      unwrapActionResult(await removeListAction({ id: listId }));
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useAddListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, title }: { listId: string; title: string }) =>
      unwrapActionResult(await addListItemAction({ listId, title })),
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useUpdateListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, itemId, title }: ItemVariables & { title: string }) =>
      unwrapActionResult(await editListItemAction({ listId, itemId, title })),
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useDeleteListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, itemId }: ItemVariables) => {
      unwrapActionResult(await removeListItemAction({ listId, itemId }));
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

export function useClearCheckedItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listId: string) => {
      unwrapActionResult(await clearCheckedItemsAction({ listId }));
    },
    onSuccess: () => invalidateLists(queryClient),
  });
}

/** Reordena como o servidor: abertos por criação, marcados no fim por marcação mais recente. */
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
      const toggle = action === 'check' ? checkListItemAction : uncheckListItemAction;
      return unwrapActionResult(await toggle({ listId, itemId }));
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
