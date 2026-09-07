import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert, assertEqual } from "../types";

export const authSuite: TestSuite = {
  id: "auth",
  name: "Security · Authentication & Authorization",
  description: "Verifies session validity, role checks, and identity controls.",
  tests: [
    {
      id: "session-valid",
      name: "Admin session is valid",
      run: async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        assert(!!data.session?.user?.id, "No active session");
        return { details: { userId: data.session!.user.id, email: data.session!.user.email } };
      },
    },
    {
      id: "has-role-admin",
      name: "has_role(uid, 'admin') returns true",
      run: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        assert(!!user, "No user");
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .eq("role", "admin")
          .maybeSingle();
        if (error) throw error;
        assert(!!data, "Current user is not an admin");
        return { details: data };
      },
    },
    {
      id: "user-roles-self-only",
      name: "user_roles: only own rows visible",
      run: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase.from("user_roles").select("user_id");
        if (error) throw error;
        const others = (data ?? []).filter(r => r.user_id !== user!.id);
        assertEqual(others.length, 0, "Other users' roles are visible — RLS leak");
        return { details: { rowsReturned: data?.length ?? 0 } };
      },
    },
  ],
};