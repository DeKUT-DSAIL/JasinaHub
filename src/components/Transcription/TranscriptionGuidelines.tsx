import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Headphones,
  AlertTriangle,
  Type,
  Hash,
  Clock,
  MessageSquare,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TranscriptionGuidelinesProps {
  onAgree: () => Promise<void>;
  isApproved: boolean;
  hasAgreed: boolean;
}

export function TranscriptionGuidelines({ onAgree, isApproved, hasAgreed }: TranscriptionGuidelinesProps) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleAgree = async () => {
    if (!checked) return;
    setSubmitting(true);
    try {
      await onAgree();
    } finally {
      setSubmitting(false);
    }
  };

  // User agreed but not yet approved by admin
  if (hasAgreed && !isApproved) {
    return (
      <div className="min-h-[100dvh] relative w-full bg-background overflow-x-hidden">
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[120px] animate-blob will-change-transform" />
          <div className="absolute top-[5%] right-[-5%] w-[35rem] h-[35rem] bg-accent/30 rounded-full blur-[120px] animate-blob will-change-transform" style={{ animationDelay: "2s" }} />
        </div>
        <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[100dvh]">
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-3xl p-8 sm:p-10 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Awaiting Admin Approval</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              You've agreed to the transcription guidelines. An admin will review and approve your access shortly.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-2xl h-11 px-6 border-border/60">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative w-full bg-background overflow-x-hidden">
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[120px] animate-blob will-change-transform" />
        <div className="absolute top-[5%] right-[-5%] w-[35rem] h-[35rem] bg-accent/30 rounded-full blur-[120px] animate-blob will-change-transform" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[-10%] left-[10%] w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[120px] animate-blob will-change-transform" style={{ animationDelay: "4s" }} />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6 animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="h-10 w-10 rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm hover:bg-card"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Transcription Guidelines</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Please read carefully before proceeding</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
        </header>

        {/* Steps */}
        <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 sm:p-6 mb-4 animate-spring-in">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Steps
          </h2>
          <ol className="space-y-3 text-sm text-foreground leading-relaxed">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <span>Listen to the <strong>entire audio clip first</strong> before transcribing.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <span>If the clip is audible and okay to transcribe, continue — <strong>else skip</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
              <span>If you have <strong>any doubts</strong> with the audio, skip it. Do not transcribe.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
              <span><strong>Proofread</strong> your work before submitting.</span>
            </li>
          </ol>
        </div>

        {/* Guidelines */}
        <div className="space-y-3 mb-6">
          {/* Capitalization */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 sm:p-5 animate-spring-in" style={{ animationDelay: "50ms" }}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Type className="w-4 h-4 text-primary" />
              Capitalization, Spelling & Punctuation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Include all necessary punctuation (commas, periods, etc.), proper capitalization, and correct spelling — but <strong>do not correct</strong> what was recorded. Write <strong>exactly</strong> what is in the clip without omitting any word.
            </p>
          </div>

          {/* Code-switching */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 sm:p-5 animate-spring-in" style={{ animationDelay: "100ms" }}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Code-Switching
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Mark non-Kikuyu words (except proper nouns like names, institutions, places) with <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">[cs]</code> tags.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground font-medium mb-1">Example:</p>
              <p className="text-sm text-foreground italic">
                Mũndũ ũyũ etagwo Dedan Kimathi arwarĩte mũrimũ wa <code className="bg-primary/10 text-primary px-1 rounded">[cs]</code> Measles <code className="bg-primary/10 text-primary px-1 rounded">[cs]</code> na e thibitarĩ.
              </p>
            </div>
          </div>

          {/* Figures */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 sm:p-5 animate-spring-in" style={{ animationDelay: "150ms" }}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Figures
            </h3>
            <p className="text-sm text-muted-foreground">All figures should be written in <strong>words</strong> (e.g., "twenty-three" not "23").</p>
          </div>

          {/* Pauses */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 sm:p-5 animate-spring-in" style={{ animationDelay: "200ms" }}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Pauses
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">[Pause]</code> for pauses longer than 1–2 seconds. A clip with more than a 2-second pause <strong>should not be transcribed</strong>.
            </p>
          </div>

          {/* Filler words */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 sm:p-5 animate-spring-in" style={{ animationDelay: "250ms" }}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Filler Words
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Include filler words but <strong>do not lengthen</strong> them. A clip with <strong>more than two filler words</strong> should not be transcribed — skip it.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground font-medium mb-1">Example:</p>
              <p className="text-sm text-foreground">Audio: "He was like uhhhh." → Correct: He was like <code className="bg-primary/10 text-primary px-1 rounded">[uh]</code>.</p>
            </div>
          </div>

          {/* Prolonged words */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 sm:p-5 animate-spring-in" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Prolonged Words
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              A clip with <strong>more than two prolonged words</strong> should not be transcribed.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground font-medium mb-1">Example:</p>
              <p className="text-sm text-foreground italic">Mami nĩĩĩĩ ĩthire thoko na atũgũũũrĩra matunda maaaingĩ</p>
            </div>
          </div>

          {/* Hesitation and truncation */}
          <div className="bg-card/80 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-4 sm:p-5 animate-spring-in" style={{ animationDelay: "350ms" }}>
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Hesitation & Truncation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              All words should be transcribed <strong>including hesitations</strong>.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
              <p className="text-xs text-muted-foreground font-medium mb-1">Example:</p>
              <p className="text-sm text-foreground italic">ũũ ũyũ nĩ mũrimũ wango wangothi,</p>
            </div>
          </div>
        </div>

        {/* Agreement */}
        <div className="bg-card/80 backdrop-blur-md border border-primary/20 shadow-sm rounded-2xl p-5 sm:p-6 animate-spring-in" style={{ animationDelay: "400ms" }}>
          <div className="mb-4 rounded-xl border border-border/50 bg-muted/40 p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground">Data protection &amp; your rights</h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground leading-relaxed space-y-1.5">
              <li>Contributions are <strong className="text-foreground">pseudonymised</strong> — an anonymous contributor ID replaces your name when the data is used for downstream machine learning tasks and dataset curation.</li>
              <li>You may <strong className="text-foreground">withdraw your consent</strong> at any time, without penalty.</li>
              <li>You may <strong className="text-foreground">delete your account</strong> and request erasure of the data you provided.</li>
              <li>You can <strong className="text-foreground">access the data you provided</strong> on the platform at any time.</li>
              <li>
                Read the full{" "}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
                  Privacy Policy
                </a>{" "}
                (Kenya Data Protection Act, 2019).
              </li>
            </ul>
          </div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-relaxed group-hover:text-primary transition-colors">
              I have read and understood the transcription steps, guidelines and privacy terms above. I agree to follow them while transcribing.
            </span>
          </label>

          <Button
            onClick={handleAgree}
            disabled={!checked || submitting}
            className="w-full mt-4 h-12 rounded-2xl text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "I Understand — Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
