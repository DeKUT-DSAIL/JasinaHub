import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  /** True once the initial session + role lookup have resolved. */
  initialized: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  loading: true,
  initialized: false,
});

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Track which user we last resolved admin status for, so token refreshes
    // (which fire onAuthStateChange) don't trigger redundant role lookups.
    let resolvedAdminFor: string | null = null;

    const resolve = async (nextUser: User | null) => {
      if (cancelled) return;
      setUser(nextUser);
      if (!nextUser) {
        resolvedAdminFor = null;
        setIsAdmin(false);
      } else if (resolvedAdminFor !== nextUser.id) {
        const admin = await fetchIsAdmin(nextUser.id);
        if (cancelled) return;
        resolvedAdminFor = nextUser.id;
        setIsAdmin(admin);
      }
      setLoading(false);
      setInitialized(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolve(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        resolve(session?.user ?? null);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}