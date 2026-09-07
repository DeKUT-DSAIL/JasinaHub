// MyTranscriptions page – user transcription history
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  X,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MyTranscription {
  id: string;
  transcription_text: string;
  status: string;
  created_at: string;
  question_text: string;
  image_url: string | null;
  duration_seconds: number | null;
  edit_count: number;
  audio_file_url: string | null;
}

const ITEMS_PER_PAGE = 10;
const MAX_EDITS = 3;

export default function MyTranscriptions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transcriptions, setTranscriptions] = useState<MyTranscription[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = (id: string, url: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast({ title: "Playback error", description: "Could not play this audio file.", variant: "destructive" });
    };
    audioRef.current = audio;
    audio.play();
    setPlayingId(id);
  };

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/login"); return; }

        const { data: transcriptionsData, error } = await supabase
          .from("transcriptions")
          .select("id, transcription_text, status, created_at, voice_response_id, edit_count")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!transcriptionsData || transcriptionsData.length === 0) {
          setTranscriptions([]);
          setLoading(false);
          return;
        }

        const vrIds = [...new Set(transcriptionsData.map((t) => t.voice_response_id))];
        const { data: voiceResponses } = await supabase
          .from("voice_responses")
          .select("id, question_id, duration_seconds, audio_file_url")
          .in("id", vrIds);

        const questionIds = [...new Set(voiceResponses?.map((v) => v.question_id) || [])];
        const { data: questions } = await supabase
          .from("questions")
          .select("id, question_text, image_url")
          .in("id", questionIds);

        const vrMap = new Map(voiceResponses?.map((v) => [v.id, v]) || []);
        const qMap = new Map(questions?.map((q) => [q.id, q]) || []);

        const enriched: MyTranscription[] = transcriptionsData.map((t) => {
          const vr = vrMap.get(t.voice_response_id);
          const q = vr ? qMap.get(vr.question_id) : null;
          return {
            id: t.id,
            transcription_text: t.transcription_text,
            status: t.status,
            created_at: t.created_at,
            question_text: q?.question_text || "Unknown question",
            image_url: q?.image_url || null,
            duration_seconds: vr?.duration_seconds || null,
            edit_count: (t as any).edit_count ?? 0,
            audio_file_url: vr?.audio_file_url || null,
          };
        });

        setTranscriptions(enriched);
      } catch (err) {
        console.error("Error loading transcriptions:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    return transcriptions.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        t.transcription_text.toLowerCase().includes(q) ||
        t.question_text.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transcriptions, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const canEdit = (t: MyTranscription) => t.status !== "accepted" && t.edit_count < MAX_EDITS;

  const startEdit = (t: MyTranscription) => {
    setEditingId(t.id);
    setEditText(t.transcription_text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleSaveClick = () => {
    if (!editText.trim()) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmedSave = async () => {
    setShowConfirmDialog(false);
    if (!editingId || !editText.trim()) return;
    setSaving(true);
    try {
      const t = transcriptions.find((tr) => tr.id === editingId);
      if (!t) return;

      const { error } = await supabase
        .from("transcriptions")
        .update({
          transcription_text: editText.trim(),
          edit_count: t.edit_count + 1,
        })
        .eq("id", editingId);

      if (error) throw error;

      setTranscriptions((prev) =>
        prev.map((tr) =>
          tr.id === editingId
            ? { ...tr, transcription_text: editText.trim(), edit_count: tr.edit_count + 1 }
            : tr
        )
      );
      toast({ title: "Transcription updated", description: `Edit ${t.edit_count + 1} of ${MAX_EDITS} used.` });
      setEditingId(null);
      setEditText("");
    } catch (err) {
      console.error("Error updating transcription:", err);
      toast({ title: "Error", description: "Failed to update transcription.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-100 text-green-700 text-xs gap-1"><CheckCircle className="w-3 h-3" />Accepted</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 text-xs gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 text-xs gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    }
  };

  const stats = useMemo(() => {
    const total = transcriptions.length;
    const accepted = transcriptions.filter((t) => t.status === "accepted");
    const rejected = transcriptions.filter((t) => t.status === "rejected");
    const pending = transcriptions.filter((t) => t.status === "pending");

    const sumDuration = (list: MyTranscription[]) =>
      list.reduce((acc, t) => acc + (t.duration_seconds || 0), 0);

    return {
      total,
      accepted: accepted.length,
      rejected: rejected.length,
      pending: pending.length,
      totalDuration: sumDuration(transcriptions),
      acceptedDuration: sumDuration(accepted),
      rejectedDuration: sumDuration(rejected),
      pendingDuration: sumDuration(pending),
    };
  }, [transcriptions]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-[100dvh] relative w-full bg-background overflow-x-hidden">
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[120px] animate-blob will-change-transform" />
        <div className="absolute top-[5%] right-[-5%] w-[35rem] h-[35rem] bg-accent/30 rounded-full blur-[120px] animate-blob will-change-transform" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex items-center gap-3 animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="h-10 w-10 rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm hover:bg-card"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">My Transcriptions</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">View your submitted transcriptions and their status</p>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Loading transcriptions">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <Card className="bg-card/80 border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5">
                    {formatDuration(stats.totalDuration)}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-amber-50/50 border-amber-200/50">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{stats.pending}</p>
                  <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider mb-1">Pending</p>
                  <Badge variant="outline" className="text-[10px] font-mono bg-white/50 border-amber-200 text-amber-700 px-1.5 py-0 h-5">
                    {formatDuration(stats.pendingDuration)}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-green-50/50 border-green-200/50">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{stats.accepted}</p>
                  <p className="text-[10px] font-medium text-green-600 uppercase tracking-wider mb-1">Accepted</p>
                  <Badge variant="outline" className="text-[10px] font-mono bg-white/50 border-green-200 text-green-700 px-1.5 py-0 h-5">
                    {formatDuration(stats.acceptedDuration)}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-red-50/50 border-red-200/50">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{stats.rejected}</p>
                  <p className="text-[10px] font-medium text-red-600 uppercase tracking-wider mb-1">Rejected</p>
                  <Badge variant="outline" className="text-[10px] font-mono bg-white/50 border-red-200 text-red-700 px-1.5 py-0 h-5">
                    {formatDuration(stats.rejectedDuration)}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-card/80" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 bg-card/80"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">Showing {paginated.length} of {filtered.length}</p>

            {/* Cards */}
            <div className="space-y-3">
              {paginated.map((t) => {
                const isEditing = editingId === t.id;
                const editable = canEdit(t);

                return (
                  <Card key={t.id} className="bg-card/90 backdrop-blur-sm border-border/50 shadow-sm">
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {getStatusBadge(t.status)}
                            {t.duration_seconds && (
                              <Badge variant="secondary" className="text-[10px] h-5 gap-1 font-mono">
                                <Clock className="w-2.5 h-2.5" />
                                {formatDuration(t.duration_seconds)}
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground line-clamp-2">{t.question_text}</p>
                        </div>
                        {/* Edit button */}
                        {!isEditing && editable && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(t)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground flex-shrink-0"
                            title={`Edit (${MAX_EDITS - t.edit_count} edits remaining)`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Audio player */}
                      {t.audio_file_url && (
                        <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-2 border border-border/30">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAudio(t.id, t.audio_file_url!)}
                            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex-shrink-0"
                          >
                            {playingId === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Volume2 className="w-3 h-3" />
                            <span>Listen to recording</span>
                          </div>
                        </div>
                      )}

                      {t.image_url && (
                        <div className="rounded-lg overflow-hidden border border-border/50">
                          <img src={t.image_url} alt="Question" className="w-full object-contain max-h-48" loading="lazy" />
                        </div>
                      )}

                      <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Transcription</span>
                          </div>
                          {t.edit_count > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              Edited {t.edit_count}/{MAX_EDITS}
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-[80px] text-sm resize-none bg-background/50"
                              autoFocus
                            />
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-muted-foreground">
                                {MAX_EDITS - t.edit_count - 1} edit{MAX_EDITS - t.edit_count - 1 !== 1 ? "s" : ""} remaining after this
                              </p>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving} className="h-7 text-xs">
                                  <X className="w-3 h-3 mr-1" />Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleSaveClick}
                                  disabled={!editText.trim() || editText.trim() === t.transcription_text || saving}
                                  className="h-7 text-xs"
                                >
                                  {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{t.transcription_text}</p>
                            {!editable && t.status === "accepted" && (
                              <p className="text-[10px] text-green-600 mt-1">✓ Accepted — editing locked</p>
                            )}
                            {!editable && t.status !== "accepted" && t.edit_count >= MAX_EDITS && (
                              <p className="text-[10px] text-muted-foreground mt-1">Maximum edits ({MAX_EDITS}) reached</p>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {paginated.length === 0 && (
                <Card className="bg-card/80 border-border/50 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-muted-foreground">No transcriptions found</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Edit</DialogTitle>
            <DialogDescription>
              Are you sure you want to save this edit? This action will use one of your remaining edits.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 border border-border/30 max-h-32 overflow-y-auto">
            <p className="text-sm text-foreground whitespace-pre-wrap">{editText}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleConfirmedSave} className="rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              Save Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
