import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert } from "../types";

/**
 * Smoke Tests — fast "is the app even up?" subset.
 * These should always run in under a few seconds and catch catastrophic failures
 * (DB unreachable, auth broken, app shell missing).
 */
export const smokeSuite: TestSuite = {
  id: "smoke",
  name: "Smoke · Quick Health Check",
  description: "Sub-second sanity checks: app shell, database, auth, and storage all respond.",
  tests: [
    {
      id: "app-shell-mounted",
      name: "App shell rendered (root #root has children)",
      run: async () => {
        const root = document.getElementById("root");
        assert(!!root && root.children.length > 0, "React root is empty");
      },
    },
    {
      id: "supabase-reachable",
      name: "Backend responds to a HEAD request",
      run: async () => {
        const start = performance.now();
        const { error } = await supabase.from("questions").select("id", { count: "exact", head: true });
        const ms = Math.round(performance.now() - start);
        if (error) throw error;
        return { details: { ms } };
      },
    },
    {
      id: "auth-getuser",
      name: "supabase.auth.getUser() returns a user",
      run: async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        assert(!!data.user, "No authenticated user in session");
      },
    },
    {
      id: "storage-reachable",
      name: "Storage API responds (lists voice-recordings root)",
      run: async () => {
        const { error } = await supabase.storage.from("voice-recordings").list("", { limit: 1 });
        if (error) throw error;
      },
    },
  ],
};