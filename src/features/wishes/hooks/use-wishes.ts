import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { AGENDA_QUERY_KEY } from '@/features/agenda/hooks/use-agenda';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import {
  createWishAction,
  listWishesAction,
  planWishAction,
  removeWishAction,
  setWishDoneAction,
  updateWishAction,
} from '../actions';
import type { WishStatus } from '../wish-constants';
import type { CreateWishRequest, PlanWishRequest, UpdateWishRequest } from '../wish-schemas';

export const WISHES_QUERY_KEY = ['wishes'] as const;

function invalidateWishes(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: WISHES_QUERY_KEY });
}

export function useWishes(filters: { status: WishStatus }) {
  return useQuery({
    queryKey: [...WISHES_QUERY_KEY, filters.status],
    queryFn: async () => unwrapActionResult(await listWishesAction({ status: filters.status })),
  });
}

export function useCreateWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWishRequest) =>
      unwrapActionResult(await createWishAction(payload)),
    onSuccess: () => invalidateWishes(queryClient),
  });
}

export function useUpdateWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishId, payload }: { wishId: string; payload: UpdateWishRequest }) =>
      unwrapActionResult(await updateWishAction({ id: wishId, data: payload })),
    onSuccess: () => invalidateWishes(queryClient),
  });
}

export function useDeleteWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wishId: string) => {
      unwrapActionResult(await removeWishAction({ id: wishId }));
    },
    onSuccess: () => invalidateWishes(queryClient),
  });
}

export function useSetWishDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishId, done }: { wishId: string; done: boolean }) =>
      unwrapActionResult(await setWishDoneAction({ id: wishId, done })),
    onSuccess: () => invalidateWishes(queryClient),
  });
}

/** Planejar cria um evento: a Agenda também precisa recarregar. */
export function usePlanWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishId, payload }: { wishId: string; payload: PlanWishRequest }) =>
      unwrapActionResult(await planWishAction({ id: wishId, data: payload })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
      return invalidateWishes(queryClient);
    },
  });
}
