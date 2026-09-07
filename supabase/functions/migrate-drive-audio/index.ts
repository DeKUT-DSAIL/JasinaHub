import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch all voice_responses with Google Drive URLs
  const { data: responses, error: fetchError } = await supabase
    .from("voice_responses")
    .select("id, audio_file_url")
    .not("audio_file_url", "is", null)
    .like("audio_file_url", "%drive.google.com%")
    .eq("status", "accepted");

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!responses || responses.length === 0) {
    return new Response(
      JSON.stringify({ event: "complete", migrated: 0, failed: 0, total: 0, message: "No Google Drive URLs found to migrate" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Stream progress via SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const total = responses.length;
      let migrated = 0;
      let failed = 0;
      const errors: string[] = [];

      send({ event: "start", total });

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        try {
          const fileId = extractDriveFileId(response.audio_file_url);
          if (!fileId) {
            errors.push(`Could not extract file ID`);
            failed++;
            send({ event: "progress", current: i + 1, total, migrated, failed, status: "skipped", id: response.id });
            continue;
          }

          send({ event: "progress", current: i + 1, total, migrated, failed, status: "downloading", id: response.id });

          // Try downloading from Google Drive
          let audioData: ArrayBuffer | null = null;
          let contentType = "audio/webm";

          for (const url of [
            `https://drive.google.com/uc?export=download&id=${fileId}`,
            `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`,
          ]) {
            const res = await fetch(url, { redirect: "follow" });
            if (res.ok) {
              const ct = res.headers.get("content-type") || "";
              // Check it's actually audio, not an HTML page
              if (!ct.includes("text/html")) {
                audioData = await res.arrayBuffer();
                contentType = ct || "audio/webm";
                break;
              }
            }
          }

          if (!audioData) {
            errors.push(`${response.id}: Download failed`);
            failed++;
            send({ event: "progress", current: i + 1, total, migrated, failed, status: "failed", id: response.id });
            continue;
          }

          send({ event: "progress", current: i + 1, total, migrated, failed, status: "uploading", id: response.id });

          const ext = contentType.includes("mp3") ? "mp3" : contentType.includes("wav") ? "wav" : contentType.includes("ogg") ? "ogg" : "webm";
          const storagePath = `transcriptions/${response.id}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("voice-recordings")
            .upload(storagePath, audioData, { contentType, upsert: true });

          if (uploadError) {
            errors.push(`${response.id}: Upload failed - ${uploadError.message}`);
            failed++;
            send({ event: "progress", current: i + 1, total, migrated, failed, status: "failed", id: response.id });
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("voice-recordings")
            .getPublicUrl(storagePath);

          const { error: updateError } = await supabase
            .from("voice_responses")
            .update({ audio_file_url: urlData.publicUrl })
            .eq("id", response.id);

          if (updateError) {
            errors.push(`${response.id}: DB update failed - ${updateError.message}`);
            failed++;
            send({ event: "progress", current: i + 1, total, migrated, failed, status: "failed", id: response.id });
            continue;
          }

          migrated++;
          send({ event: "progress", current: i + 1, total, migrated, failed, status: "done", id: response.id });
        } catch (err) {
          errors.push(`${response.id}: ${(err as Error).message}`);
          failed++;
          send({ event: "progress", current: i + 1, total, migrated, failed, status: "error", id: response.id });
        }
      }

      send({ event: "complete", total, migrated, failed, errors: errors.length > 0 ? errors : undefined });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
