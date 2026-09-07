import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, RotateCcw, Send, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";

interface MinimalRecorderProps {
  onRecordingComplete: (audioBlob: Blob, durationSeconds: number) => void;
  disabled?: boolean;
}

export const MinimalRecorder = ({ onRecordingComplete, disabled }: MinimalRecorderProps) => {
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'review'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const haptic = useHapticFeedback();

  const MAX_DURATION = 30;

  const startRecording = async () => {
    try {
      haptic.mediumTap();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setRecorderState('review');
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setRecorderState('recording');
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        if (elapsed >= MAX_DURATION) stopRecording();
      }, 100);

    } catch (err) {
      console.error(err);
      toast({ title: "Microphone Access Denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      haptic.heavyTap();
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleReset = () => {
    haptic.lightTap();
    setRecordedBlob(null);
    setRecordingTime(0);
    setRecorderState('idle');
    setIsPlaying(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!recordedBlob) return;
    haptic.lightTap();

    if (isPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(URL.createObjectURL(recordedBlob));
      audioPlayerRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = () => {
    if (recordedBlob) {
      haptic.success();
      onRecordingComplete(recordedBlob, recordingTime);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isNearLimit = recordingTime >= 25;
  const isApproachingLimit = recordingTime >= 20;
  const progressPercent = (recordingTime / MAX_DURATION) * 100;

  return (
    <div 
      className="w-full"
      role="region"
      aria-label="Voice recorder"
    >
      {/* IDLE STATE */}
      {recorderState === 'idle' && (
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={startRecording}
            disabled={disabled}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 motion-safe:transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Start recording"
          >
            <Mic className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
          </Button>
          <span className="text-xs text-muted-foreground font-medium">Tap to record (max 30s)</span>
        </div>
      )}

      {/* RECORDING STATE */}
      {recorderState === 'recording' && (
        <div className="flex flex-col items-center gap-3">
          {/* Timer with progress ring */}
          <div className="relative">
            <svg className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={isNearLimit ? "hsl(var(--destructive))" : isApproachingLimit ? "hsl(38, 92%, 50%)" : "hsl(var(--primary))"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${progressPercent * 2.83} 283`}
                className="transition-all duration-200"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "text-lg sm:text-xl font-bold font-mono tabular-nums",
                isNearLimit ? "text-destructive" : "text-foreground"
              )}>
                {formatTime(recordingTime)}
              </span>
              {isNearLimit && (
                <AlertCircle className="w-3 h-3 text-destructive animate-pulse" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Recording indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Recording...</span>
          </div>

          {/* Stop button */}
          <Button
            onClick={stopRecording}
            className="h-12 px-6 rounded-full bg-destructive hover:bg-destructive/90 text-white shadow-md hover:scale-105 motion-safe:transition-all"
            aria-label="Stop recording"
          >
            <Square className="w-4 h-4 mr-2 fill-current" aria-hidden="true" />
            Stop
          </Button>
        </div>
      )}

      {/* REVIEW STATE */}
      {recorderState === 'review' && (
        <div className="flex flex-col items-center gap-3">
          {/* Duration display */}
          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">
              {formatTime(recordingTime)}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">recorded</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full max-w-xs">
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              className="h-10 w-10 rounded-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              aria-label="Redo recording"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayback}
              className={cn(
                "h-10 w-10 rounded-full border-border",
                isPlaying && "bg-primary/10 border-primary/30 text-primary"
              )}
              aria-label={isPlaying ? "Pause playback" : "Play recording"}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={disabled}
              className="flex-1 h-10 rounded-full bg-foreground hover:bg-foreground/90 text-background shadow-md"
              aria-label="Submit recording"
            >
              Submit <Send className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
