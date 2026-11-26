// Thin backwards-compatible wrapper over the unified AuthProvider context.
// Prefer importing `useAuth` from `@/hooks/useAuth` directly
// in new code.
import { useAuth } from '@/hooks/useAuth';

export const useUserRole = () => {
  const { isAdmin, loading } = useAuth();
  return { isAdmin, loading };
};
