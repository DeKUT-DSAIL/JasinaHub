import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Pause, SkipForward, Check, Send, Headphones, Loader2, Music2, FileText, RefreshCw, Lightbulb, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TranscriptionGuidelines } from "@/components/Transcription/TranscriptionGuidelines";
import { TranscriptionGuidelinesReference } from "@/components/Transcription/TranscriptionGuidelinesReference";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

// --- Types ---
interface TranscriptionRecording {
  id: string;
  audio_file_url: string;
  question_text: string;
  duration_seconds: number | null;
  image_url: string | null;
  image_attribution: string | null;
}

// --- Get playback URL ---
function getPlaybackUrl(url: string): string {
  if (url.includes('supabase.co/storage')) return url;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}


// --- Seekable Progress Track ---
const SeekableProgressTrack = ({
  progress,
  onSeek,
}: {
  progress: number;
  onSeek: (fraction: number) => void;
}) => {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(fraction);
  };

  return (
    <div
      ref={trackRef}
      className="w-full py-4 cursor-pointer group"
      onClick={handleClick}
      role="slider"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Audio progress"
      tabIndex={0}
    >
      <div className="relative w-full h-1.5 rounded-full bg-muted group-hover:h-2 transition-all">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-100 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-md border-2 border-primary-foreground transition-all duration-100 ease-out opacity-0 group-hover:opacity-100"
          style={{ left: `calc(${progress * 100}% - 7px)` }}
        />
      </div>
    </div>
  );
};

// --- Speed options ---
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];

type PageState = "checking" | "guidelines" | "loading" | "listening" | "deciding" | "transcribing" | "submitting" | "empty";

const MAX_CHARS = 1000;

const TIPS = [
  "Include filler words like 'um' and 'uh' for accuracy.",
  "Punctuate naturally — commas, periods, question marks.",
  "Write numbers as spoken: 'twenty-three' not '23'.",
  "If unclear, use [inaudible] for segments you can't hear.",
];

export default function Transcribe() {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [pageState, setPageState] = useState<PageState>("checking");
  const [recording, setRecording] = useState<TranscriptionRecording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [hasFinishedPlaying, setHasFinishedPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [sessionCount, setSessionCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Draft key for localStorage
  const getDraftKey = (recId: string) => `transcription_draft_${recId}`;

  // Guidelines state
  const [guidelinesAgreed, setGuidelinesAgreed] = useState(false);
  const [transcriptionApproved, setTranscriptionApproved] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(true);

  const currentTip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  const wordCount = useMemo(() => {
    const trimmed = transcriptionText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [transcriptionText]);

  // Check guidelines status on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("transcription_guidelines_agreed, transcription_approved")
        .eq("id", user.id)
        .single();

      const agreed = (profile as any)?.transcription_guidelines_agreed || false;
      const approved = (profile as any)?.transcription_approved || false;

      setGuidelinesAgreed(agreed);
      setTranscriptionApproved(approved);

      // Workflow:
      // - If user has NOT agreed to guidelines -> show guidelines
      // - If user HAS agreed but is NOT approved -> show "awaiting admin approval"
      // - If user HAS agreed AND IS approved -> allow access to transcription flow
      if (agreed && approved) {
        setPageState("loading");
      } else {
        setPageState("guidelines");
      }
    })();
  }, [navigate]);

  const handleGuidelinesAgree = async () => {
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        transcription_guidelines_agreed: true,
        transcription_guidelines_agreed_at: new Date().toISOString(),
        account_type: "transcriber",
      } as any)
      .eq("id", userId);

    if (error) {
      toast({ title: "Error", description: "Failed to save agreement. Please try again.", variant: "destructive" });
      throw error;
    }

    setGuidelinesAgreed(true);
    // Don't proceed — need admin approval
  };

  // Admin approval is handled by re-checking the profile whenever this
  // page is opened. Users must be approved before they can transcribe.

  // --- Fetch using claim RPC (duplicate prevention) ---
  const fetchRecording = useCallback(async () => {
    setPageState("loading");
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setTranscriptionText("");
    setHasFinishedPlaying(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);

      const { data, error } = await supabase.rpc("claim_random_transcription", {
        _user_id: user.id,
      });

      if (error) throw error;
      if (!data || data.length === 0) { setPageState("empty"); return; }

      const chosen = data[0];

      const { data: question } = await supabase
        .from("questions")
        .select("question_text, image_url, image_attribution")
        .eq("id", chosen.question_id)
        .single();

      const rec: TranscriptionRecording = {
        id: chosen.id,
        audio_file_url: chosen.audio_file_url!,
        question_text: question?.question_text || "Unknown question",
        duration_seconds: chosen.duration_seconds,
        image_url: question?.image_url || null,
        image_attribution: question?.image_attribution || null,
      };

      // Restore draft if available
      const draft = localStorage.getItem(getDraftKey(rec.id));
      if (draft) {
        setTranscriptionText(draft);
        setHasFinishedPlaying(true);
        setPageState("transcribing");
      } else {
        setPageState("listening");
      }

      setRecording(rec);
    } catch (err) {
      console.error("Error fetching recording:", err);
      toast({ title: "Error", description: "Failed to load recording. Please try again.", variant: "destructive" });
      setPageState("empty");
    }
  }, [navigate]);

  // Trigger fetch when state becomes "loading" and guidelines are done
  useEffect(() => {
    if (pageState === "loading" && guidelinesAgreed && transcriptionApproved) {
      fetchRecording();
    }
  }, [pageState, guidelinesAgreed, transcriptionApproved, fetchRecording]);

  // Release lock on page leave / unmount
  useEffect(() => {
    const releaseLock = () => {
      if (userId) {
        supabase.rpc("release_transcription_lock", { _user_id: userId });
      }
    };

    window.addEventListener("beforeunload", releaseLock);
    return () => {
      window.removeEventListener("beforeunload", releaseLock);
      releaseLock();
    };
  }, [userId]);

  // Load session count on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("transcriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString());
      setSessionCount(count || 0);
    })();
  }, []);

  // --- Audio handlers ---
  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        toast({ title: "Playback error", description: "Unable to play this audio file. Tap refresh to try another.", variant: "destructive" });
      });
      setIsPlaying(true);
    }
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    toast({ title: "Audio unavailable", description: "This recording couldn't be loaded. Tap refresh to try another.", variant: "destructive" });
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setCurrentTime(audio.currentTime);
    setProgress(audio.currentTime / audio.duration);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
      audio.playbackRate = playbackSpeed;
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(1);
    setHasFinishedPlaying(true);
    if (pageState === "listening") setPageState("deciding");
  };

  const handleSeek = (fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
    setCurrentTime(audio.currentTime);
    setProgress(fraction);
  };

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  // --- Typing detection + draft saving ---
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_CHARS) {
      setTranscriptionText(e.target.value);
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1000);

      // Auto-save draft
      if (recording) {
        localStorage.setItem(getDraftKey(recording.id), e.target.value);
      }
    }
  };

  // --- Actions ---
  const handleAccept = () => setPageState("transcribing");
  const handleSkip = () => {
    // Clear draft when skipping
    if (recording) localStorage.removeItem(getDraftKey(recording.id));
    fetchRecording();
  };

  const handleSubmitClick = () => {
    if (!transcriptionText.trim() || !recording || !userId) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowConfirmDialog(false);
    if (!transcriptionText.trim() || !recording || !userId) return;
    setPageState("submitting");
    try {
      const { error } = await supabase.from("transcriptions").insert({
        voice_response_id: recording.id,
        user_id: userId,
        transcription_text: transcriptionText.trim(),
      });
      if (error) throw error;
      // Clear draft on successful submit
      localStorage.removeItem(getDraftKey(recording.id));
      setSessionCount((c) => c + 1);
      toast({ title: "Transcription submitted!", description: "Thank you for your contribution." });
      fetchRecording();
    } catch (err) {
      console.error("Error submitting transcription:", err);
      toast({ title: "Error", description: "Failed to submit transcription. Please try again.", variant: "destructive" });
      setPageState("transcribing");
    }
  };

  if (pageState === "checking") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Show guidelines if not agreed OR if agreed but still awaiting admin approval.
  if (pageState === "guidelines" || (guidelinesAgreed && !transcriptionApproved)) {
    return (
      <TranscriptionGuidelines
        onAgree={handleGuidelinesAgree}
        isApproved={transcriptionApproved}
        hasAgreed={guidelinesAgreed}
      />
    );
  }

  const showPlayer = recording && pageState !== "loading" && pageState !== "empty";

  return (
    <div className="min-h-[100dvh] relative w-full bg-background overflow-x-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[120px] animate-blob will-change-transform" />
        <div className="absolute top-[5%] right-[-5%] w-[35rem] h-[35rem] bg-accent/30 rounded-full blur-[120px] animate-blob will-change-transform" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[-10%] left-[10%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] animate-blob will-change-transform" style={{ animationDelay: "4s" }} />
      </div>

      <div className="relative z-10">
        {/* Sticky navbar */}
        <div className="sticky top-0 z-30 border-b border-border/50 bg-background/75 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="h-10 w-10 rounded-2xl bg-card/70 backdrop-blur-md border border-border/50 shadow-sm hover:bg-card"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">Transcribe</h1>
                <p className="hidden sm:block text-xs text-muted-foreground truncate">Listen carefully, then type what you hear</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Guidelines reference (all screen sizes) */}
                <Sheet open={guidelinesOpen} onOpenChange={setGuidelinesOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-background/80">
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Guidelines</span>
                      <span className="sm:hidden">Rules</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[90vw] sm:w-[480px] p-4">
                    <SheetHeader className="mb-3">
                      <SheetTitle>Transcription guidelines</SheetTitle>
                    </SheetHeader>
                    <div className="max-h-[calc(100dvh-6rem)] overflow-auto pr-1">
                      <TranscriptionGuidelinesReference />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Session counter */}
                <div className="h-10 px-3 rounded-2xl bg-primary/10 flex items-center justify-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary tabular-nums">{sessionCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 gap-4 lg:gap-6 items-start">
            <main>

            {/* Loading */}
            {pageState === "loading" && (
              <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-3xl p-10 sm:p-14 text-center animate-scale-in">
                <div className="relative w-16 h-16 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                  <div className="relative w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  </div>
                </div>
                <p className="text-muted-foreground text-sm font-medium">Finding a recording for you…</p>
              </div>
            )}

            {/* Empty */}
            {pageState === "empty" && (
              <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-3xl p-10 sm:p-14 text-center animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-5">
                  <Headphones className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">All caught up!</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  No recordings need transcription right now. Check back later for more.
                </p>
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-2xl h-11 px-6 border-border/60">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            )}

            {/* Main content */}
            {showPlayer && (
              <div className="space-y-4">
                {/* Compact instructions (always near the work area) */}
                <div className="bg-card/70 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl overflow-hidden">
                  <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">Instructions</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Quick reminders while you listen and type
                        </p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <span className="text-xs">{instructionsOpen ? "Hide" : "Show"}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${instructionsOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 text-sm text-foreground">
                        <ul className="space-y-1.5 leading-relaxed">
                          <li>Listen to the entire clip first, then transcribe.</li>
                          <li>Type exactly what you hear (don’t correct wording).</li>
                          <li>If unsure or the clip violates the “skip” rules, skip it.</li>
                        </ul>
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGuidelinesOpen(true)}
                            className="bg-background/80"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View full guidelines
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

            {/* Question context — glassmorphic with left accent stripe */}
            <div
              className="relative bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl px-4 py-3 sm:px-5 sm:py-4 overflow-hidden animate-spring-in"
              style={{ animationDelay: "0ms" }}
            >
              {/* Accent stripe */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-primary" />
              <div className="flex-1 min-w-0 pl-3">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Question prompt</p>
                <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">{recording!.question_text}</p>
              </div>
            </div>

            {/* Question image */}
            {recording!.image_url && (
              <div
                className="relative rounded-2xl overflow-hidden shadow-sm border border-border/50 animate-spring-in"
                style={{ animationDelay: "50ms" }}
              >
                <img src={recording!.image_url} alt="Question visual" className="w-full object-contain max-h-72 sm:max-h-96" loading="lazy" />
                {recording!.image_attribution && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-3">
                    <p className="text-primary-foreground/80 text-xs">{recording!.image_attribution}</p>
                  </div>
                )}
              </div>
            )}

            <div
              className={`
                relative bg-card/85 backdrop-blur-xl border shadow-sm rounded-2xl p-4 sm:p-5 transition-all duration-500 animate-spring-in
                ${isPlaying
                  ? "border-primary/30 animate-glow-pulse shadow-lg"
                  : "border-border/50"
                }
              `}
              style={{ animationDelay: "100ms" }}
            >
              {isPlaying && (
                <div className="absolute inset-0 rounded-2xl bg-primary/[0.03] pointer-events-none" />
              )}

              <audio
                ref={audioRef}
                src={getPlaybackUrl(recording!.audio_file_url)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onError={handleAudioError}
                preload="metadata"
                crossOrigin="anonymous"
              />

              {/* Seekable progress */}
              <div className="mb-1 px-1">
                <SeekableProgressTrack progress={progress} onSeek={handleSeek} />
              </div>

              {/* Time + Controls in one compact row */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono tabular-nums w-10">{formatTime(currentTime)}</span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchRecording}
                    className="h-9 w-9 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Load new recording"
                    title="Load new recording"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handlePlay}
                    className={`
                      group relative h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      ${isPlaying ? "ring-2 ring-primary/20" : ""}
                    `}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying && (
                      <div className="absolute -inset-0.5 rounded-full bg-primary/15 animate-pulse-gentle" />
                    )}
                    <div className="relative flex items-center justify-center">
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </div>
                  </button>

                  <button
                    onClick={cycleSpeed}
                    className="h-9 w-9 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-[10px] font-bold"
                    aria-label={`Playback speed ${playbackSpeed}x`}
                    title={`Speed: ${playbackSpeed}x`}
                  >
                    {playbackSpeed}x
                  </button>
                </div>

                <span className="text-xs text-muted-foreground font-mono tabular-nums w-10 text-right">{duration > 0 ? formatTime(duration) : "--:--"}</span>
              </div>

              {/* Listening status */}
              {pageState === "listening" && !hasFinishedPlaying && (
                <div className="mt-5 flex items-center justify-center gap-2 text-muted-foreground animate-fade-in">
                  <span className="text-xs font-medium">{isPlaying ? "Playing…" : "Tap play to start listening"}</span>
                </div>
              )}
            </div>

            {/* Accept / Skip — glassmorphic with accent tint */}
            {pageState === "deciding" && (
              <div className="bg-accent/10 backdrop-blur-md border border-primary/15 shadow-sm rounded-3xl p-5 sm:p-6 animate-spring-in">
                <p className="text-sm text-center text-muted-foreground mb-4">Ready to transcribe this recording?</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleSkip} className="flex-1 h-12 rounded-2xl text-sm font-medium border-border/60 hover:bg-muted/60">
                    <SkipForward className="w-4 h-4 mr-2" />Skip
                  </Button>
                  <Button onClick={handleAccept} className="flex-1 h-12 rounded-2xl text-sm font-medium shadow-md hover:shadow-lg transition-shadow">
                    <Check className="w-4 h-4 mr-2" />Transcribe
                  </Button>
                </div>
              </div>
            )}

            {/* Transcription input — distinct tinted card */}
            {(pageState === "transcribing" || pageState === "submitting") && (
              <div className="bg-card/90 backdrop-blur-xl border border-primary/10 shadow-md rounded-3xl p-5 sm:p-6 animate-spring-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Your transcription</h3>
                  <div className="flex items-center gap-3">
                    {/* Typing indicator dots */}
                    {isTyping && (
                      <div className="flex gap-0.5 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing-dot" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "0.2s" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-typing-dot" style={{ animationDelay: "0.4s" }} />
                      </div>
                    )}
                    <span className={`text-xs font-mono tabular-nums ${transcriptionText.length >= MAX_CHARS * 0.9 ? "text-destructive" : "text-muted-foreground"}`}>
                      {transcriptionText.length}/{MAX_CHARS}
                    </span>
                  </div>
                </div>

                <Textarea
                  value={transcriptionText}
                  onChange={(e) => {
                    handleTextChange(e);
                    // Auto-resize
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.max(130, e.target.scrollHeight)}px`;
                  }}
                  placeholder="Type exactly what you hear in the recording…"
                  className="min-h-[130px] max-h-[60vh] rounded-2xl border-border/60 bg-muted/30 resize-none text-sm leading-relaxed focus:ring-primary placeholder:text-muted-foreground/60 overflow-y-auto"
                  disabled={pageState === "submitting"}
                  autoFocus
                />

                {/* Word count + tip */}
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-1.5 flex-1 min-w-0">
                    <Lightbulb className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-snug">{currentTip}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {wordCount} {wordCount === 1 ? "word" : "words"}
                  </span>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => { setTranscriptionText(""); setPageState("deciding"); }}
                    disabled={pageState === "submitting"}
                    className="rounded-2xl text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitClick}
                    disabled={!transcriptionText.trim() || pageState === "submitting"}
                    className="flex-1 h-12 rounded-2xl text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
                  >
                    {pageState === "submitting" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {pageState === "submitting" ? "Submitting…" : "Submit"}
                  </Button>
                </div>
              </div>
            )}

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit this transcription? Please review your text before confirming.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="bg-muted/50 rounded-lg p-3 border border-border/30 max-h-32 overflow-y-auto">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{transcriptionText}</p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Go Back & Edit</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmedSubmit} className="rounded-xl">
                    <Send className="w-4 h-4 mr-2" />
                    Confirm Submit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
