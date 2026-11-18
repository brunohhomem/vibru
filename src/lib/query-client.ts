import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { describeActionFailure } from './unwrap-action-result';

export function createQueryClient(onUnauthenticated: () => void): QueryClient {
  function reportIfUnauthenticated(error: unknown): void {
    if (describeActionFailure(error) === 'redirect-to-login') onUnauthenticated();
  }

  return new QueryClient({
    queryCache: new QueryCache({ onError: reportIfUnauthenticated }),
    mutationCache: new MutationCache({ onError: reportIfUnauthenticated }),
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Sessão expirada no meio do uso: limpa o cache (para o próximo usuário do aparelho não ver
// dados do anterior) e recarrega no /login.
function redirectToLoginClearingCache(): void {
  queryClient.clear();
  if (typeof window === 'undefined' || window.location.pathname === '/login') return;
  window.location.assign('/login');
}

export const queryClient = createQueryClient(redirectToLoginClearingCache);
