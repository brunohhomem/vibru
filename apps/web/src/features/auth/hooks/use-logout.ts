import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/api-error';
import { queryClient } from '@/lib/query-client';

export function useLogout() {
  const router = useRouter();

  return async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
      queryClient.clear();
      router.push('/login');
    } catch (error) {
      applyApiError(error);
    }
  };
}
