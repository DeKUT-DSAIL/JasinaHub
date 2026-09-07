import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2, Check, RefreshCw, Send, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AudioWaveform } from "./AudioWaveform";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { Badge } from "@/components/ui/badge";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, durationSeconds: number) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  // State Machine: 'idle' | 'recording' | 'paused' | 'review'
  const [recorderState, setRecorderState] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
  
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const haptic = useHapticFeedback();

  // --- Actions ---

  const startRecording = async () => {
    try {
      haptic.mediumTap();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      setAudioStream(stream);

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
        
        // Cleanup stream tracks to stop the "red dot" in browser tab
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      };

      mediaRecorder.start();
      setRecorderState('recording');
      startTimeRef.current = Date.now() - (recordingTime * 1000); // Handle resume offset
      
      // Start Timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        if (elapsed >= 30) stopRecording();
      }, 100);

    } catch (err) {
      console.error(err);
      toast({ title: "Microphone Access Denied", variant: "destructive" });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      haptic.lightTap();
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecorderState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      haptic.lightTap();
      mediaRecorderRef.current.resume();
      setRecorderState('recording');
      startTimeRef.current = Date.now() - (recordingTime * 1000);
      
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        if (elapsed >= 30) stopRecording();
      }, 100);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioStream) audioStream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate if we're approaching the time limit (last 10 seconds)
  const isApproachingLimit = recordingTime >= 20 && recorderState === 'recording';
  const isNearLimit = recordingTime >= 25 && recorderState === 'recording';

  return (
    <div 
      className="w-full max-w-md mx-auto"
      role="region"
      aria-label="Voice recorder"
    >
      {/* Time Limit Badge - Shown in idle state */}
      {recorderState === 'idle' && (
        <div className="flex justify-center mb-4 motion-safe:animate-fade-in">
          <Badge 
            variant="secondary" 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-xs font-medium">Max 30 seconds per recording</span>
          </Badge>
        </div>
      )}

      {/* 1. Visualization Area */}
      <div 
        className="relative mb-8 bg-slate-50/50 rounded-3xl h-32 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner"
        aria-live="polite"
      >
        {recorderState === 'idle' && (
          <div className="text-slate-400 flex flex-col items-center gap-2">
            <Mic className="w-8 h-8 opacity-50" aria-hidden="true" />
            <span className="text-sm font-medium">Ready to record</span>
          </div>
        )}
        
        {(recorderState === 'recording' || recorderState === 'paused') && (
           <div className="w-full px-4">
              <AudioWaveform audioStream={audioStream} isActive={recorderState === 'recording'} />
           </div>
        )}

        {recorderState === 'review' && (
           <div className="text-center w-full motion-safe:animate-fade-in">
              <div className="text-3xl font-mono font-bold text-slate-800 tracking-wider">
                {formatTime(recordingTime)}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Recorded Duration</p>
           </div>
        )}

        {/* Floating Timer Overlay during recording - Enhanced with warning states */}
        {(recorderState === 'recording' || recorderState === 'paused') && (
           <div 
             className={`absolute top-2 right-4 backdrop-blur px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all duration-300 ${
               isNearLimit 
                 ? 'bg-red-500 text-white border-red-400 motion-safe:animate-pulse scale-110' 
                 : isApproachingLimit 
                   ? 'bg-amber-100 text-amber-700 border-amber-300' 
                   : 'bg-white/80 text-slate-600 border-slate-200'
             }`}
             role="timer"
             aria-live="polite"
             aria-label={`Recording time: ${formatTime(recordingTime)} of 30 seconds`}
           >
             {isNearLimit && <AlertCircle className="w-3 h-3 inline mr-1" aria-hidden="true" />}
             {formatTime(recordingTime)} / 0:30
           </div>
        )}
      </div>

      {/* 2. Controls Area (Grid Layout for stability) */}
      <div className="flex items-center justify-center gap-4 transition-all" role="group" aria-label="Recording controls">
        
        {/* IDLE STATE */}
        {recorderState === 'idle' && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            className="h-16 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105 motion-safe:transition-all text-lg gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Start recording your answer"
          >
            <Mic className="w-6 h-6" aria-hidden="true" /> Record Answer
          </Button>
        )}

        {/* RECORDING / PAUSED STATE */}
        {(recorderState === 'recording' || recorderState === 'paused') && (
          <>
            <Button
              onClick={handleReset}
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Cancel recording"
            >
              <Trash2 className="w-6 h-6" aria-hidden="true" />
            </Button>

            <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-full border border-slate-200">
                <Button
                  onClick={recorderState === 'recording' ? pauseRecording : resumeRecording}
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-white shadow-sm hover:scale-105 motion-safe:transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={recorderState === 'recording' ? 'Pause recording' : 'Resume recording'}
                >
                  {recorderState === 'recording' ? (
                    <Pause className="w-6 h-6 text-slate-700" aria-hidden="true" />
                  ) : (
                    <Mic className="w-6 h-6 text-blue-600" aria-hidden="true" />
                  )}
                </Button>

                <Button
                  onClick={stopRecording}
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md hover:scale-105 motion-safe:transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Stop recording"
                >
                  <Square className="w-5 h-5 fill-current" aria-hidden="true" />
                </Button>
            </div>
          </>
        )}

        {/* REVIEW STATE */}
        {recorderState === 'review' && (
          <div className="w-full grid grid-cols-3 gap-3">
             <Button
                variant="outline"
                onClick={handleReset}
                className="h-12 rounded-xl border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Redo recording"
              >
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" /> Redo
              </Button>

              <Button
                variant="outline"
                onClick={togglePlayback}
                className={`h-12 rounded-xl border-slate-200 text-slate-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isPlaying ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
                aria-pressed={isPlaying}
              >
                {isPlaying ? <Pause className="w-4 h-4 mr-2" aria-hidden="true" /> : <Play className="w-4 h-4 mr-2" aria-hidden="true" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={disabled}
                className="h-12 rounded-xl bg-slate-900 hover:bg-black text-white shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Submit recording"
              >
                Submit <Send className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
          </div>
        )}
      </div>
    </div>
  );
};