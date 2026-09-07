// Thin backwards-compatible wrapper over the unified AuthProvider context.
// Prefer importing `useAuth` from `@/components/Auth/AuthProvider` directly
// in new code.
import { useAuth } from "@/components/Auth/AuthProvider";

export const useUserRole = () => {
  const { isAdmin, loading } = useAuth();
  return { isAdmin, loading };
};
