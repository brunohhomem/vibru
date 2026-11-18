import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  AgendaEvent,
  CreateWishRequest,
  PlanWishRequest,
  UpdateWishRequest,
  Wish,
  WishStatus,
  WishesResponse,
} from '@vibru/shared';
import { AGENDA_QUERY_KEY } from '@/features/agenda/hooks/use-agenda';
import { api } from '@/lib/api';

export const WISHES_QUERY_KEY = ['wishes'] as const;

function invalidateWishes(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: WISHES_QUERY_KEY });
}

export function useWishes(filters: { status: WishStatus }) {
  return useQuery({
    queryKey: [...WISHES_QUERY_KEY, filters.status],
    queryFn: async () => {
      const response = await api.get<WishesResponse>('/wishes', {
        params: { status: filters.status },
      });
      return response.data;
    },
  });
}

export function useCreateWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWishRequest) => {
      const response = await api.post<Wish>('/wishes', payload);
      return response.data;
    },
    onSuccess: () => invalidateWishes(queryClient),
  });
}

export function useUpdateWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishId, payload }: { wishId: string; payload: UpdateWishRequest }) => {
      const response = await api.patch<Wish>(`/wishes/${wishId}`, payload);
      return response.data;
    },
    onSuccess: () => invalidateWishes(queryClient),
  });
}

export function useDeleteWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wishId: string) => {
      await api.delete(`/wishes/${wishId}`);
    },
    onSuccess: () => invalidateWishes(queryClient),
  });
}

export function useSetWishDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishId, done }: { wishId: string; done: boolean }) => {
      const response = done
        ? await api.post<Wish>(`/wishes/${wishId}/done`)
        : await api.delete<Wish>(`/wishes/${wishId}/done`);
      return response.data;
    },
    onSuccess: () => invalidateWishes(queryClient),
  });
}

/** Planejar cria um evento: a Agenda também precisa recarregar. */
export function usePlanWish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ wishId, payload }: { wishId: string; payload: PlanWishRequest }) => {
      const response = await api.post<AgendaEvent>(`/wishes/${wishId}/plan`, payload);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEY });
      return invalidateWishes(queryClient);
    },
  });
}
