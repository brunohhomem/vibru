import { useQuery } from '@tanstack/react-query';
import { unwrapActionResult } from '@/lib/unwrap-action-result';
import { getCoupleAction } from '../actions';

export const COUPLE_QUERY_KEY = ['couple'] as const;

export function useCouple() {
  return useQuery({
    queryKey: COUPLE_QUERY_KEY,
    queryFn: async () => unwrapActionResult(await getCoupleAction(undefined)),
    // Sem vínculo ao casal ou sem sessão, tentar de novo não adianta.
    retry: false,
  });
}
