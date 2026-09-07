import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert } from "../types";

/**
 * End-to-End (E2E) Workflow Tests — verifies that complete, production-data
 * pipelines hold together (volunteer → recording → transcriber → dataset).
 * These don't write data; they check that the full chain has produced valid
 * artifacts at each stage in the live database.
 */
export const endToEndSuite: TestSuite = {
  id: "e2e",
  name: "End-to-End · User Workflows",
  description: "Validates complete user journeys are producing healthy data end-to-end.",
  tests: [
    {
      id: "volunteer-pipeline",
      name: "Volunteer pipeline: profile → response → accepted recording",
      run: async () => {
        const { count: profiles } = await supabase
          .from("profiles").select("id", { count: "exact", head: true });
        const { count: responses } = await supabase
          .from("voice_responses").select("id", { count: "exact", head: true });
        const { count: accepted } = await supabase
          .from("voice_responses").select("id", { count: "exact", head: true })
          .eq("status", "accepted");
        assert((profiles ?? 0) > 0, "No profiles in system");
        assert((responses ?? 0) > 0, "No voice_responses in system");
        assert((accepted ?? 0) > 0, "No accepted recordings — pipeline broken");
        return { details: { profiles, responses, accepted } };
      },
    },
    {
      id: "transcriber-pipeline",
      name: "Transcriber pipeline: accepted audio → transcription → verified",
      run: async () => {
        const { count: transcriptions } = await supabase
          .from("transcriptions").select("id", { count: "exact", head: true });
        const { count: verified } = await supabase
          .from("transcriptions").select("id", { count: "exact", head: true })
          .eq("status", "accepted");
        assert((transcriptions ?? 0) > 0, "No transcriptions exist");
        return { details: { transcriptions, verified } };
      },
    },
    {
      id: "dataset-export-ready",
      name: "Dataset export readiness: ≥1 fully-verified pair (audio + text)",
      run: async () => {
        const { count, error } = await supabase
          .from("transcriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted");
        if (error) throw error;
        assert((count ?? 0) >= 1, "No verified audio↔text pairs available for dataset export");
        return { details: { verifiedPairs: count } };
      },
    },
    {
      id: "question-lifecycle",
      name: "Question lifecycle: at least one question retired (≥3 unique responders)",
      run: async () => {
        const { data, error } = await supabase.rpc("get_question_counts" as any);
        if (error) throw error;
        const arr = (data ?? []) as Array<{ unique_user_count: number }>;
        const retired = arr.filter(r => Number(r.unique_user_count) >= 3).length;
        assert(retired > 0, "No questions have reached retirement — workflow may be stalled");
        return { details: { retired, totalActive: arr.length } };
      },
    },
  ],
};