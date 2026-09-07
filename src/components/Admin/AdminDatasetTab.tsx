import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    Loader2,
    Play,
    Pause,
    Download,
    Database,
    Volume2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DatasetRow {
    id: string;
    voice_response_id: string;
    transcription_text: string;
    created_at: string;
    question_text: string;
    audio_file_url: string | null;
    duration_seconds: number | null;
    recorder_name: string;
    transcriber_name: string;
    recorder_pseudonym: string;
    transcriber_pseudonym: string;
}

export function AdminDatasetTab() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<DatasetRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [pseudonymize, setPseudonymize] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        loadDataset();
        return () => { audioRef.current?.pause(); };
    }, []);

    const loadDataset = async () => {
        try {
            setLoading(true);
            // Paginate accepted transcriptions to avoid the 1000-row PostgREST cap.
            const tData: Array<{
                id: string;
                voice_response_id: string;
                user_id: string;
                transcription_text: string;
                created_at: string;
            }> = [];
            const pageSize = 1000;
            for (let from = 0; ; from += pageSize) {
                const { data, error } = await supabase
                    .from("transcriptions")
                    .select("id, voice_response_id, user_id, transcription_text, created_at")
                    .eq("status", "accepted")
                    .order("created_at", { ascending: false })
                    .range(from, from + pageSize - 1);
                if (error) throw error;
                if (!data?.length) break;
                tData.push(...data);
                if (data.length < pageSize) break;
            }

            if (!tData.length) { setRows([]); return; }

            // Chunk .in() lookups so the request URL doesn't blow past gateway limits.
            const fetchIn = async <T,>(
                table: "profiles" | "voice_responses" | "questions",
                columns: string,
                ids: string[],
                chunkSize = 200,
            ): Promise<T[]> => {
                const unique = [...new Set(ids)].filter(Boolean);
                if (!unique.length) return [];
                const chunks: string[][] = [];
                for (let i = 0; i < unique.length; i += chunkSize) {
                    chunks.push(unique.slice(i, i + chunkSize));
                }
                const results = await Promise.all(
                    chunks.map((chunk) =>
                        supabase.from(table).select(columns).in("id", chunk),
                    ),
                );
                const out: T[] = [];
                for (const r of results) {
                    if (r.error) throw r.error;
                    if (r.data) out.push(...(r.data as unknown as T[]));
                }
                return out;
            };

            const transcriberIds = tData.map(t => t.user_id);
            const vrIds = tData.map(t => t.voice_response_id);

            const [tProfiles, vrRows] = await Promise.all([
                fetchIn<{ id: string; first_name: string; last_name: string; pseudonym: string }>(
                    "profiles", "id, first_name, last_name, pseudonym", transcriberIds,
                ),
                fetchIn<{
                    id: string;
                    user_id: string;
                    question_id: string;
                    audio_file_url: string | null;
                    duration_seconds: number | null;
                }>(
                    "voice_responses",
                    "id, user_id, question_id, audio_file_url, duration_seconds",
                    vrIds,
                ),
            ]);

            const [rProfiles, questions] = await Promise.all([
                fetchIn<{ id: string; first_name: string; last_name: string; pseudonym: string }>(
                    "profiles", "id, first_name, last_name, pseudonym", vrRows.map(v => v.user_id),
                ),
                fetchIn<{ id: string; question_text: string }>(
                    "questions", "id, question_text", vrRows.map(v => v.question_id),
                ),
            ]);

            const tMap = new Map(tProfiles.map(p => [p.id, `${p.first_name} ${p.last_name}`]));
            const tPseudoMap = new Map(tProfiles.map(p => [p.id, p.pseudonym]));
            const vrMap = new Map(vrRows.map(v => [v.id, v]));
            const rMap = new Map(rProfiles.map(p => [p.id, `${p.first_name} ${p.last_name}`]));
            const rPseudoMap = new Map(rProfiles.map(p => [p.id, p.pseudonym]));
            const qMap = new Map(questions.map(q => [q.id, q.question_text]));

            setRows(tData.map(t => {
                const vr = vrMap.get(t.voice_response_id);
                return {
                    id: t.id,
                    voice_response_id: t.voice_response_id,
                    transcription_text: t.transcription_text,
                    created_at: t.created_at,
                    question_text: vr ? qMap.get(vr.question_id) || "—" : "—",
                    audio_file_url: vr?.audio_file_url || null,
                    duration_seconds: vr?.duration_seconds || null,
                    recorder_name: vr ? rMap.get(vr.user_id) || "Unknown" : "Unknown",
                    transcriber_name: tMap.get(t.user_id) || "Unknown",
                    recorder_pseudonym: vr ? rPseudoMap.get(vr.user_id) || "ANON" : "ANON",
                    transcriber_pseudonym: tPseudoMap.get(t.user_id) || "ANON",
                };
            }));
        } catch (error) {
            console.error("Error loading dataset:", error);
            toast({ title: "Error", description: "Failed to load dataset", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const toggleAudio = (id: string, url: string) => {
        if (playingId === id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }
        audioRef.current?.pause();
        const audio = new Audio(url);
        audio.onended = () => setPlayingId(null);
        audioRef.current = audio;
        audio.play();
        setPlayingId(id);
    };

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, "0")}`;
    };

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        if (!q) return rows;
        return rows.filter(r =>
            r.transcription_text.toLowerCase().includes(q) ||
            r.question_text.toLowerCase().includes(q) ||
            r.recorder_name.toLowerCase().includes(q) ||
            r.transcriber_name.toLowerCase().includes(q) ||
            r.recorder_pseudonym.toLowerCase().includes(q) ||
            r.transcriber_pseudonym.toLowerCase().includes(q)
        );
    }, [rows, searchQuery]);

    const handleExportZip = async () => {
        // 1) Diagnose empty state up front
        if (rows.length === 0) {
            toast({
                title: "Dataset is empty",
                description: "Nothing loaded from the server. Try refreshing the page.",
                variant: "destructive",
            });
            return;
        }
        if (filtered.length === 0) {
            toast({
                title: "Search filter excludes every row",
                description: "Clear the search box and try again.",
                variant: "destructive",
            });
            return;
        }

        // 2) Only require a non-null URL. Don't pre-filter by host — let fetch decide.
        const toExport = filtered.filter(r => !!r.audio_file_url);
        const skipped = filtered.length - toExport.length;
        if (!toExport.length) {
            toast({
                title: "No audio URLs",
                description: "None of the visible rows have an audio file URL.",
                variant: "destructive",
            });
            return;
        }

        const startToast = toast({
            title: "Preparing export",
            description: `Downloading 0 / ${toExport.length}${skipped ? ` (${skipped} skipped: no URL)` : ""}...`,
        });

        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const folder = zip.folder("recordings");
        const csvRows = [
            [
                "Voice Response ID",
                "Question",
                "Transcription",
                pseudonymize ? "Recorder Pseudonym" : "Recorder",
                pseudonymize ? "Transcriber Pseudonym" : "Transcriber",
                "Audio Filename",
            ].join(","),
        ];

        let success = 0;
        let failed = 0;
        const failures: Array<{ id: string; reason: string }> = [];

        // 3) Concurrency-limited fetch pool
        const CONCURRENCY = 3;
        const MAX_RETRIES = 3;
        let cursor = 0;
        const fetchWithRetry = async (url: string): Promise<Response> => {
            let lastErr: unknown;
            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                try {
                    const resp = await fetch(url, { cache: "no-store" });
                    if (resp.ok) return resp;
                    // Retry on 5xx / 429
                    if (resp.status >= 500 || resp.status === 429) {
                        lastErr = new Error(`HTTP ${resp.status}`);
                    } else {
                        return resp;
                    }
                } catch (e) {
                    lastErr = e;
                }
                await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            }
            throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
        };
        const worker = async () => {
            while (cursor < toExport.length) {
                const idx = cursor++;
                const r = toExport[idx];
                try {
                    const resp = await fetchWithRetry(r.audio_file_url!);
                    if (!resp.ok) {
                        failed++;
                        failures.push({ id: r.voice_response_id, reason: `HTTP ${resp.status}` });
                        console.error(`[dataset export] ${r.voice_response_id} -> HTTP ${resp.status}`, r.audio_file_url);
                    } else {
                        const blob = await resp.blob();
                        const ext = r.audio_file_url!.match(/\.([a-z0-9]+)(\?|$)/i)?.[1] || "webm";
                        const filename = `${r.voice_response_id}.${ext}`;
                        folder?.file(filename, blob);
                        csvRows.push([
                            r.voice_response_id,
                            `"${r.question_text.replace(/"/g, '""')}"`,
                            `"${r.transcription_text.replace(/"/g, '""')}"`,
                            `"${pseudonymize ? r.recorder_pseudonym : r.recorder_name}"`,
                            `"${pseudonymize ? r.transcriber_pseudonym : r.transcriber_name}"`,
                            filename,
                        ].join(","));
                        success++;
                    }
                } catch (e) {
                    failed++;
                    const reason = e instanceof Error ? e.message : String(e);
                    failures.push({ id: r.voice_response_id, reason });
                    console.error(`[dataset export] ${r.voice_response_id} -> ${reason}`, r.audio_file_url);
                }
                // 5) Progress feedback every ~25 files
                const done = success + failed;
                if (done % 25 === 0 || done === toExport.length) {
                    startToast.update({
                        id: startToast.id,
                        title: "Preparing export",
                        description: `Downloading ${done} / ${toExport.length}${failed ? ` (${failed} failed)` : ""}...`,
                    });
                }
            }
        };

        await Promise.all(
            Array.from({ length: Math.min(CONCURRENCY, toExport.length) }, () => worker()),
        );

        // 4) If every download failed, still offer a metadata-only CSV so the user has something
        if (success === 0) {
            console.error("[dataset export] All downloads failed. Sample failures:", failures.slice(0, 5));
            // Download metadata CSV alone so the click still produces a file
            const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });
            const csvUrl = URL.createObjectURL(csvBlob);
            const a = document.createElement("a");
            a.href = csvUrl;
            a.download = `dataset_metadata_${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(csvUrl);
            startToast.update({
                id: startToast.id,
                title: "Audio download failed",
                description: `All ${toExport.length} audio files failed (storage 504/timeout). Downloaded metadata.csv only — try again in a moment.`,
                variant: "destructive",
            });
            return;
        }

        zip.file("metadata.csv", csvRows.join("\n"));
        startToast.update({
            id: startToast.id,
            title: "Compressing",
            description: `Building zip with ${success} files...`,
        });
        try {
            const content = await zip.generateAsync(
                { type: "blob", compression: "DEFLATE", compressionOptions: { level: 3 } },
                (meta) => {
                    if (Math.round(meta.percent) % 10 === 0) {
                        startToast.update({
                            id: startToast.id,
                            title: "Compressing",
                            description: `Building zip... ${Math.round(meta.percent)}%`,
                        });
                    }
                },
            );
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dataset_${new Date().toISOString().split("T")[0]}.zip`;
            a.rel = "noopener";
            document.body.appendChild(a);
            a.click();
            // Delay cleanup so the browser can pick up the download in all engines
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 2000);
        } catch (e) {
            console.error("[dataset export] zip generation/download failed:", e);
            startToast.update({
                id: startToast.id,
                title: "Download failed",
                description: e instanceof Error ? e.message : "Could not trigger the browser download.",
                variant: "destructive",
            });
            return;
        }

        startToast.update({
            id: startToast.id,
            title: failed ? "Export complete (with failures)" : "Export complete",
            description: failed
                ? `Exported ${success} of ${toExport.length}. ${failed} failed (see console).`
                : `Exported ${success} samples.`,
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search dataset..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 w-56 text-sm"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <Checkbox
                            checked={pseudonymize}
                            onCheckedChange={(v) => setPseudonymize(v === true)}
                            aria-label="Pseudonymize contributors in export"
                        />
                        Pseudonymize contributors
                    </label>
                    <Button variant="outline" size="sm" onClick={handleExportZip} className="gap-1.5 h-8">
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="text-left font-medium text-muted-foreground px-3 py-2.5 w-[200px]">transcription</th>
                                <th className="text-left font-medium text-muted-foreground px-3 py-2.5 w-[180px]">prompt</th>
                                <th className="text-left font-medium text-muted-foreground px-3 py-2.5 w-[120px]">recorder</th>
                                <th className="text-left font-medium text-muted-foreground px-3 py-2.5 w-[120px]">transcriber</th>
                                <th className="text-left font-medium text-muted-foreground px-3 py-2.5 w-[200px]">audio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-3 py-2.5">
                                        <p className="truncate max-w-[200px] font-mono text-xs" title={r.transcription_text}>
                                            {r.transcription_text}
                                        </p>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <p className="truncate max-w-[180px] text-xs text-muted-foreground" title={r.question_text}>
                                            {r.question_text}
                                        </p>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className="text-xs truncate max-w-[120px] block" title={r.recorder_name}>
                                            {pseudonymize ? (
                                                <span className="font-mono text-muted-foreground">{r.recorder_pseudonym}</span>
                                            ) : r.recorder_name}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className="text-xs truncate max-w-[120px] block" title={r.transcriber_name}>
                                            {pseudonymize ? (
                                                <span className="font-mono text-muted-foreground">{r.transcriber_pseudonym}</span>
                                            ) : r.transcriber_name}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {r.audio_file_url ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleAudio(r.id, r.audio_file_url!)}
                                                    className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
                                                >
                                                    {playingId === r.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                                                </button>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {r.duration_seconds ? formatDuration(r.duration_seconds) : "—"}
                                                </span>
                                                <Volume2 className="w-3 h-3 text-muted-foreground/50" />
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/50">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center text-muted-foreground py-12 text-sm">
                                        No records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
