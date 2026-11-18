import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import {
  createGiftAction,
  listGiftsAction,
  markGiftReceivedAction,
  releaseGiftAction,
  removeGiftAction,
  reserveGiftAction,
  updateGiftAction,
} from '../actions';
import type { GiftStatus } from '../gift-constants';
import type { CreateGiftRequest, UpdateGiftRequest } from '../gift-schemas';

export const GIFTS_QUERY_KEY = ['gifts'] as const;

function invalidateGifts(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: GIFTS_QUERY_KEY });
}

export function useGifts(ownerId: string | undefined, status: GiftStatus) {
  return useQuery({
    queryKey: [...GIFTS_QUERY_KEY, ownerId, status],
    queryFn: async () =>
      unwrapActionResult(await listGiftsAction({ ownerId: ownerId ?? '', status })),
    enabled: Boolean(ownerId),
  });
}

export function useCreateGift(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGiftRequest) =>
      unwrapActionResult(await createGiftAction({ ownerId, data: payload })),
    onSuccess: () => invalidateGifts(queryClient),
  });
}

export function useUpdateGift(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ giftId, payload }: { giftId: string; payload: UpdateGiftRequest }) =>
      unwrapActionResult(await updateGiftAction({ ownerId, giftId, data: payload })),
    onSuccess: () => invalidateGifts(queryClient),
  });
}

export function useDeleteGift(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (giftId: string) => {
      unwrapActionResult(await removeGiftAction({ ownerId, giftId }));
    },
    onSuccess: () => invalidateGifts(queryClient),
  });
}

export function useMarkGiftReceived(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (giftId: string) =>
      unwrapActionResult(await markGiftReceivedAction({ ownerId, giftId })),
    onSuccess: () => invalidateGifts(queryClient),
  });
}

/** Reservar ou desfazer a reserva de um presente da lista da outra pessoa. */
export function useToggleGiftReservation(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ giftId, reserve }: { giftId: string; reserve: boolean }) => {
      const action = reserve ? reserveGiftAction : releaseGiftAction;
      return unwrapActionResult(await action({ ownerId, giftId }));
    },
    onSuccess: () => invalidateGifts(queryClient),
  });
}
