import { useQuery } from '@tanstack/react-query';
import type { CoupleResponse } from '@vibru/shared';
import { api } from '@/lib/api';

export const COUPLE_QUERY_KEY = ['couple'] as const;

export function useCouple() {
  return useQuery({
    queryKey: COUPLE_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get<CoupleResponse>('/couple');
      return response.data;
    },
  });
}
