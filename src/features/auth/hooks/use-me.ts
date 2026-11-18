import { useQuery } from '@tanstack/react-query';
import { getCurrentUserAction } from '../actions';

export const ME_QUERY_KEY = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      const result = await getCurrentUserAction();
      if (!result.ok) throw new Error(result.message);
      return result.data;
    },
  });
}
