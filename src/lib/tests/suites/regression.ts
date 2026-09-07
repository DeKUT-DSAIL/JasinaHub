import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert, assertEqual } from "../types";

/**
 * Regression Tests — locks in fixes for previously-discovered bugs so they
 * cannot silently come back. Each test corresponds to a specific past defect.
 */
export const regressionSuite: TestSuite = {
  id: "regression",
  name: "Regression · Bug Re-emergence Guards",
  description: "Pinned tests that fail if a previously-fixed bug returns.",
  tests: [
    {
      id: "no-duplicate-responses-per-user",
      name: "REG-001 · Unique (user_id, question_id) constraint enforced",
      run: async () => {
        // Bug: users used to be able to submit multiple recordings for the same question.
        // Verify no user has duplicate question_id rows.
        const { data, error } = await supabase
          .from("voice_responses")
          .select("user_id, question_id")
          .limit(2000);
        if (error) throw error;
        const seen = new Set<string>();
        let dupes = 0;
        for (const r of data ?? []) {
          const k = `${r.user_id}::${r.question_id}`;
          if (seen.has(k)) dupes++;
          seen.add(k);
        }
        assertEqual(dupes, 0, `Found ${dupes} duplicate (user, question) pairs — constraint regressed`);
      },
    },
    {
      id: "no-overlong-recordings",
      name: "REG-002 · 30s recording cap enforced (no rows > 35s)",
      run: async () => {
        const { count, error } = await supabase
          .from("voice_responses")
          .select("id", { count: "exact", head: true })
          .gt("duration_seconds", 35);
        if (error) throw error;
        assertEqual(count ?? 0, 0, "Recording-cap regression: rows > 35s present");
      },
    },
    {
      id: "no-edit-overflow",
      name: "REG-003 · Transcription edit cap (max 3) enforced",
      run: async () => {
        const { count, error } = await supabase
          .from("transcriptions")
          .select("id", { count: "exact", head: true })
          .gt("edit_count", 3);
        if (error) throw error;
        assertEqual(count ?? 0, 0, "Edit-cap regression: rows with edit_count > 3 present");
      },
    },
    {
      id: "transcriber-cannot-self-transcribe",
      name: "REG-004 · Transcribers never assigned their own recordings",
      run: async () => {
        // Bug: claim_random_transcription used to return the user's own recordings.
        const { data: { user } } = await supabase.auth.getUser();
        assert(!!user, "No user");
        const { data, error } = await supabase
          .from("transcriptions")
          .select("user_id, voice_response_id, voice_responses(user_id)")
          .limit(500);
        if (error) throw error;
        const selfAssigned = (data ?? []).filter(
          (t: any) => t.user_id === t.voice_responses?.user_id
        ).length;
        assertEqual(selfAssigned, 0, `Found ${selfAssigned} self-transcribed rows`);
      },
    },
    {
      id: "no-stale-locks",
      name: "REG-005 · Transcription locks expire (none > 1h old)",
      run: async () => {
        const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
        const { count, error } = await supabase
          .from("transcription_locks")
          .select("id", { count: "exact", head: true })
          .lt("locked_at", oneHourAgo);
        if (error) throw error;
        assertEqual(count ?? 0, 0, "Stale-lock regression: locks older than 1h exist");
      },
    },
  ],
};