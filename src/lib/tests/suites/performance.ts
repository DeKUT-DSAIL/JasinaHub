import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert } from "../types";

async function timed<T>(fn: () => PromiseLike<T>): Promise<{ ms: number; result: T }> {
  const start = performance.now();
  const result = await Promise.resolve(fn());
  return { ms: Math.round(performance.now() - start), result };
}

export const performanceSuite: TestSuite = {
  id: "performance",
  name: "Performance & Latency",
  description: "Measures real user-facing query latency against the production backend.",
  tests: [
    {
      id: "rpc-question-counts",
      name: "get_question_counts RPC < 1500ms",
      run: async () => {
        const { ms, result } = await timed(() => supabase.rpc("get_question_counts") as any) as any;
        if (result.error) throw result.error;
        assert(ms < 1500, `Took ${ms}ms (budget 1500ms)`);
        return { details: { ms, rows: result.data?.length ?? 0 } };
      },
    },
    {
      id: "questions-list-fetch",
      name: "Fetch first 10 questions < 1000ms",
      run: async () => {
        const { ms, result } = await timed(async () =>
          await supabase.from("questions").select("id, question_text").limit(10)
        );
        if (result.error) throw result.error;
        assert(ms < 1000, `Took ${ms}ms (budget 1000ms)`);
        return { details: { ms, rows: result.data?.length ?? 0 } };
      },
    },
    {
      id: "profile-read",
      name: "Current-user profile read < 500ms",
      run: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        assert(!!user, "No authenticated user");
        const { ms, result } = await timed(async () =>
          await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()
        );
        if (result.error) throw result.error;
        assert(ms < 500, `Took ${ms}ms (budget 500ms)`);
        return { details: { ms } };
      },
    },
    {
      id: "audio-signed-url",
      name: "Generate one signed audio URL < 800ms",
      run: async () => {
        // List files inside the 'transcriptions' folder (root only contains folders)
        const { data: list, error } = await supabase.storage
          .from("voice-recordings")
          .list("transcriptions", { limit: 1 });
        if (error) throw error;
        assert((list?.length ?? 0) > 0, "No audio files in bucket to sample");
        const path = `transcriptions/${list![0].name}`;
        const { ms, result } = await timed(async () =>
          await supabase.storage.from("voice-recordings").createSignedUrl(path, 60)
        );
        if (result.error) throw result.error;
        assert(ms < 800, `Took ${ms}ms (budget 800ms)`);
        return { details: { ms, path } };
      },
    },
    {
      id: "voice-responses-count",
      name: "voice_responses HEAD count < 1500ms",
      run: async () => {
        const { ms, result } = await timed(async () =>
          await supabase.from("voice_responses").select("id", { count: "exact", head: true })
        );
        if (result.error) throw result.error;
        assert(ms < 1500, `Took ${ms}ms (budget 1500ms)`);
        return { details: { ms, count: result.count } };
      },
    },
  ],
};