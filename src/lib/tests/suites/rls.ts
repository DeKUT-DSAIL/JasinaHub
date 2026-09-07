import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined as any },
  });
}

export const rlsSuite: TestSuite = {
  id: "rls",
  name: "Security · Row-Level Security (RLS)",
  description: "Confirms anonymous and signed-in users only see what their policies allow.",
  tests: [
    {
      id: "admin-reads-profiles",
      name: "Admin can read profiles",
      run: async () => {
        const { data, error } = await supabase.from("profiles").select("id").limit(5);
        if (error) throw error;
        assert((data?.length ?? 0) > 0, "Admin returned 0 profiles");
      },
    },
    {
      id: "admin-reads-voice-responses",
      name: "Admin can read voice_responses",
      run: async () => {
        const { error, count } = await supabase
          .from("voice_responses")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return { details: { count } };
      },
    },
    {
      id: "anon-blocked-voice-responses",
      name: "Anonymous client cannot read voice_responses",
      run: async () => {
        const anon = anonClient();
        const { data, error } = await anon.from("voice_responses").select("id").limit(5);
        // Either an error or empty result is acceptable; rows leaking is a fail
        if (data && data.length > 0) {
          throw new Error(`RLS leak: anon got ${data.length} rows`);
        }
        return { details: { error: error?.message, rows: data?.length ?? 0 } };
      },
    },
    {
      id: "anon-blocked-transcriptions",
      name: "Anonymous client cannot read transcriptions",
      run: async () => {
        const anon = anonClient();
        const { data, error } = await anon.from("transcriptions").select("id").limit(5);
        if (data && data.length > 0) throw new Error(`RLS leak: anon got ${data.length} rows`);
        return { details: { error: error?.message } };
      },
    },
    {
      id: "anon-blocked-questions",
      name: "Anonymous client cannot read questions (verified-only gate)",
      run: async () => {
        const anon = anonClient();
        const { data, error } = await anon.from("questions").select("id").limit(5);
        if (data && data.length > 0) throw new Error(`RLS leak: anon got ${data.length} questions`);
        return { details: { error: error?.message } };
      },
    },
    {
      id: "anon-blocked-user-roles",
      name: "Anonymous client cannot read user_roles",
      run: async () => {
        const anon = anonClient();
        const { data, error } = await anon.from("user_roles").select("user_id").limit(5);
        if (data && data.length > 0) throw new Error(`RLS leak: anon got ${data.length} role rows`);
        return { details: { error: error?.message } };
      },
    },
  ],
};