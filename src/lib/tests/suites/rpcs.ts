import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert } from "../types";

export const rpcSuite: TestSuite = {
  id: "rpcs",
  name: "Integration · Database Functions (RPC)",
  description: "End-to-end calls to SECURITY DEFINER functions backing the app.",
  tests: [
    {
      id: "get_question_counts",
      name: "get_question_counts returns array",
      run: async () => {
        const { data, error } = await supabase.rpc("get_question_counts" as any);
        if (error) throw error;
        assert(Array.isArray(data), "Expected array");
        return { details: { rows: (data as any[]).length } };
      },
    },
    {
      id: "get_question_unique_user_counts",
      name: "get_question_unique_user_counts returns array",
      run: async () => {
        const { data, error } = await supabase.rpc("get_question_unique_user_counts" as any);
        if (error) throw error;
        assert(Array.isArray(data), "Expected array");
        return { details: { rows: (data as any[]).length } };
      },
    },
    {
      id: "get_admin_chart_data",
      name: "get_admin_chart_data returns expected keys",
      run: async () => {
        const { data, error } = await supabase.rpc("get_admin_chart_data" as any);
        if (error) throw error;
        assert(data && typeof data === "object", "Expected object");
        const required = ["responses_over_time", "transcriptions_over_time", "sparklines"];
        for (const k of required) {
          assert(k in (data as any), `Missing key: ${k}`);
        }
        return { details: { keys: Object.keys(data as any) } };
      },
    },
    {
      id: "claim-release-roundtrip",
      name: "claim_random_transcription + release round-trip",
      destructive: true,
      run: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        assert(!!user, "no user");
        try {
          const { data, error } = await supabase.rpc("claim_random_transcription" as any, { _user_id: user!.id });
          if (error) throw error;
          return { details: { claimed: Array.isArray(data) ? data.length : 0 } };
        } finally {
          await supabase.rpc("release_transcription_lock" as any, { _user_id: user!.id });
        }
      },
    },
  ],
};