import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface InlineAudioPlayerProps {
  src: string;
  durationSeconds?: number | null;
}

export function InlineAudioPlayer({ src, durationSeconds }: InlineAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    });
    audio.addEventListener("timeupdate", () => setCurrentTime(audio.currentTime));
    audio.addEventListener("ended", () => setPlaying(false));

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", () => {});
      audio.removeEventListener("timeupdate", () => {});
      audio.removeEventListener("ended", () => {});
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = useCallback((value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 w-full bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
      <button
        onClick={togglePlay}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0"
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <span className="text-xs text-muted-foreground w-10 text-right tabular-nums shrink-0">
        {fmt(currentTime)}
      </span>
      <Slider
        value={[currentTime]}
        max={duration || 1}
        step={0.1}
        onValueChange={handleSeek}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground w-10 tabular-nums shrink-0">
        {fmt(duration)}
      </span>
      <Volume2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
    </div>
  );
}
