import { useQuery } from '@tanstack/react-query';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import { getProfileAction } from '../actions';

export const PROFILE_QUERY_KEY = ['profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => unwrapActionResult(await getProfileAction(undefined)),
    retry: false,
  });
}
