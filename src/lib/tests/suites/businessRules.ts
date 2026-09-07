import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assertEqual } from "../types";

export const businessRulesSuite: TestSuite = {
  id: "rules",
  name: "Business Rules",
  tests: [
    {
      id: "duration-cap",
      name: "No voice_responses with duration > 35s (30s cap + buffer)",
      run: async () => {
        const { count, error } = await supabase
          .from("voice_responses")
          .select("id", { count: "exact", head: true })
          .gt("duration_seconds", 35);
        if (error) throw error;
        assertEqual(count ?? 0, 0, "Found over-length recordings");
      },
    },
    {
      id: "edit-cap",
      name: "No transcriptions with edit_count > 3",
      run: async () => {
        const { count, error } = await supabase
          .from("transcriptions")
          .select("id", { count: "exact", head: true })
          .gt("edit_count", 3);
        if (error) throw error;
        assertEqual(count ?? 0, 0, "Found transcriptions with edit_count > 3");
      },
    },
    {
      id: "question-retirement",
      name: "Question retirement counts available",
      run: async () => {
        const { data, error } = await supabase.rpc("get_question_counts" as any);
        if (error) throw error;
        const arr = (data ?? []) as Array<{ question_id: string; unique_user_count: number }>;
        const retired = arr.filter(r => Number(r.unique_user_count) >= 3);
        return { details: { totalQuestionsWithResponses: arr.length, retiredOrFull: retired.length } };
      },
    },
  ],
};