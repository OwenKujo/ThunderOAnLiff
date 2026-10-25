import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, retry: (count, error) => count < 2 && !(error instanceof Error && 'status' in error && (error as { status: number }).status < 500) },
    mutations: { retry: 0 },
  },
});
