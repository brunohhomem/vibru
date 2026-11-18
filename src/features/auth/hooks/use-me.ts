import { useQuery } from '@tanstack/react-query';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import { getCurrentUserAction } from '../actions';

export const ME_QUERY_KEY = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => unwrapActionResult(await getCurrentUserAction()),
    retry: false,
  });
}
