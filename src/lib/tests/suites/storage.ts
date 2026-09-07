import { supabase } from "@/integrations/supabase/client";
import { TestSuite, assert } from "../types";

export const storageSuite: TestSuite = {
  id: "storage",
  name: "Storage",
  tests: [
    {
      id: "voice-recordings-bucket",
      name: "voice-recordings bucket is listable",
      run: async () => {
        const { data, error } = await supabase.storage.from("voice-recordings").list("", { limit: 1 });
        if (error) throw error;
        return { details: { objects: data?.length ?? 0 } };
      },
    },
    {
      id: "images-bucket",
      name: "images bucket is listable",
      run: async () => {
        const { data, error } = await supabase.storage.from("images").list("", { limit: 1 });
        if (error) throw error;
        return { details: { objects: data?.length ?? 0 } };
      },
    },
    {
      id: "sample-recording-reachable",
      name: "Sample accepted recording URL returns 200",
      run: async () => {
        const { data, error } = await supabase
          .from("voice_responses")
          .select("audio_file_url")
          .eq("status", "accepted")
          .ilike("audio_file_url", "%supabase.co/storage%")
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data?.audio_file_url) {
          return { details: { skipped: "no accepted Supabase-hosted recording found" } };
        }
        const res = await fetch(data.audio_file_url, { method: "HEAD" });
        assert(res.ok, `HEAD ${res.status}`);
        return { details: { status: res.status, url: data.audio_file_url } };
      },
    },
  ],
};