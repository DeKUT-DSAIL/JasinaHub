import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  HardDriveDownload,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Link,
  AlertTriangle,
} from "lucide-react";

interface MissingRecord {
  id: string;
  first_name: string;
  last_name: string;
  order_index: number;
  expected_filename: string;
}

interface MatchResult {
  responseId: string;
  filename: string;
  driveFileId: string;
  status: "matched" | "not_found";
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;

export function AdminDriveBackfill() {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "authenticating" | "scanning" | "matching" | "updating" | "done">("idle");
  const [missingRecords, setMissingRecords] = useState<MissingRecord[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, matched: 0, notFound: 0, updated: 0 });

  const loadGIS = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
      document.head.appendChild(script);
    });
  };

  const getGoogleToken = async (): Promise<string> => {
    await loadGIS();

    return new Promise((resolve, reject) => {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.readonly",
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.access_token);
          }
        },
      });

      client.requestAccessToken({ prompt: "" });
    });
  };

  const listAllDriveFiles = async (token: string): Promise<Map<string, string>> => {
    const fileMap = new Map<string, string>(); // filename -> fileId
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name)",
        pageSize: "1000",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Drive API error: ${res.status}`);

      const data = await res.json();
      for (const file of data.files || []) {
        fileMap.set(file.name.toLowerCase(), file.id);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return fileMap;
  };

  const runBackfill = async () => {
    try {
      // Step 1: Get missing records from DB
      setPhase("scanning");
      setProgress(10);

      const { data: missing, error } = await supabase
        .from("voice_responses")
        .select("id, question_id, user_id")
        .is("audio_file_url", null);

      if (error) throw error;
      if (!missing || missing.length === 0) {
        toast({ title: "No missing URLs", description: "All recordings already have URLs." });
        setPhase("idle");
        return;
      }

      // Get profiles and questions for these records
      const userIds = [...new Set(missing.map((r) => r.user_id))];
      const questionIds = [...new Set(missing.map((r) => r.question_id))];

      const [profilesRes, questionsRes] = await Promise.all([
        supabase.from("profiles").select("id, first_name, last_name").in("id", userIds),
        supabase.from("questions").select("id, order_index").in("id", questionIds),
      ]);

      const profileMap = new Map(profilesRes.data?.map((p) => [p.id, p]) || []);
      const questionMap = new Map(questionsRes.data?.map((q) => [q.id, q]) || []);

      const records: MissingRecord[] = missing.map((r) => {
        const profile = profileMap.get(r.user_id);
        const question = questionMap.get(r.question_id);
        const firstName = profile?.first_name || "Unknown";
        const lastName = profile?.last_name || "Unknown";
        const qNum = (question?.order_index ?? 0) + 1;
        return {
          id: r.id,
          first_name: firstName,
          last_name: lastName,
          order_index: qNum,
          expected_filename: `${firstName}_${lastName}_${qNum}.webm`,
        };
      });

      setMissingRecords(records);
      setStats((s) => ({ ...s, total: records.length }));
      setProgress(20);

      // Step 2: Auth with Google
      setPhase("authenticating");
      const token = await getGoogleToken();
      setProgress(30);

      // Step 3: List all Drive files
      setPhase("matching");
      const driveFiles = await listAllDriveFiles(token);
      setProgress(50);

      toast({
        title: "Drive scanned",
        description: `Found ${driveFiles.size} files in the Drive folder.`,
      });

      // Step 4: Match records to Drive files
      const results: MatchResult[] = [];
      let matched = 0;
      let notFound = 0;

      for (const record of records) {
        const filename = record.expected_filename.toLowerCase();
        const driveId = driveFiles.get(filename);

        if (driveId) {
          results.push({ responseId: record.id, filename: record.expected_filename, driveFileId: driveId, status: "matched" });
          matched++;
        } else {
          results.push({ responseId: record.id, filename: record.expected_filename, driveFileId: "", status: "not_found" });
          notFound++;
        }
      }

      setMatchResults(results);
      setStats((s) => ({ ...s, matched, notFound }));
      setProgress(70);

      // Step 5: Update matched records in DB
      setPhase("updating");
      const matchedResults = results.filter((r) => r.status === "matched");
      let updated = 0;

      for (let i = 0; i < matchedResults.length; i++) {
        const r = matchedResults[i];
        const driveUrl = `https://drive.google.com/file/d/${r.driveFileId}/view`;

        const { error: updateError } = await supabase
          .from("voice_responses")
          .update({ audio_file_url: driveUrl })
          .eq("id", r.responseId);

        if (!updateError) updated++;

        setProgress(70 + Math.round((i / matchedResults.length) * 30));
      }

      setStats((s) => ({ ...s, updated }));
      setPhase("done");
      setProgress(100);

      toast({
        title: "Backfill complete",
        description: `Updated ${updated} of ${matched} matched records. ${notFound} files not found in Drive.`,
      });
    } catch (err) {
      console.error("Backfill error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Backfill failed",
        variant: "destructive",
      });
      setPhase("idle");
    }
  };

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setMissingRecords([]);
    setMatchResults([]);
    setStats({ total: 0, matched: 0, notFound: 0, updated: 0 });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link className="w-4 h-4 text-primary" />
          Backfill Missing Audio URLs
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Scans Google Drive for files matching records with missing audio URLs and links them.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {phase === "idle" && (
          <Button onClick={runBackfill} className="gap-2">
            <Search className="w-4 h-4" />
            Scan & Match Drive Files
          </Button>
        )}

        {phase !== "idle" && phase !== "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {phase === "scanning" && "Fetching records with missing URLs..."}
              {phase === "authenticating" && "Authenticating with Google Drive..."}
              {phase === "matching" && "Matching files to records..."}
              {phase === "updating" && `Updating database... (${stats.updated}/${stats.matched})`}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-foreground">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Missing</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">{stats.matched}</p>
                <p className="text-[10px] text-emerald-600/70 uppercase font-medium">Matched</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-blue-600">{stats.updated}</p>
                <p className="text-[10px] text-blue-600/70 uppercase font-medium">Updated</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-amber-600">{stats.notFound}</p>
                <p className="text-[10px] text-amber-600/70 uppercase font-medium">Not Found</p>
              </div>
            </div>

            {stats.notFound > 0 && (
              <div className="max-h-40 overflow-y-auto border border-border/50 rounded-lg">
                <div className="p-2 text-xs space-y-1">
                  <p className="font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-3 h-3" /> Files not found in Drive:
                  </p>
                  {matchResults
                    .filter((r) => r.status === "not_found")
                    .slice(0, 50)
                    .map((r) => (
                      <p key={r.responseId} className="text-muted-foreground truncate">
                        {r.filename}
                      </p>
                    ))}
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={reset}>
              Run Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
