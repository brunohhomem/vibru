import { useRouter } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import { logoutAction } from '../actions';

export function useLogout() {
  const router = useRouter();

  return async function logout(): Promise<void> {
    await logoutAction();
    queryClient.clear();
    router.push('/login');
  };
}
