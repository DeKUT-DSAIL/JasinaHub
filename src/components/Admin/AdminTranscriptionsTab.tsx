import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Play,
  Pause,
  Clock,
  Pencil,
  Save,
  X,
  ShieldCheck,
  UserCheck,
  BookOpen,
  BarChart3,
  Download,
  CheckSquare,
  Square,
  Timer,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InlineAudioPlayer } from "./InlineAudioPlayer";

interface Transcription {
  id: string;
  voice_response_id: string;
  user_id: string;
  transcription_text: string;
  status: string;
  created_at: string;
  transcriber_name: string;
  transcriber_email: string;
  recorder_name: string;
  recorder_email: string;
  question_text: string;
  audio_file_url: string | null;
  duration_seconds: number | null;
  image_url: string | null;
  validated_by: string | null;
  validated_at: string | null;
  validator_name: string | null;
}

const ITEMS_PER_PAGE = 10;

export function AdminTranscriptionsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [pendingTranscribers, setPendingTranscribers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id: string;
    action: "accepted" | "rejected";
  } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    loadTranscriptions();
    loadPendingTranscribers();
  }, []);

  // Helper: chunked fetch to avoid PostgREST URL-length truncation on large IN() lists
  const chunkedFetchByIds = async <T,>(
    table: "profiles" | "voice_responses" | "questions",
    columns: string,
    ids: string[],
    chunkSize = 150,
  ): Promise<T[]> => {
    if (!ids.length) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }
    const results = await Promise.all(
      chunks.map((chunk) =>
        (supabase.from(table) as any)
          .select(columns)
          .in("id", chunk),
      ),
    );
    const merged: T[] = [];
    for (const r of results) {
      if (r.error) {
        console.warn(`[chunkedFetch:${table}] chunk error`, r.error);
        continue;
      }
      if (r.data) merged.push(...(r.data as T[]));
    }
    return merged;
  };

  const loadTranscriptions = async () => {
    try {
      setLoading(true);

      // Fetch ALL transcriptions via paginated loop (server enforces a max-rows cap,
      // so a single .range(0, 4999) silently truncates to 1000 rows. We page until exhausted.)
      const PAGE_SIZE = 1000;
      const transcriptionsData: Array<{
        id: string;
        voice_response_id: string;
        user_id: string;
        transcription_text: string;
        status: string;
        created_at: string;
        validated_by: string | null;
        validated_at: string | null;
      }> = [];
      let page = 0;
      while (true) {
        const fromIdx = page * PAGE_SIZE;
        const toIdx = fromIdx + PAGE_SIZE - 1;
        const { data: pageData, error: tError } = await supabase
          .from("transcriptions")
          .select("id, voice_response_id, user_id, transcription_text, status, created_at, validated_by, validated_at")
          .order("created_at", { ascending: false })
          .range(fromIdx, toIdx);
        if (tError) throw tError;
        if (!pageData || pageData.length === 0) break;
        transcriptionsData.push(...(pageData as any));
        page += 1;
        if (pageData.length < PAGE_SIZE) break;
      }
      console.log(
        `[AdminTranscriptionsTab] Loaded ${transcriptionsData.length} transcriptions across ${page} page(s)`,
      );

      if (!transcriptionsData || transcriptionsData.length === 0) {
        setTranscriptions([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs and voice response IDs
      const transcriberIds = [...new Set(transcriptionsData.map((t) => t.user_id))];
      const voiceResponseIds = [...new Set(transcriptionsData.map((t) => t.voice_response_id))];
      const validatorIds = [
        ...new Set(
          transcriptionsData.map((t) => t.validated_by).filter((x): x is string => !!x),
        ),
      ];

      // Fetch transcriber profiles + voice responses + validator profiles (chunked, parallel)
      const [transcriberProfiles, voiceResponses, validatorProfiles] = await Promise.all([
        chunkedFetchByIds<{ id: string; first_name: string; last_name: string; email: string }>(
          "profiles",
          "id, first_name, last_name, email",
          transcriberIds,
        ),
        chunkedFetchByIds<{
          id: string;
          user_id: string;
          question_id: string;
          audio_file_url: string | null;
          duration_seconds: number | null;
        }>("voice_responses", "id, user_id, question_id, audio_file_url, duration_seconds", voiceResponseIds),
        chunkedFetchByIds<{ id: string; first_name: string; last_name: string; email: string }>(
          "profiles",
          "id, first_name, last_name, email",
          validatorIds,
        ),
      ]);

      // Get recorder profiles and questions
      const recorderIds = [...new Set(voiceResponses.map((v) => v.user_id))];
      const questionIds = [...new Set(voiceResponses.map((v) => v.question_id))];

      const [recorderProfiles, questions] = await Promise.all([
        chunkedFetchByIds<{ id: string; first_name: string; last_name: string; email: string }>(
          "profiles",
          "id, first_name, last_name, email",
          recorderIds,
        ),
        chunkedFetchByIds<{ id: string; question_text: string; image_url: string | null }>(
          "questions",
          "id, question_text, image_url",
          questionIds,
        ),
      ]);

      // Build lookup maps
      const transcriberMap = new Map(transcriberProfiles.map((p) => [p.id, p]));
      const voiceResponseMap = new Map(voiceResponses.map((v) => [v.id, v]));
      const recorderMap = new Map(recorderProfiles.map((p) => [p.id, p]));
      const questionMap = new Map(questions.map((q) => [q.id, q]));
      const validatorMap = new Map(validatorProfiles.map((p) => [p.id, p]));

      // Diagnostic: warn (once per missing id) about lookup gaps so future data issues surface immediately
      const warnedVR = new Set<string>();
      const warnedRecorder = new Set<string>();
      const warnedQuestion = new Set<string>();

      // Enrich transcriptions
      const enriched: Transcription[] = transcriptionsData.map((t) => {
        const transcriber = transcriberMap.get(t.user_id);
        const voiceResponse = voiceResponseMap.get(t.voice_response_id);
        if (!voiceResponse && !warnedVR.has(t.voice_response_id)) {
          warnedVR.add(t.voice_response_id);
          console.warn(`[Transcription ${t.id}] missing voice_response ${t.voice_response_id} — lookup failed`);
        }
        const recorder = voiceResponse ? recorderMap.get(voiceResponse.user_id) : null;
        if (voiceResponse && !recorder && !warnedRecorder.has(voiceResponse.user_id)) {
          warnedRecorder.add(voiceResponse.user_id);
          console.warn(`[Transcription ${t.id}] missing recorder profile ${voiceResponse.user_id}`);
        }
        const question = voiceResponse ? questionMap.get(voiceResponse.question_id) : null;
        if (voiceResponse && !question && !warnedQuestion.has(voiceResponse.question_id)) {
          warnedQuestion.add(voiceResponse.question_id);
          console.warn(`[Transcription ${t.id}] missing question ${voiceResponse.question_id}`);
        }

        return {
          id: t.id,
          voice_response_id: t.voice_response_id,
          user_id: t.user_id,
          transcription_text: t.transcription_text,
          status: t.status,
          created_at: t.created_at,
          transcriber_name: transcriber ? `${transcriber.first_name} ${transcriber.last_name}` : "Unknown",
          transcriber_email: transcriber?.email || "",
          recorder_name: recorder ? `${recorder.first_name} ${recorder.last_name}` : "Unknown",
          recorder_email: recorder?.email || "",
          question_text: question?.question_text || "Unknown question",
          audio_file_url: voiceResponse?.audio_file_url || null,
          duration_seconds: voiceResponse?.duration_seconds || null,
          image_url: question?.image_url || null,
          validated_by: t.validated_by ?? null,
          validated_at: t.validated_at ?? null,
          validator_name: t.validated_by
            ? (() => {
                const v = validatorMap.get(t.validated_by!);
                return v ? `${v.first_name} ${v.last_name}` : null;
              })()
            : null,
        };
      });


      setTranscriptions(enriched);
    } catch (error) {
      console.error("Error loading transcriptions:", error);
      toast({ title: "Error", description: "Failed to load transcriptions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadPendingTranscribers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone_number, created_at, transcription_guidelines_agreed, transcription_approved")
        .eq("account_type", "transcriber")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingTranscribers(data || []);
    } catch (error) {
      console.error("Error loading pending transcribers:", error);
    }
  };

  const handleDownloadAudio = async (t: Transcription) => {
    if (!t.audio_file_url) {
      toast({ title: "No audio", description: "Audio file unavailable for this recording.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(t.audio_file_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const urlExt = t.audio_file_url.split("?")[0].split(".").pop();
      const ext = urlExt && urlExt.length <= 5 ? urlExt : "webm";
      const slug = (t.recorder_name || "recording")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();
      const qSlug = (t.question_text || "question")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase()
        .slice(0, 40);
      const filename = `${slug}_${qSlug}.${ext}`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Download started", description: filename });
    } catch (err) {
      console.error("Download failed:", err);
      toast({ title: "Download failed", description: "Could not download audio.", variant: "destructive" });
    }
  };

  const handleApproveTranscriber = async (userId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ transcription_approved: approved } as any)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: approved ? "Transcriber Approved" : "Access Revoked",
        description: approved ? "User can now start transcribing" : "Transcription access revoked",
      });
      loadPendingTranscribers();
    } catch (error) {
      console.error("Error updating transcriber:", error);
      toast({ title: "Error", description: "Failed to update transcriber", variant: "destructive" });
    }
  };

  const updateTranscriptionStatus = async (id: string, status: "accepted" | "rejected") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id ?? null;
      const validatedAt = new Date().toISOString();
      const { error } = await supabase
        .from("transcriptions")
        .update({ status, validated_by: adminId, validated_at: validatedAt } as any)
        .eq("id", id);

      if (error) throw error;

      // Resolve current admin's name for immediate UI update
      let validatorName: string | null = null;
      if (adminId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", adminId)
          .maybeSingle();
        if (prof) validatorName = `${prof.first_name} ${prof.last_name}`;
      }

      setTranscriptions((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status, validated_by: adminId, validated_at: validatedAt, validator_name: validatorName ?? t.validator_name }
            : t,
        )
      );

      toast({
        title: status === "accepted" ? "Transcription Accepted" : "Transcription Rejected",
        description: `Transcription has been marked as ${status}`,
      });

      // Clear selection if this item was selected
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
    } catch (error) {
      console.error("Error updating transcription:", error);
      toast({ title: "Error", description: "Failed to update transcription status", variant: "destructive" });
    }
    setConfirmDialog(null);
  };

  const handleBulkAction = async (status: "accepted" | "rejected") => {
    if (selectedIds.size === 0) return;

    setIsBulkActionLoading(true);
    const idsToUpdate = Array.from(selectedIds);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const adminId = user?.id ?? null;
      const validatedAt = new Date().toISOString();
      const { error } = await supabase
        .from("transcriptions")
        .update({ status, validated_by: adminId, validated_at: validatedAt } as any)
        .in("id", idsToUpdate);

      if (error) throw error;

      let validatorName: string | null = null;
      if (adminId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", adminId)
          .maybeSingle();
        if (prof) validatorName = `${prof.first_name} ${prof.last_name}`;
      }

      setTranscriptions((prev) =>
        prev.map((t) =>
          selectedIds.has(t.id)
            ? { ...t, status, validated_by: adminId, validated_at: validatedAt, validator_name: validatorName ?? t.validator_name }
            : t,
        )
      );

      toast({
        title: "Bulk Action Complete",
        description: `Successfully ${status === "accepted" ? "accepted" : "rejected"} ${idsToUpdate.length} transcriptions.`,
      });

      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk action error:", error);
      toast({
        title: "Error",
        description: "Bulk update failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const toggleSelectId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transcriptions")
        .update({ transcription_text: editText.trim() })
        .eq("id", id);
      if (error) throw error;
      setTranscriptions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, transcription_text: editText.trim() } : t))
      );
      setEditingId(null);
      toast({ title: "Transcription Updated", description: "The transcription text has been saved." });
    } catch (error) {
      console.error("Error updating transcription:", error);
      toast({ title: "Error", description: "Failed to update transcription text", variant: "destructive" });
    }
  };

  const toggleAudio = (url: string, id: string) => {
    if (playingAudio === id) {
      audioElement?.pause();
      setPlayingAudio(null);
      setAudioElement(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => {
        setPlayingAudio(null);
        setAudioElement(null);
      };
      setPlayingAudio(id);
      setAudioElement(audio);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

  const filteredTranscriptions = useMemo(() => {
    const filtered = transcriptions.filter((t) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        t.transcriber_name.toLowerCase().includes(query) ||
        t.transcriber_email.toLowerCase().includes(query) ||
        t.recorder_name.toLowerCase().includes(query) ||
        t.question_text.toLowerCase().includes(query) ||
        t.transcription_text.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort: pending first, rejected next, accepted last (so accepted move to last pages)
    const statusOrder: Record<string, number> = { pending: 0, rejected: 1, accepted: 2 };
    return [...filtered].sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      // Within same status, newest first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [transcriptions, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredTranscriptions.length / ITEMS_PER_PAGE);
  const paginatedTranscriptions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTranscriptions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTranscriptions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds && seconds !== 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);

    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-100 text-green-700 text-xs">Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>;
    }
  };

  const stats = useMemo(() => {
    // Match the overview page: count unique recordings, not duplicate submissions.
    const uniqueNonRejected = new Set<string>();
    const uniqueAccepted = new Set<string>();
    const uniquePending = new Set<string>();
    const uniqueRejected = new Set<string>();
    const acceptedVrs = new Set<string>();
    transcriptions.forEach((t) => {
      if (t.status === "accepted") acceptedVrs.add(t.voice_response_id);
    });
    transcriptions.forEach((t) => {
      if (t.status !== "rejected") uniqueNonRejected.add(t.voice_response_id);
      if (t.status === "accepted") uniqueAccepted.add(t.voice_response_id);
      if (t.status === "pending" && !acceptedVrs.has(t.voice_response_id)) {
        uniquePending.add(t.voice_response_id);
      }
      if (t.status === "rejected") uniqueRejected.add(t.voice_response_id);
    });
    return {
      total: uniqueNonRejected.size,
      accepted: uniqueAccepted.size,
      rejected: uniqueRejected.size,
      pending: uniquePending.size,
    };
  }, [transcriptions]);

  const transcriberStats = useMemo(() => {
    const statsMap: Record<string, {
      userId: string;
      name: string;
      email: string;
      total: number;
      accepted: number;
      rejected: number;
      pending: number;
      totalDuration: number;
      verifiedDuration: number;
      uniqueDuration: number;
      duplicateDuration: number;
    }> = {};

    // For each voice_response, find the FIRST transcription (earliest created_at,
    // tie-break on id). That transcriber gets unique credit; later ones get duplicate.
    const firstTranscriptionIdByVR: Record<string, string> = {};
    const groupedByVR: Record<string, typeof transcriptions> = {};
    transcriptions.forEach((t) => {
      (groupedByVR[t.voice_response_id] ||= []).push(t);
    });
    Object.entries(groupedByVR).forEach(([vrId, list]) => {
      const sorted = [...list].sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        if (ta !== tb) return ta - tb;
        return a.id.localeCompare(b.id);
      });
      firstTranscriptionIdByVR[vrId] = sorted[0].id;
    });

    transcriptions.forEach((t) => {
      if (!statsMap[t.user_id]) {
        statsMap[t.user_id] = {
          userId: t.user_id,
          name: t.transcriber_name,
          email: t.transcriber_email,
          total: 0,
          accepted: 0,
          rejected: 0,
          pending: 0,
          totalDuration: 0,
          verifiedDuration: 0,
          uniqueDuration: 0,
          duplicateDuration: 0,
        };
      }
      const s = statsMap[t.user_id];
      s.total++;
      const duration = t.duration_seconds || 0;
      s.totalDuration += duration;

      if (firstTranscriptionIdByVR[t.voice_response_id] === t.id) {
        s.uniqueDuration += duration;
      } else {
        s.duplicateDuration += duration;
      }

      if (t.status === "accepted") {
        s.accepted++;
        s.verifiedDuration += duration;
      }
      else if (t.status === "rejected") s.rejected++;
      else s.pending++;
    });

    return Object.values(statsMap).sort((a, b) => b.total - a.total);
  }, [transcriptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading transcriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="animate-in zoom-in duration-300 bg-primary/10 text-primary border-primary/20">
            {selectedIds.size} selected
          </Badge>
        </div>
      )}

      {/* Tab Specific Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-blue-500/5 border-blue-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total Transcriptions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{stats.accepted}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Pending Review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transcriber Approvals */}
      {(() => {
        const awaitingApproval = pendingTranscribers.filter(
          (u) => u.transcription_guidelines_agreed && !u.transcription_approved
        );
        const approvedTranscribers = pendingTranscribers.filter(
          (u) => u.transcription_approved
        );
        const notAgreed = pendingTranscribers.filter(
          (u) => !u.transcription_guidelines_agreed
        );

        if (pendingTranscribers.length === 0) return null;

        return (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Transcriber Management
              {awaitingApproval.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">{awaitingApproval.length} awaiting</Badge>
              )}
            </h3>

            {awaitingApproval.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Awaiting Approval</p>
                {awaitingApproval.map((user) => (
                  <Card key={user.id} className="bg-amber-500/5 border-amber-200/20 shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className="bg-amber-500/20 text-amber-600 text-sm">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex-shrink-0">
                          <BookOpen className="w-3 h-3" /> Guidelines Agreed
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproveTranscriber(user.id, true)}
                        className="flex-shrink-0 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white"
                      >
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {approvedTranscribers.length > 0 && (
              <details className="group">
                <summary className="text-xs text-muted-foreground font-medium uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors">
                  Approved Transcribers ({approvedTranscribers.length}) — click to expand
                </summary>
                <div className="space-y-2 mt-2">
                  {approvedTranscribers.map((user) => (
                    <Card key={user.id} className="bg-green-50/50 border-green-200/40 shadow-sm">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarFallback className="bg-green-200 text-green-800 text-sm">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs gap-1 bg-green-50 text-green-700 border-green-200 flex-shrink-0">
                            <ShieldCheck className="w-3 h-3" /> Approved
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveTranscriber(user.id, false)}
                          className="flex-shrink-0 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Revoke
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </details>
            )}

            {notAgreed.length > 0 && (
              <details className="group">
                <summary className="text-xs text-muted-foreground font-medium uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors">
                  Not Yet Agreed to Guidelines ({notAgreed.length})
                </summary>
                <div className="space-y-2 mt-2">
                  {notAgreed.map((user) => (
                    <Card key={user.id} className="bg-muted/30 border-border/40 shadow-sm">
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs text-muted-foreground flex-shrink-0">
                          Hasn't agreed yet
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </details>
            )}
          </div>
        );
      })()}

      {/* Transcriber Performance Stats */}
      {transcriberStats.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Transcriber Performance
          </h3>
          <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">Transcriber</th>
                    <th className="px-4 py-3 font-medium text-center whitespace-nowrap">Type</th>
                    <th className="px-4 py-3 font-medium text-center whitespace-nowrap">Total</th>
                    <th className="px-4 py-3 font-medium text-center text-green-600 whitespace-nowrap">Accepted</th>
                    <th className="px-4 py-3 font-medium text-center text-red-600 whitespace-nowrap">Rejected</th>
                    <th className="px-4 py-3 font-medium text-center text-amber-600 whitespace-nowrap">Pending</th>
                    <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Transcribed Dur.</th>
                    <th className="px-4 py-3 font-medium text-right text-emerald-600 whitespace-nowrap">Verified Dur.</th>
                    <th className="px-4 py-3 font-medium text-right text-blue-600 whitespace-nowrap" title="Duration of recordings only this transcriber transcribed (unique work)">Unique Dur.</th>
                    <th className="px-4 py-3 font-medium text-right text-orange-600 whitespace-nowrap" title="Duration of recordings this transcriber transcribed that were also transcribed by others (non-unique work)">Duplicate Dur.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 bg-card text-foreground">
                  {transcriberStats.map((stat) => (
                    <tr key={stat.userId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm text-foreground">{stat.name}</p>
                        <p className="text-xs text-muted-foreground">{stat.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20 whitespace-nowrap">
                          Transcriber
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{stat.total}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{stat.accepted}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{stat.rejected}</td>
                      <td className="px-4 py-3 text-center text-amber-600 font-medium">{stat.pending}</td>
                      <td className="px-4 py-3 text-right font-medium text-xs">
                        {formatDuration(stat.totalDuration)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-xs text-emerald-600">
                        {formatDuration(stat.verifiedDuration)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-xs text-blue-600">
                        {formatDuration(stat.uniqueDuration)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-xs text-orange-600">
                        {formatDuration(stat.duplicateDuration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-background/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {paginatedTranscriptions.length} of {filteredTranscriptions.length} transcriptions
      </p>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-500 hover:text-gray-900 gap-2"
            >
              <X className="w-4 h-4" />
              <span>Deselect all</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleBulkAction('accepted')}
              disabled={isBulkActionLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-sm rounded-xl"
            >
              {isBulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve {selectedIds.size}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('rejected')}
              disabled={isBulkActionLoading}
              className="gap-2 shadow-sm rounded-xl"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Transcription Cards */}
      <div className="space-y-4">
        {paginatedTranscriptions.map((t) => (
          <Card key={t.id} className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm overflow-hidden flex flex-row">
            <div className="p-4 pr-0 select-none">
              <Checkbox
                checked={selectedIds.has(t.id)}
                onCheckedChange={() => toggleSelectId(t.id)}
                className="w-5 h-5 rounded-md border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>
            <CardContent className="p-4 sm:p-5 flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {getStatusBadge(t.status)}
                    <span className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {t.status === "accepted" && t.validator_name && (
                      <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Validated by {t.validator_name}
                        {t.validated_at && (
                          <span className="text-emerald-600/70">
                            · {new Date(t.validated_at).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2">{t.question_text}</p>
                </div>
              </div>

              {/* Audio Player & Download */}
              <div className="space-y-1.5">
                {t.audio_file_url ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <InlineAudioPlayer src={t.audio_file_url} durationSeconds={t.duration_seconds} />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadAudio(t)}
                      className="shrink-0 gap-1.5"
                      title="Download recording"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs italic text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
                    Audio unavailable for this recording.
                  </div>
                )}
              </div>

              {/* Image preview */}
              {t.image_url && (
                <div className="rounded-lg overflow-hidden border border-border/50">
                  <img src={t.image_url} alt="Question visual" className="w-full object-contain max-h-48" loading="lazy" />
                </div>
              )}

              {/* Transcription text */}
              <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Transcription</span>
                  </div>
                  {editingId === t.id ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3 mr-1.5" />Cancel
                      </Button>
                      <Button size="sm" onClick={() => handleSaveEdit(t.id)} disabled={!editText.trim()}>
                        <Save className="w-3 h-3 mr-1.5" />Save
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(t.id); setEditText(t.transcription_text); }} className="text-muted-foreground">
                      <Pencil className="w-3 h-3 mr-1.5" />Edit
                    </Button>
                  )}
                </div>
                {editingId === t.id ? (
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[100px] text-sm leading-relaxed resize-none bg-background"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{t.transcription_text}</p>
                )}
              </div>

              {/* People info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-purple-700">Transcriber:</span>
                  <span className="text-purple-600 truncate">{t.transcriber_name}</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-blue-700">Recorder:</span>
                  <span className="text-blue-600 truncate">{t.recorder_name}</span>
                </div>
              </div>

              {/* Actions */}
              {t.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDialog({ open: true, id: t.id, action: "accepted" })}
                    className="flex-1 text-green-600 border-green-200 hover:bg-green-600 hover:text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmDialog({ open: true, id: t.id, action: "rejected" })}
                    className="flex-1 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {paginatedTranscriptions.length === 0 && (
          <Card className="bg-card/50 border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">No transcriptions found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(pageInput, 10);
              if (!isNaN(n) && n >= 1 && n <= totalPages) {
                setCurrentPage(n);
                setPageInput("");
              }
            }}
            className="flex items-center gap-1.5 ml-2"
          >
            <span className="text-sm text-muted-foreground">Go to</span>
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              placeholder={String(currentPage)}
              className="h-8 w-20 text-sm"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8">Go</Button>
          </form>
        </div>
      )}



      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === "accepted" ? "Accept Transcription?" : "Reject Transcription?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === "accepted"
                ? "This will mark the transcription as accepted and validated."
                : "This will mark the transcription as rejected. The transcriber may need to redo it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog && updateTranscriptionStatus(confirmDialog.id, confirmDialog.action)}
              className={confirmDialog?.action === "accepted" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {confirmDialog?.action === "accepted" ? "Accept" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
