import { useState, useRef } from "react";
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
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const haptic = useHapticFeedback();

  const MAX_DURATION = 30;

  const startRecording = async () => {
    setPermissionError(null);

    // 1. Verify Browser Support & Secure Context
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isSecure = window.isSecureContext;
      const msg = !isSecure
        ? "Microphone access requires a Secure Context (HTTPS or localhost). If you are accessing via an IP address, please switch to http://localhost:8080 or setup HTTPS."
        : "Your browser does not support audio recording. Please use modern Chrome, Edge, or Safari.";
      
      setPermissionError(msg);
      toast({
        title: "Microphone Not Supported",
        description: msg,
        variant: "destructive"
      });
      return;
    }

    try {
      haptic.mediumTap();

      let stream: MediaStream;
      try {
        // Attempt with noise suppression & echo cancellation
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true } 
        });
      } catch (constraintErr) {
        // Fallback to basic audio constraint if device rejects specific parameters
        console.warn("Attempting basic audio constraint fallback:", constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

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

    } catch (err: any) {
      console.error("Microphone capture error:", err);

      let title = "Microphone Access Denied";
      let description = "Please allow microphone access in your browser settings.";

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        title = "Permission Blocked";
        description = "Your browser or Windows has blocked microphone access for this site. Click the lock/tune icon on the left of the address bar to Allow Microphone, or check Windows Privacy Settings.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        title = "No Microphone Found";
        description = "No audio input hardware was detected on your computer. Please connect a microphone or headset.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        title = "Microphone Busy";
        description = "Your microphone is being used by another application (e.g. Zoom, Teams, Discord). Please close it and try again.";
      }

      setPermissionError(description);
      toast({
        title,
        description,
        variant: "destructive",
      });
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

    if (isPlaying) {
      haptic.lightTap();
      audioPlayerRef.current?.pause();
      setIsPlaying(false);
    } else {
      haptic.lightTap();
      if (!audioPlayerRef.current) {
        const audioUrl = URL.createObjectURL(recordedBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlaying(false);
        audioPlayerRef.current = audio;
      }
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (!recordedBlob) return;
    haptic.success();
    onRecordingComplete(recordedBlob, recordingTime);
    handleReset();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 w-full">
      {/* Permission helper banner if blocked */}
      {permissionError && recorderState === 'idle' && (
        <div className="w-full p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold block mb-0.5">Microphone permission note:</span>
            {permissionError}
          </div>
        </div>
      )}

      {/* Main Recording Interface */}
      {recorderState === 'idle' && (
        <Button
          onClick={startRecording}
          disabled={disabled}
          className={cn(
            "h-14 sm:h-16 px-6 sm:px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all duration-300 flex items-center gap-3",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-sm sm:text-base">Start Recording</span>
        </Button>
      )}

      {recorderState === 'recording' && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-base font-bold text-red-600">
              {recordingTime}s / {MAX_DURATION}s
            </span>
          </div>

          <Button
            onClick={stopRecording}
            variant="destructive"
            className="h-14 sm:h-16 px-8 rounded-full font-semibold shadow-lg shadow-red-500/20 flex items-center gap-3 animate-pulse"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Stop Recording</span>
          </Button>
        </div>
      )}

      {recorderState === 'review' && (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Recorded: {recordingTime}s</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleReset}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-slate-200 hover:bg-slate-100"
              title="Record again"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </Button>

            <Button
              onClick={togglePlayback}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-slate-200 hover:bg-slate-100"
              title={isPlaying ? "Pause" : "Play recording"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>

            <Button
              onClick={handleSend}
              className="h-12 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Response</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
