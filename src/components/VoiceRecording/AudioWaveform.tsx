import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  audioStream: MediaStream | null;
  isActive: boolean;
  color?: string;
  barGap?: number; // Added for styling control
}

export const AudioWaveform = ({ 
  audioStream, 
  isActive, 
  color = "#2563eb",
  barGap = 2 
}: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // 1. Cleanup previous context to prevent "max AudioContext" errors
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(animationFrameRef.current!);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 2. Handle Resize for High DPI (Retina) Displays
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      // Set actual size in memory (scaled to account for extra pixel density)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Normalize coordinate system to use css pixels
      ctx.scale(dpr, dpr);
      
      // Force CSS size to match parent
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    // Initial resize
    handleResize();

    // Observe container resizing
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    // 3. Audio Setup
    const setupAudio = () => {
      if (!audioStream || !isActive) return;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') audioContext.resume();

      // Create Analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Keep small for "bar" look (32 bins)
      analyser.smoothingTimeConstant = 0.6; // 0.8 is slow, 0.5 is jittery. 0.6 is balanced.

      // Connect Source
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);

      analyserRef.current = analyser;
      sourceRef.current = source;
    };

    // Draw Loop
    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      // Gradient Setup
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `${color}33`); // Fade top (hex alpha 20%)
      gradient.addColorStop(0.5, color);       // Solid center
      gradient.addColorStop(1, `${color}33`);  // Fade bottom

      ctx.fillStyle = gradient;

      // Draw Idle Line
      if (!isActive || !analyserRef.current) {
        ctx.beginPath();
        ctx.roundRect(0, (height / 2) - 1, width, 2, 2);
        ctx.fillStyle = "rgba(156, 163, 175, 0.2)"; // Slate-400 low opacity
        ctx.fill();
        return;
      }

      // Draw Active Bars
      animationFrameRef.current = requestAnimationFrame(draw);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Determine bar width based on container width to prevent overflow
      // We only use the lower 70% of frequency bins because high freqs (air) are often empty in speech
      const usableBins = Math.floor(bufferLength * 0.7); 
      const totalGapSpace = (usableBins - 1) * barGap;
      const availableSpace = width - totalGapSpace;
      const barWidth = availableSpace / usableBins;

      let x = 0;

      for (let i = 0; i < usableBins; i++) {
        // Normalize value (0-255) to canvas height
        // Multiplier 0.8 keeps bars from hitting the very top/bottom edge
        const value = dataArray[i];
        const barHeight = Math.max(2, (value / 255) * height * 0.8); 
        
        const y = (height - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();

        x += barWidth + barGap;
      }
    };

    setupAudio();
    draw();

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (analyserRef.current) analyserRef.current.disconnect();
    };
  }, [audioStream, isActive, color, barGap]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};