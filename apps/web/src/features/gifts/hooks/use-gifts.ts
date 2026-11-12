import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  CreateGiftRequest,
  GiftResponse,
  GiftStatus,
  GiftsResponse,
  UpdateGiftRequest,
} from '@vibru/shared';
import { api } from '@/lib/api';

export const GIFTS_QUERY_KEY = ['gifts'] as const;

function giftsPath(ownerId: string): string {
  return `/members/${ownerId}/gifts`;
}

function invalidateGifts(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: GIFTS_QUERY_KEY });
}

export function useGifts(ownerId: string | undefined, status: GiftStatus) {
  return useQuery({
    queryKey: [...GIFTS_QUERY_KEY, ownerId, status],
    queryFn: async () => {
      const response = await api.get<GiftsResponse>(giftsPath(ownerId ?? ''), {
        params: { status },
      });
      return response.data;
    },
    enabled: Boolean(ownerId),
  });
}

export function useCreateGift(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGiftRequest) => {
      const response = await api.post<GiftResponse>(giftsPath(ownerId), payload);
      return response.data;
    },
    onSuccess: () => invalidateGifts(queryClient),
  });
}

export function useUpdateGift(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ giftId, payload }: { giftId: string; payload: UpdateGiftRequest }) => {
      const response = await api.patch<GiftResponse>(`${giftsPath(ownerId)}/${giftId}`, payload);
      return response.data;
    },
    onSuccess: () => invalidateGifts(queryClient),
  });
}

export function useDeleteGift(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (giftId: string) => {
      await api.delete(`${giftsPath(ownerId)}/${giftId}`);
    },
    onSuccess: () => invalidateGifts(queryClient),
  });
}

export function useMarkGiftReceived(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (giftId: string) => {
      const response = await api.post<GiftResponse>(`${giftsPath(ownerId)}/${giftId}/received`);
      return response.data;
    },
    onSuccess: () => invalidateGifts(queryClient),
  });
}

/** Reservar ou desfazer a reserva de um presente da lista da outra pessoa. */
export function useToggleGiftReservation(ownerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ giftId, reserve }: { giftId: string; reserve: boolean }) => {
      const path = `${giftsPath(ownerId)}/${giftId}/reservation`;
      const response = reserve
        ? await api.post<GiftResponse>(path)
        : await api.delete<GiftResponse>(path);
      return response.data;
    },
    onSuccess: () => invalidateGifts(queryClient),
  });
}
