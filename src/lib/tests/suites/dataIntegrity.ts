import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assertEqual } from "../types";

export const dataIntegritySuite: TestSuite = {
  id: "integrity",
  name: "Data Integrity",
  tests: [
    {
      id: "accepted-without-audio",
      name: "No accepted voice_responses missing audio_file_url",
      run: async () => {
        const { count, error } = await supabase
          .from("voice_responses")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .is("audio_file_url", null);
        if (error) throw error;
        assertEqual(count ?? 0, 0, "Found accepted responses with no audio URL");
      },
    },
    {
      id: "stale-locks",
      name: "No transcription_locks older than 1 hour",
      run: async () => {
        const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
        const { count, error } = await supabase
          .from("transcription_locks")
          .select("id", { count: "exact", head: true })
          .lt("locked_at", oneHourAgo);
        if (error) throw error;
        assertEqual(count ?? 0, 0, "Found stale locks > 1h old");
      },
    },
    {
      id: "orphan-questions-categories",
      name: "Every question references an existing category",
      run: async () => {
        const { data: questions, error: qErr } = await supabase.from("questions").select("category_id");
        if (qErr) throw qErr;
        const { data: cats, error: cErr } = await supabase.from("categories").select("id");
        if (cErr) throw cErr;
        const catIds = new Set((cats ?? []).map(c => c.id));
        const orphans = (questions ?? []).filter(q => !catIds.has(q.category_id));
        assertEqual(orphans.length, 0, `Found ${orphans.length} orphan questions`);
      },
    },
    {
      id: "orphan-transcriptions",
      name: "Every transcription references an existing voice_response",
      run: async () => {
        const { data: trs, error } = await supabase
          .from("transcriptions")
          .select("voice_response_id")
          .limit(500);
        if (error) throw error;
        const ids = [...new Set((trs ?? []).map(t => t.voice_response_id))];
        if (ids.length === 0) return { details: { transcriptions: 0 } };
        // Chunk the .in() filter to avoid URL-length 'Bad Request' errors
        const present = new Set<string>();
        const CHUNK = 100;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const slice = ids.slice(i, i + CHUNK);
          const { data: vrs, error: vErr } = await supabase
            .from("voice_responses")
            .select("id")
            .in("id", slice);
          if (vErr) throw vErr;
          (vrs ?? []).forEach(v => present.add(v.id));
        }
        const orphans = ids.filter(i => !present.has(i));
        assertEqual(orphans.length, 0, `Found ${orphans.length} orphan transcriptions`);
      },
    },
  ],
};